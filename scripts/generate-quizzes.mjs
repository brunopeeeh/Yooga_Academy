/**
 * Gera os quizzes dos módulos a partir do texto extraído da Central de Ajuda.
 *
 *   npm run content:quizzes
 *
 * Saída: `src/content/quizzes.generated.json` — arquivo gerado, não editar à mão.
 *
 * Cada pergunta é *derivada do texto da aula* do próprio módulo:
 *
 *   - a alternativa correta é um passo real do artigo (passo de sequência,
 *     ação citada ou primeiro passo da aula);
 *   - as distratoras vêm de **outras aulas do módulo** e não aparecem na aula
 *     citada — então a resposta é sempre verificável automaticamente.
 *
 * Todo texto curado à mão tem prioridade: os módulos com quiz curado em
 * `src/content/quizzes.ts` nem são gerados por aqui (veja
 * `CURATED_QUIZ_MODULES`).
 *
 * Opções:
 *   --only=<trecho>   gera e imprime só os módulos que casam com o trecho
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  appearsInLesson,
  buildOptions,
  candidatesOf,
  createRandom,
  lessonPlainText,
  normalize,
  quote,
  stepsByBlock,
  summarize,
} from './lib/lesson-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = path.join(ROOT, 'src', 'data', 'seed.json');
const CONTENT_PATH = path.join(ROOT, 'src', 'content', 'lessons.generated.json');
const OUTPUT_PATH = path.join(ROOT, 'src', 'content', 'quizzes.generated.json');

const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);

/** Perguntas por quiz — o mesmo tamanho do quiz curado do protótipo. */
const QUESTIONS_PER_QUIZ = 6;

/**
 * Módulos com quiz curado à mão (`src/content/quizzes.ts`): o gerador não os
 * toca. O texto curado é a referência de qualidade e usa as aulas curadas de
 * `src/content/lessons.ts`, que são diferentes do texto extraído.
 */
const CURATED_QUIZ_MODULES = new Set(['pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio']);

/** Mínimo de palavras de uma alternativa (evita trechos curtos demais). */
const MIN_WORDS = 4;

/** Tamanho mínimo do trecho citado na âncora da pergunta de sequência. */
const MIN_ANCHOR = 25;

/**
 * Falas da cliente fictícia. Precisam aceitar qualquer tema (nome de ação ou
 * de objeto), por isso todas usam "sobre" + tema.
 *
 * A caixa do tema é preservada: os temas tirados do resumo do artigo já vêm
 * em minúsculas ("criar um usuário") e os tirados do título mantêm a marca
 * ("Pix Online", "App do Entregador").
 */
const SCENES = [
  (topic) => `Tô com uma dúvida sobre ${topic}.`,
  (topic) => `Não entendi ${topic}.`,
  (topic) => `O cliente perguntou sobre ${topic}.`,
];

/** Introduções da Central que só descrevem o artigo — não servem de tema. */
const INTRO_BOILERPLATE = [
  /^n(?:este|esse)\s+artigo,?\s*(?:você\s+)?(?:aprenderá\s+|vai\s+aprender\s+)/i,
  /^n(?:este|esse)\s+artigo\s+(?:terá\s+acesso\s+a\s+)?/i,
  /^n(?:este|esse)\s+artigo,?\s*você\s+encontrará\s+(?:informações\s+(?:[a-z]+\s+)?(?:sobre\s+)?|um\s+guia\s+passo\s+a\s+passo\s+sobre\s+|orientações\s+sobre\s+)?/i,
  /^veja,?\s+n(?:este|esse)\s+artigo,?\s*/i,
  /^veja\s+n(?:este|esse)\s+artigo\s+/i,
  /^veja\s+nesse\s+conteúdo\s+como\s+/i,
  /^veja\s+como\s+/i,
  /^saiba\s+como\s+/i,
  /^aprenda\s+(?:a\s+)?/i,
  /^entenda\s+como\s+/i,
  /^conheça\s+(?:a\s+)?/i,
  /^descubra,?\s+n(?:este|esse)\s+artigo,?\s*/i,
  /^descubra\s+como\s+/i,
  /^por\s+aqui\s+você\s+fica\s+sabendo\s+(?:todos\s+os\s+passos\s+para\s+(?:que\s+você\s+)?)?/i,
  /^o\s+passo\s+a\s+passo\s+para\s+/i,
  /^o\s+passo\s+a\s+passo\s+/i,
  /^este\s+artigo\s+apresenta\s+/i,
];

