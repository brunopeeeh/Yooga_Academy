/**
 * Reescreve a situação, o enunciado, o feedback e o rótulo de revisão das
 * perguntas de **quiz** usando a Edge Function `rewrite-quizzes` do Supabase.
 *
 *   npm run content:quizzes:ai
 *
 * Saída: `src/content/quizzes.ai.generated.json` — arquivo gerado, não editar à mão.
 *
 * O que a LLM pode mexer: **só os textos** (`scene`, `prompt`, `explanation` e
 * `review`). As alternativas, o índice da resposta, o tipo da pergunta, a
 * âncora, a seção e o vínculo com a aula continuam sendo os do gerador
 * determinístico (`npm run content:quizzes`) — é isso que mantém a
 * verificabilidade automática da auditoria (`src/content/quiz.test.ts`).
 *
 * Os quizzes curados à mão (PDV · Cardápio e o quiz final) **não** entram na
 * reescrita: eles são a referência de qualidade do app.
 *
 * O arquivo é **incremental**: as reescritas que já deram certo continuam
 * salvas quando o script roda de novo, então uma falha no meio do caminho não
 * joga trabalho fora. Módulos que a LLM não conseguiu reescrever continuam com
 * o texto gerado pelo template.
 *
 * Variáveis de ambiente (no `.env` da raiz):
 *   SUPABASE_URL     — url do projeto Supabase
 *   SUPABASE_KEY     — chave do projeto (a `anon` basta para chamar a função)
 *   REWRITE_TOKEN    — token que a Edge Function exige no header `x-rewrite-token`
 *
 * Opções:
 *   --only=<trecho>      reescreve só os módulos que casam com o trecho
 *   --limit=<n>          reescreve no máximo n módulos (para testar)
 *   --concurrency=<n>    chamadas em paralelo (padrão: 3)
 *   --dry-run            não grava o arquivo
 *   --force              refaz os módulos que já têm reescrita salva
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanOption, quote, stepsByBlock, summarize } from './lib/lesson-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = path.join(ROOT, 'src', 'data', 'seed.json');
const CONTENT_PATH = path.join(ROOT, 'src', 'content', 'lessons.generated.json');
const QUIZZES_PATH = path.join(ROOT, 'src', 'content', 'quizzes.generated.json');
const AI_OUTPUT_PATH = path.join(ROOT, 'src', 'content', 'quizzes.ai.generated.json');
const CURATED_PATH = path.join(ROOT, 'src', 'content', 'quizzes.ts');

const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const LIMIT = Number(
  process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length),
);
const CONCURRENCY = Number(
  process.argv.find((arg) => arg.startsWith('--concurrency='))?.slice('--concurrency='.length),
);
const DRY_RUN = process.argv.includes('--dry-run');
/** Refaz os módulos que já têm reescrita salva. */
const FORCE = process.argv.includes('--force');

/** Quantas aulas de contexto mandamos por módulo. */
const MAX_LESSONS = 8;
/** Quantos caracteres de cada aula vão no contexto. */
const MAX_LESSON_CHARS = 3500;

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

/**
 * Módulos cujo quiz é curado à mão: não entram na reescrita por IA.
 *
 * O texto curado usa identificadores (`moduleId: CARDAPIO_LESSON`) em vez de
 * literais, então as constantes do arquivo são resolvidas aqui.
 */
