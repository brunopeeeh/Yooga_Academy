/**
 * Gera perguntas de conferência ("confere rápido") para as aulas essenciais que
 * ainda não têm perguntas curadas.
 *
 *   npm run content:checks
 *
 * Saída: `src/content/checks.generated.json` — arquivo gerado, não editar à mão.
 *
 * As perguntas são *derivadas do próprio texto da aula* (reconhecimento de
 * passos e sequência de ações), então são verificáveis automaticamente: a
 * alternativa correta aparece na aula e as distratoras não. Todo o texto
 * curado à mão tem prioridade — o script nunca sobrescreve uma pergunta que
 * já existe em `src/content/lessons.ts`.
 *
 * Opções:
 *   --only=<trecho>   gera e imprime só as aulas que casam com o trecho
 *   --refresh         ignora o cache de HTML em `.cache/central/`
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  appearsInLesson,
  buildOptions,
  candidatesOf,
  createRandom,
  isForeign,
  lessonPlainText,
  normalize,
  quote,
  stepsByBlock,
  summarize,
} from './lib/lesson-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = path.join(ROOT, 'src', 'data', 'seed.json');
const CONTENT_PATH = path.join(ROOT, 'src', 'content', 'lessons.generated.json');
const OUTPUT_PATH = path.join(ROOT, 'src', 'content', 'checks.generated.json');

const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);

function recognitionQuestion(candidates, pool, lessonText, random, used = new Set()) {
  const available = candidates.filter((candidate) => !used.has(normalize(candidate.text)));

  if (available.length === 0) return null;

  const correct = available.find((candidate) => candidate.action) ?? available[0];

  const distractors = [];

  for (const other of pool) {
    if (distractors.length === 2) break;
    if (!isForeign(other, lessonText)) continue;
    if (other.action !== correct.action) continue;
    if (normalize(other.text).includes(normalize(correct.term))) continue;

    // A alternativa não pode ser um trecho que também existe nesta aula:
    // aí a resposta seria ambígua.
    if (appearsInLesson(other.text, lessonText)) continue;

    // Prefere alternativas de tamanho parecido com a correta.
    const ratio = other.text.length / correct.text.length;
    if (ratio < 0.25 || ratio > 4) continue;

    distractors.push(other);
  }

  if (distractors.length < 2) return null;

  const built = buildOptions(
    summarize(correct.text),
    distractors.map((distractor) => summarize(distractor.text)),
    random,
  );

  if (!built) return null;

  const { options, correctIndex } = built;

  return {
    question: {
      id: 'q1',
      prompt: correct.action
        ? 'Qual destas ações é descrita nesta aula?'
        : 'Qual destas informações aparece nesta aula?',
      options,
      correctIndex,
      success: correct.action
        ? 'Isso. Essa ação aparece nesta aula.'
        : 'Isso. Essa informação está nesta aula.',
    },
    correctText: correct.text,
  };
}

/**
 * Pergunta 2 — sequência: depois de um passo, qual vem a seguir?
 *
 * A resposta é sempre o passo **imediatamente** seguinte dentro da mesma
 * seção do artigo (ambos precisam ser ações, senão a pergunta fica ambígua).
 * Quando a mesma frase aparece em várias seções, o enunciado cita a seção:
 * `Na seção "Como criar", depois de "...", qual é o próximo passo?`.
 *
 * Sem um par de ações, a pergunta vira "qual vem primeiro?".
 */