/** Teto de tamanho do tema: uma frase de cliente precisa ser curta. */
const MAX_TOPIC_WORDS = 9;
const MAX_TOPIC_LENGTH = 72;

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Tira a interrogação final do título ("Como abrir o caixa?" → "abrir o caixa"). */
function topicFromTitle(title) {
  return title
    .replace(/\?+\s*$/, '')
    .replace(/^como\s+/i, '')
    .replace(/[.!]+$/, '')
    .trim();
}

/**
 * Tema da aula: prefere o resumo do artigo (diz o que o texto faz) e cai para
 * o título quando o resumo é genérico demais ou longo demais para virar uma
 * fala de cliente.
 */
function topicOf(lesson, content) {
  let topic = (content.intro ?? '').trim();

  for (const pattern of INTRO_BOILERPLATE) {
    topic = topic.replace(pattern, '');
  }

  topic = topic
    .replace(/^o\s+passo\s+a\s+passo\s+para\s+/i, '')
    .replace(/[.!]+$/, '')
    .trim();

  const usable =
    topic.length >= 12 &&
    countWords(topic) >= 3 &&
    countWords(topic) <= MAX_TOPIC_WORDS &&
    topic.length <= MAX_TOPIC_LENGTH;

  return usable ? topic : topicFromTitle(lesson.titulo);
}

/**
 * Limpa o trecho que vira alternativa: some marcador de lista (`- `) e
 * pontuação solta no fim (`;`, `:`). O texto continua sendo um trecho literal
 * do artigo — só some a sujeira da extração.
 */
function cleanOption(text) {
  return text
    .replace(/^[-•*·]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[;:]\s*$/, '')
    .trim();
}

function buildLesson(lesson, content) {
  return {
    id: lesson.id,
    title: lesson.titulo,
    type: lesson.type,
    topic: topicOf(lesson, content),
    blocks: stepsByBlock(content),
    text: lessonPlainText(content),
    candidates: candidatesOf(content),
  };
}

/**
 * Escolhe as alternativas erradas: passos de **outras aulas** do módulo (ou do
 * grupo, quando o módulo é pequeno demais) que não aparecem na aula citada.
 */
function pickDistractors(pool, lesson, correctText, limit) {
  const chosen = [];
  const seen = new Set([normalize(correctText)]);

  for (const candidate of pool) {
    if (chosen.length >= limit) break;
    if (candidate.lessonId === lesson.id) continue;
    if (seen.has(normalize(candidate.text))) continue;
    if (candidate.termKey && lesson.text.includes(candidate.termKey)) continue;

    const summary = cleanOption(summarize(candidate.text));

    if (countWords(summary) < MIN_WORDS) continue;
    if (seen.has(normalize(summary))) continue;

    // A alternativa exibida (e não só o passo original) precisa não aparecer
    // na aula citada — é ela que o aluno vai ler na tela.
    if (appearsInLesson(summary, lesson.text)) continue;

    const ratio = summary.length / correctText.length;
    if (ratio < 0.2 || ratio > 5) continue;

    seen.add(normalize(summary));
    chosen.push(summary);
  }

  return chosen;
}

/**
 * Pergunta de sequência: depois de um passo, qual vem a seguir?
 * A resposta é sempre o passo **imediatamente** seguinte na mesma seção.
 */