function curatedModuleIds() {
  if (!existsSync(CURATED_PATH)) return new Set();

  const source = readFileSync(CURATED_PATH, 'utf8');
  const constants = new Map(
    [...source.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*'([^']+)'/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  const ids = new Set();

  for (const match of source.matchAll(/moduleId:\s*([A-Za-z0-9_]+|'[^']+')/g)) {
    const raw = match[1];

    if (raw.startsWith("'")) {
      ids.add(raw.slice(1, -1));
      continue;
    }

    const resolved = constants.get(raw);

    if (resolved) ids.add(resolved);
  }

  return ids;
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

async function rewriteModule(module, questions, lessons, endpoint, token, apiKey) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'x-rewrite-token': token,
    },
    body: JSON.stringify({ module, lessons, questions }),
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
      'Faltou SUPABASE_URL, SUPABASE_KEY ou REWRITE_TOKEN no .env (veja o README da Fase 14).',
    );
    process.exitCode = 1;
    return;
  }

  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const generated = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  const quizzes = JSON.parse(readFileSync(QUIZZES_PATH, 'utf8'));

  const contentById = new Map(generated.map((entry) => [entry.lessonId, entry]));

  const moduleById = new Map();
  const lessonById = new Map();

  for (const group of seed.grupos) {
    for (const module of group.modulos) {
      moduleById.set(module.id, module);

      for (const lesson of module.aulas) lessonById.set(lesson.id, lesson);
    }
  }

  const curated = curatedModuleIds();

  // O arquivo anterior é a base: uma reescrita que já deu certo não se perde.
  const previous = existsSync(AI_OUTPUT_PATH)
    ? JSON.parse(readFileSync(AI_OUTPUT_PATH, 'utf8'))
    : {};

  let targets = quizzes
    .map((quiz) => quiz.moduleId)
    .filter((moduleId) => !curated.has(moduleId))
    .filter((moduleId) => !ONLY || moduleId.includes(ONLY));

  // Reexecutar o script só refaz o que falta: as reescritas que já deram
  // certo ficam intactas (o arquivo é a base, não a saída).
  if (!FORCE) targets = targets.filter((moduleId) => !previous[moduleId]);

  if (LIMIT > 0) targets = targets.slice(0, LIMIT);

  console.log(
    `Módulos na fila: ${targets.length} | já reescritos: ${Object.keys(previous).length}`,
  );

  if (targets.length === 0) {
    console.log('Nada a fazer.');
    return;
  }

  const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/rewrite-quizzes`;
  const result = {};
  const failures = [];
  let done = 0;

  await mapLimit(targets, CONCURRENCY || 3, async (moduleId) => {
    const quiz = quizzes.find((item) => item.moduleId === moduleId);
    const module = moduleById.get(moduleId);

    if (!quiz || !module) {
      failures.push({ moduleId, error: 'módulo sem quiz gerado' });
      return;
    }

    // Contexto: as aulas citadas pelas perguntas do quiz.
    const cited = [...new Set(quiz.questions.map((question) => question.lessonId).filter(Boolean))];
    const lessons = [];

    for (const lessonId of cited.slice(0, MAX_LESSONS)) {
      const content = contentById.get(lessonId);

      if (!content) continue;

      lessons.push({
        id: lessonId,
        title: lessonById.get(lessonId)?.titulo ?? lessonId,
        text: lessonText(content).slice(0, MAX_LESSON_CHARS),
      });
    }

    try {
      // O trecho que a LLM deve citar é **exatamente** o que o gerador
      // determinístico cita no enunciado (mesmo corte, mesmos marcadores).
      // Sem isso, a pergunta reescrita citaria o passo cru, com o `- ` da
      // lista, e o enunciado ficaria diferente do texto original.
      const questions = quiz.questions.map((question) => {
        if (!question.anchor) return question;

        const anchorQuote = quote(cleanOption(summarize(question.anchor)));

        return { ...question, anchorQuote };
      });

      const rewritten = await rewriteModule(
        { id: module.id, name: module.nome },
        questions,
        lessons,
        endpoint,
        token,
        apiKey,
      );

      if (!Array.isArray(rewritten)) throw new Error('resposta sem lista de perguntas');

      // O arquivo de saída é um **overlay**: guarda só os textos reescritos.
      // As alternativas, o índice da resposta, o tipo, a âncora e a seção
      // nem entram no arquivo — é o que garante que a camada de IA não
      // consegue, nem por acidente, mexer no que sustenta a
      // verificabilidade.
      const overlay = quiz.questions
        .map((question) => {
          const update = rewritten.find((item) => item.id === question.id);

          if (!update) return null;

          return {
            id: question.id,
            scene: update.scene,
            prompt: update.prompt,
            explanation: update.explanation,
            review: update.review,
          };
        })
        .filter((item) => item !== null);

      if (overlay.length === 0) throw new Error('nenhuma pergunta reescrita');

      result[moduleId] = overlay;
      done += 1;

      if (done % 5 === 0) console.log(`  ...${done} módulos reescritos`);
    } catch (error) {
      failures.push({ moduleId, error: error instanceof Error ? error.message : String(error) });
    }
  });

  const merged = { ...previous, ...result };
  const ordered = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));

  console.log(`Reescritas nesta execução: ${Object.keys(result).length}`);
  console.log(`Total no arquivo: ${Object.keys(ordered).length}`);

  if (failures.length > 0) {
    console.log(`Falhas: ${failures.length}`);
    for (const failure of failures.slice(0, 10)) {
      console.log(`  ${failure.moduleId}: ${failure.error}`);
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
