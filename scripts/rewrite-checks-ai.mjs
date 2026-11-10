/**
 * Reescreve os enunciados das perguntas de conferência ("confere rápido")
 * usando a Edge Function `rewrite-checks` do Supabase.
 *
 *   npm run content:checks:ai
 *
 * Saída: `src/content/checks.ai.generated.json` — arquivo gerado, não editar à mão.
 *
 * O que a LLM pode mexer: **só o enunciado (`prompt`) e o feedback
 * (`success`)**. As alternativas, o índice da resposta, a âncora e a seção
 * continuam sendo os do gerador determinístico (`npm run content:checks`) —
 * é isso que mantém a verificabilidade automática da auditoria
 * (`src/content/content.test.ts`).
 *
 * O arquivo é **incremental**: as reescritas que já deram certo continuam
 * salvas quando o script roda de novo, então uma falha no meio do caminho
 * não joga trabalho fora. Aulas que a LLM não conseguiu reescrever continuam
 * com o enunciado gerado pelo template.
 *
 * Variáveis de ambiente (no `.env` da raiz):
 *   SUPABASE_URL     — url do projeto Supabase
 *   SUPABASE_KEY     — chave do projeto (a `anon` basta para chamar a função)
 *   REWRITE_TOKEN    — token que a Edge Function exige no header `x-rewrite-token`
 *
 * Opções:
 *   --only=<trecho>      reescreve só as aulas que casam com o trecho
 *   --limit=<n>          reescreve no máximo n aulas (para testar)
 *   --concurrency=<n>    chamadas em paralelo (padrão: 4)
 *   --dry-run            não grava o arquivo
 *   --force              refaz as aulas que já têm reescrita salva
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stepsByBlock } from './lib/lesson-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = path.join(ROOT, 'src', 'data', 'seed.json');
const CONTENT_PATH = path.join(ROOT, 'src', 'content', 'lessons.generated.json');
const CHECKS_PATH = path.join(ROOT, 'src', 'content', 'checks.generated.json');
const AI_OUTPUT_PATH = path.join(ROOT, 'src', 'content', 'checks.ai.generated.json');
const CURATED_PATH = path.join(ROOT, 'src', 'content', 'curated.ts');

const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const LIMIT = Number(
  process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length),
);
const CONCURRENCY = Number(
  process.argv.find((arg) => arg.startsWith('--concurrency='))?.slice('--concurrency='.length),
);
const DRY_RUN = process.argv.includes('--dry-run');
/** Refaz as aulas que já têm reescrita salva. */
const FORCE = process.argv.includes('--force');

/** Carrega o `.env` da raiz sem depender de pacote externo. */
function loadEnv() {
  const envPath = path.join(ROOT, '.env');

  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');

    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Aulas com perguntas curadas à mão: não entram na reescrita por IA. */
function curatedLessonIds() {
  if (!existsSync(CURATED_PATH)) return new Set();

  const source = readFileSync(CURATED_PATH, 'utf8');

  return new Set([...source.matchAll(/lessonId:\s*'([^']+)'/g)].map((match) => match[1]));
}

/** Texto da aula em formato compacto, para dar contexto à LLM. */
function lessonText(content) {
  return stepsByBlock(content)
    .map((block) =>
      [block.title ? `## ${block.title}` : '', ...block.steps.map((step) => `- ${step.text}`)]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

async function mapLimit(items, limit, worker) {
  const results = [];
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);

  return results;
}

async function rewriteLesson(lesson, questions, text, endpoint, token, apiKey) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'x-rewrite-token': token,
    },
    body: JSON.stringify({
      lesson: { id: lesson.id, title: lesson.titulo, text },
      questions,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error ?? `HTTP ${response.status}`);
  }

  return body?.questions;
}

async function main() {
  loadEnv();

  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_KEY;
  const token = process.env.REWRITE_TOKEN;

  if (!url || !apiKey || !token) {
    console.error(
      'Faltou SUPABASE_URL, SUPABASE_KEY ou REWRITE_TOKEN no .env (veja o README da Fase 13).',
    );
    process.exitCode = 1;
    return;
  }

  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const generated = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  const checks = JSON.parse(readFileSync(CHECKS_PATH, 'utf8'));

  const contentById = new Map(generated.map((entry) => [entry.lessonId, entry]));
  const lessonById = new Map();

  for (const group of seed.grupos) {
    for (const module of group.modulos) {
      for (const lesson of module.aulas) lessonById.set(lesson.id, lesson);
    }
  }

  const curated = curatedLessonIds();

  // O arquivo anterior é a base: uma reescrita que já deu certo não se perde.
  const previous = existsSync(AI_OUTPUT_PATH)
    ? JSON.parse(readFileSync(AI_OUTPUT_PATH, 'utf8'))
    : {};

  let targets = Object.keys(checks)
    .filter((lessonId) => !curated.has(lessonId))
    .filter((lessonId) => !ONLY || lessonId.includes(ONLY));

  // Reexecutar o script só refaz o que falta: as reescritas que já deram
  // certo ficam intactas (o arquivo é a base, não a saída).
  if (!FORCE) targets = targets.filter((lessonId) => !previous[lessonId]);

  if (LIMIT > 0) targets = targets.slice(0, LIMIT);

  console.log(`Aulas na fila: ${targets.length} | já reescritas: ${Object.keys(previous).length}`);

  if (targets.length === 0) {
    console.log('Nada a fazer.');
    return;
  }

  const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/rewrite-checks`;
  const result = {};
  const failures = [];
  let done = 0;

  await mapLimit(targets, CONCURRENCY || 4, async (lessonId) => {
    const lesson = lessonById.get(lessonId);
    const content = contentById.get(lessonId);
    const questions = checks[lessonId];

    if (!lesson || !content) {
      failures.push({ lessonId, error: 'aula sem conteúdo extraído' });
      return;
    }

    try {
      const rewritten = await rewriteLesson(
        lesson,
        questions,
        lessonText(content),
        endpoint,
        token,
        apiKey,
      );

      if (!Array.isArray(rewritten)) throw new Error('resposta sem lista de perguntas');

      // Só o enunciado e o feedback são trocados. O resto continua do
      // gerador determinístico — é o que garante a verificabilidade.
      const merged = questions.map((question) => {
        const update = rewritten.find((item) => item.id === question.id);

        if (!update) return question;

        return { ...question, prompt: update.prompt, success: update.success };
      });

      result[lessonId] = merged;
      done += 1;

      if (done % 10 === 0) console.log(`  ...${done} aulas reescritas`);
    } catch (error) {
      failures.push({ lessonId, error: error instanceof Error ? error.message : String(error) });
    }
  });

  const merged = { ...previous, ...result };
  const ordered = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));

  console.log(`Reescritas nesta execução: ${Object.keys(result).length}`);
  console.log(`Total no arquivo: ${Object.keys(ordered).length}`);

  if (failures.length > 0) {
    console.log(`Falhas: ${failures.length}`);
    for (const failure of failures.slice(0, 10)) {
      console.log(`  ${failure.lessonId}: ${failure.error}`);
    }
    if (failures.length > 10) console.log(`  ...e mais ${failures.length - 10}.`);
  }

  if (DRY_RUN) {
    console.log('Modo --dry-run: o arquivo gerado não foi sobrescrito.');
    return;
  }

  writeFileSync(AI_OUTPUT_PATH, `${JSON.stringify(ordered)}\n`, 'utf8');
  console.log(`Arquivo gerado: ${path.relative(ROOT, AI_OUTPUT_PATH)}`);
}

main();