function sequenceQuestion(lesson, pool, used) {
  for (const block of lesson.blocks) {
    const steps = block.steps;
    const frequency = new Map();

    for (const step of steps) {
      const key = normalize(step.text);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }

    for (let index = 0; index < steps.length - 1; index += 1) {
      const anchor = steps[index];
      const next = steps[index + 1];

      if (!anchor.action) continue;
      if (anchor.text.length < MIN_ANCHOR || next.text.length < MIN_ANCHOR) continue;
      if (frequency.get(normalize(anchor.text)) !== 1) continue;
      if (normalize(anchor.text) === normalize(next.text)) continue;
      if (used.answers.has(normalize(next.text))) continue;
      if (used.anchors.has(normalize(anchor.text))) continue;

      const correct = cleanOption(summarize(next.text));
      if (countWords(correct) < MIN_WORDS) continue;

      const distractors = pickDistractors(pool, lesson, correct, 3);
      if (distractors.length < 2) continue;

      const built = buildOptions(correct, distractors, used.random);
      if (!built) continue;

      const section = block.title;
      const anchorText = quote(cleanOption(summarize(anchor.text)));

      return {
        question: {
          prompt: section
            ? `Na seção "${quote(section)}", depois de "${anchorText}", qual é o próximo passo?`
            : `Depois de "${anchorText}", qual é o próximo passo?`,
          options: built.options,
          correctIndex: built.correctIndex,
          explanation: section
            ? `Na seção "${quote(section)}", o passo que vem logo em seguida é esse.`
            : 'É o passo que vem logo em seguida na aula.',
          review: `Próximo passo em ${lesson.title}`,
        },
        answer: next.text,
        anchor: anchor.text,
      };
    }
  }

  return null;
}

/**
 * Pergunta de reconhecimento: qual destes passos é descrito na aula citada?
 * As distratoras vêm de outras aulas do módulo, então só uma resposta serve.
 *
 * Passos de ação viram "ações"; passos descritivos (explicações) viram
 * "informações" — o enunciado acompanha o tipo do trecho citado.
 */
function recognitionQuestion(lesson, pool, used) {
  const actions = lesson.candidates.filter((candidate) => candidate.action);
  const details = lesson.candidates.filter((candidate) => !candidate.action);

  for (const candidate of [...actions, ...details]) {
    if (used.answers.has(normalize(candidate.text))) continue;

    const correct = cleanOption(summarize(candidate.text));
    if (countWords(correct) < MIN_WORDS) continue;

    const distractors = pickDistractors(pool, lesson, correct, 3);
    if (distractors.length < 2) continue;

    const built = buildOptions(correct, distractors, used.random);
    if (!built) continue;

    const prompt = candidate.action
      ? `Qual destas ações é descrita na aula "${quote(lesson.title)}"?`
      : `Qual destas informações aparece na aula "${quote(lesson.title)}"?`;

    return {
      question: {
        prompt,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `Esse trecho está descrito na aula "${quote(lesson.title)}".`,
        review: `Passo de ${lesson.title}`,
      },
      answer: candidate.text,
    };
  }

  return null;
}