function sequenceQuestion(blocks, pool, lessonText, random, used = new Set()) {
  for (const block of blocks) {
    const steps = block.steps;

    // Dentro da seção, um passo repetido tornaria a pergunta ambígua.
    const frequency = new Map();

    for (const step of steps) {
      const key = normalize(step.text);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }

    for (let index = 0; index < steps.length - 1; index += 1) {
      const anchor = steps[index];
      const next = steps[index + 1];

      // A âncora precisa ser uma ação ("Depois de clicar em…"); o passo
      // seguinte pode ser uma explicação, mas precisa ser um trecho real.
      if (!anchor.action) continue;
      if (anchor.text.length < 25 || next.text.length < 25) continue;
      if (frequency.get(normalize(anchor.text)) !== 1) continue;
      if (normalize(anchor.text) === normalize(next.text)) continue;
      if (used.has(normalize(anchor.text))) continue;
      if (used.has(normalize(next.text))) continue;

      // Distratoras: outros passos de ação da própria seção; se não houver,
      // completa com passos de outras aulas do mesmo grupo.
      const blocked = new Set([normalize(anchor.text), normalize(next.text)]);

      const distractors = steps
        .filter(
          (step, stepIndex) =>
            stepIndex !== index && stepIndex !== index + 1 && !blocked.has(normalize(step.text)),
        )
        .slice(0, 2);

      for (const other of pool) {
        if (distractors.length >= 2) break;
        if (!isForeign(other, lessonText)) continue;
        if (blocked.has(normalize(other.text))) continue;

        distractors.push(other);
      }

      if (distractors.length < 2) continue;

      const built = buildOptions(
        summarize(next.text),
        distractors.map((distractor) => summarize(distractor.text)),
        random,
      );

      if (!built) continue;

      const anchorText = quote(summarize(anchor.text));
      const prompt = block.title
        ? `Na seção "${quote(block.title)}", depois de "${anchorText}", qual é o próximo passo?`
        : `Depois de "${anchorText}", qual é o próximo passo?`;

      return {
        question: {
          id: 'q2',
          prompt,
          options: built.options,
          correctIndex: built.correctIndex,
          success: 'Isso. É o passo que vem logo em seguida.',
        },
        correctText: next.text,
        // A âncora aparece no enunciado: repetir o mesmo texto na pergunta de
        // reconhecimento deixaria a aula com duas respostas iguais.
        quotedText: anchor.text,
      };
    }
  }

  // Sem par consecutivo de ações: "qual destes trechos vem primeiro na aula?"
  const steps = blocks.flatMap((block) => block.steps);
  const frequency = new Map();

  for (const step of steps) {
    const key = normalize(step.text);
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }

  const first = steps[0];
  const second = steps[1];

  if (!first || !second) return null;
  if (frequency.get(normalize(first.text)) !== 1) return null;
  if (normalize(first.text) === normalize(second.text)) return null;
  if (used.has(normalize(first.text))) return null;

  const extra = pool.find(
    (other) =>
      isForeign(other, lessonText) &&
      other.text.length / first.text.length < 2 &&
      normalize(other.text) !== normalize(first.text) &&
      normalize(other.text) !== normalize(second.text),
  );

  if (!extra) return null;

  const built = buildOptions(
    summarize(first.text),
    [summarize(second.text), summarize(extra.text)],
    random,
  );

  if (!built) return null;

  return {
    question: {
      id: 'q2',
      prompt: first.action
        ? 'Qual destes passos vem primeiro na aula?'
        : 'Qual destes trechos vem primeiro na aula?',
      options: built.options,
      correctIndex: built.correctIndex,
      success: 'Isso. É o primeiro passo descrito.',
    },
    correctText: first.text,
  };
}

function main() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const generated = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  const contentById = new Map(generated.map((entry) => [entry.lessonId, entry]));

  const lessonsByGroup = new Map();

  for (const group of seed.grupos) {
    const list = [];

    for (const module of group.modulos) {
      for (const lesson of module.aulas) {
        if (lesson.tipo !== 'essencial') continue;
        list.push(lesson);
      }
    }

    lessonsByGroup.set(group.id, list);
  }

  const checks = {};
  const stats = { geradas: 0, semCandidatos: 0, incompletas: 0 };
  const samples = [];

  for (const lessons of lessonsByGroup.values()) {
    // Reservoir de passos de outras aulas do grupo, para usar como distratoras.
    const pool = [];

    for (const lesson of lessons) {
      const content = contentById.get(lesson.id);
      if (!content) continue;
      pool.push(...candidatesOf(content));
    }

    for (const lesson of lessons) {
      const content = contentById.get(lesson.id);

      if (!content) {
        stats.semCandidatos += 1;
        continue;
      }

      const candidates = candidatesOf(content);
      const blocks = stepsByBlock(content);

      if (candidates.length === 0) {
        stats.semCandidatos += 1;
        continue;
      }

      const lessonText = lessonPlainText(content);
      const random = createRandom(lesson.id);
      const questions = [];
      const usedAnswers = new Set();

      // A sequência vem primeiro: ela reserva a âncora (citada no enunciado) e
      // a resposta. O reconhecimento evita esses textos para as duas perguntas
      // da mesma aula não terem a mesma resposta.
      const sequence = sequenceQuestion(blocks, pool, lessonText, random, usedAnswers);

      if (sequence) {
        questions.push(sequence.question);
        usedAnswers.add(normalize(sequence.correctText));

        if (sequence.quotedText) usedAnswers.add(normalize(sequence.quotedText));
      }

      const recognition = recognitionQuestion(candidates, pool, lessonText, random, usedAnswers);

      if (recognition) {
        questions.push(recognition.question);
        usedAnswers.add(normalize(recognition.correctText));
      }

      // Mantém a ordem estável: reconhecimento (q1) antes da sequência (q2).
      questions.sort((a, b) => a.id.localeCompare(b.id));

      if (questions.length === 0) {
        stats.semCandidatos += 1;
        continue;
      }

      if (questions.length < 2) stats.incompletas += 1;

      checks[lesson.id] = questions;
      stats.geradas += 1;

      if (ONLY) samples.push({ lesson: lesson.id, questions });
    }
  }

  const ordered = Object.fromEntries(Object.entries(checks).sort(([a], [b]) => a.localeCompare(b)));

  console.log(
    `Aulas essenciais com perguntas: ${stats.geradas} | sem candidato: ${stats.semCandidatos} | com 1 pergunta: ${stats.incompletas}`,
  );

  if (ONLY) {
    console.log(
      JSON.stringify(
        samples.filter((s) => s.lesson.includes(ONLY)),
        null,
        2,
      ),
    );
    console.log('Modo --only: o arquivo gerado não foi sobrescrito.');
    return;
  }

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(ordered)}\n`, 'utf8');
  console.log(`Arquivo gerado: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