/** Pergunta de ordem: qual destes passos vem primeiro na aula citada? */
function orderQuestion(lesson, pool, used) {
  const first = lesson.blocks.flatMap((block) => block.steps)[0];

  if (!first) return null;
  if (first.text.length < MIN_ANCHOR) return null;
  if (used.answers.has(normalize(first.text))) return null;

  const correct = cleanOption(summarize(first.text));
  if (countWords(correct) < MIN_WORDS) return null;

  const distractors = pickDistractors(pool, lesson, correct, 3);
  if (distractors.length < 2) return null;

  const built = buildOptions(correct, distractors, used.random);
  if (!built) return null;

  return {
    question: {
      prompt: `Qual destes passos vem primeiro na aula "${quote(lesson.title)}"?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: `É o primeiro passo da aula "${quote(lesson.title)}".`,
      review: `Primeiro passo de ${lesson.title}`,
    },
    answer: first.text,
  };
}

function main() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const generated = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
  const contentById = new Map(generated.map((entry) => [entry.lessonId, entry]));

  const quizzes = [];
  const stats = { modulos: 0, completos: 0, parciais: 0, semMaterial: [] };
  const samples = [];

  for (const group of seed.grupos) {
    for (const module of group.modulos) {
      if (!module.tem_quiz) continue;
      if (CURATED_QUIZ_MODULES.has(module.id)) continue;

      stats.modulos += 1;

      const lessons = module.aulas
        .filter((lesson) => contentById.has(lesson.id))
        .map((lesson) => buildLesson(lesson, contentById.get(lesson.id)));

      if (lessons.length === 0) {
        stats.semMaterial.push(module.id);
        continue;
      }

      const essential = lessons.filter((lesson) => lesson.type === 'essencial');
      const support = lessons.filter((lesson) => lesson.type !== 'essencial');
      const ordered = [...essential, ...support];

      // Distratoras: primeiro as outras aulas do módulo; quando o módulo tem
      // pouco material, completa com as demais aulas do mesmo grupo.
      const modulePool = ordered.flatMap((lesson) =>
        lesson.candidates.map((candidate) => ({ ...candidate, lessonId: lesson.id })),
      );
      const groupPool = [];
      for (const other of group.modulos) {
        if (other.id === module.id) continue;
        for (const lesson of other.aulas) {
          if (lesson.tipo !== 'essencial') continue;
          const content = contentById.get(lesson.id);
          if (!content) continue;
          for (const candidate of candidatesOf(content)) {
            groupPool.push({ ...candidate, lessonId: lesson.id });
          }
        }
      }

      const random = createRandom(module.id);
      const used = { answers: new Set(), anchors: new Set(), prompts: new Set(), random };
      const questions = [];
      const makers = [sequenceQuestion, recognitionQuestion, orderQuestion];

      // As distratoras do próprio módulo vêm primeiro; o resto do grupo só
      // entra quando o módulo não tem material suficiente.
      const distractorPool = [...modulePool, ...groupPool];

      const add = (result, lesson) => {
        if (!result) return false;
        if (used.prompts.has(normalize(result.question.prompt))) return false;

        const scene = SCENES[questions.length % SCENES.length](lesson.topic);

        used.prompts.add(normalize(result.question.prompt));
        used.answers.add(normalize(result.answer));
        if (result.anchor) used.anchors.add(normalize(result.anchor));

        questions.push({
          id: `q${questions.length + 1}`,
          scene,
          ...result.question,
          lessonLabel: lesson.title,
          lessonId: lesson.id,
        });

        return true;
      };

      for (let round = 0; round < 6 && questions.length < QUESTIONS_PER_QUIZ; round += 1) {
        for (const lesson of ordered) {
          if (questions.length >= QUESTIONS_PER_QUIZ) break;

          for (let offset = 0; offset < makers.length; offset += 1) {
            const make = makers[(round + offset) % makers.length];

            if (add(make(lesson, distractorPool, used), lesson)) break;
          }
        }
      }

      if (questions.length === 0) {
        stats.semMaterial.push(module.id);
        continue;
      }

      if (questions.length >= QUESTIONS_PER_QUIZ) stats.completos += 1;
      else stats.parciais += 1;

      quizzes.push({ moduleId: module.id, questions });

      if (ONLY) samples.push({ module: module.id, questions });
    }
  }

  console.log(
    `Módulos com quiz: ${stats.completos} completos | ${stats.parciais} parciais | ${stats.semMaterial.length} sem material (de ${stats.modulos})`,
  );

  if (stats.semMaterial.length > 0) {
    console.log(`Sem material: ${stats.semMaterial.join(', ')}`);
  }

  if (ONLY) {
    console.log(
      JSON.stringify(
        samples.filter((item) => item.module.includes(ONLY)),
        null,
        2,
      ),
    );
    console.log('Modo --only: o arquivo gerado não foi sobrescrito.');
    return;
  }

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(quizzes)}\n`, 'utf8');
  console.log(`Arquivo gerado: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
