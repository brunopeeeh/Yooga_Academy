/**
 * Extração de "passos" a partir do texto extraído da Central de Ajuda.
 *
 * Biblioteca compartilhada entre `generate-checks.mjs` (perguntas de conferência
 * das aulas) e `generate-quizzes.mjs` (quizzes dos módulos): os dois precisam
 * concordar sobre o que é um passo legível, o que é um trecho distintivo e o
 * que é uma alternativa válida.
 *
 * O texto aqui é o mesmo que já valida `src/content/content.test.ts`:
 * sem imagens, sem o sumário ("Tópicos") e sem os títulos dos blocos.
 */

import { createHash } from 'node:crypto';

export const MIN_CANDIDATE = 45;
export const MAX_CANDIDATE = 600;
export const MAX_OPTION = 150;

/** Verbos de ação: a alternativa correta precisa descrever um passo real. */
export const ACTION_STARTS = [
  'acesse',
  'abra',
  'adicione',
  'agora',
  'altere',
  'arraste',
  'ative',
  'baixe',
  'cadastre',
  'clique',
  'confira',
  'conecte',
  'copie',
  'crie',
  'defina',
  'desabilite',
  'desative',
  'digite',
  'edite',
  'em seguida',
  'envie',
  'escolha',
  'exclua',
  'habilite',
  'imprima',
  'insira',
  'instale',
  'logo apos',
  'na tela',
  'no app',
  'no painel',
  'pressione',
  'preencha',
  'remova',
  'salve',
  'selecione',
  'toque',
  'verifique',
  'visite',
  'consulte',
  'atualize',
  'duplique',
  'importe',
  'exporte',
  'sincronize',
  'entrar',
  'sair',
  'ir',
  'vá',
  'cancelar',
  'escreva',
  'leia',
  'veja',
  'observe',
];

/** Palavras comuns que não servem para distinguir uma aula de outra. */
export const COMMON_WORDS = new Set([
  'aqui',
  'agora',
  'alem',
  'apos',
  'antes',
  'atencao',
  'ainda',
  'apenas',
  'cada',
  'cliente',
  'com',
  'como',
  'configuracao',
  'configuracoes',
  'contem',
  'contra',
  'depois',
  'deve',
  'devem',
  'dentro',
  'depois',
  'durante',
  'entando',
  'entao',
  'entre',
  'essa',
  'essas',
  'esse',
  'esses',
  'esta',
  'estas',
  'este',
  'estes',
  'estara',
  'fazer',
  'feito',
  'forma',
  'grande',
  'grupo',
  'igual',
  'isso',
  'isto',
  'ja',
  'la',
  'lateral',
  'lembre',
  'local',
  'maior',
  'menor',
  'mesma',
  'mesmo',
  'mesmas',
  'mesmos',
  'momento',
  'nesta',
  'neste',
  'nunca',
  'opcao',
  'opcoes',
  'ordem',
  'outro',
  'outra',
  'parte',
  'passo',
  'passos',
  'pedido',
  'pedidos',
  'pode',
  'podem',
  'por',
  'porque',
  'primeiro',
  'primeira',
  'produto',
  'produtos',
  'proprio',
  'qual',
  'quando',
  'quanto',
  'quais',
  'realizar',
  'saber',
  'sem',
  'sempre',
  'sendo',
  'ser',
  'sera',
  'serao',
  'sistema',
  'sobre',
  'sua',
  'suas',
  'tambem',
  'tela',
  'telas',
  'ter',
  'teria',
  'tipo',
  'todos',
  'todas',
  'todo',
  'tudo',
  'ultima',
  'ultimo',
  'unico',
  'unica',
  'vai',
  'varias',
  'varios',
  'vez',
  'vezes',
  'voce',
  'ainda',
]);

/** Palavras que não distinguem uma aula de outra. */
export const STOP_TERMS = new Set([
  'aqui',
  'agora',
  'além',
  'após',
  'antes',
  'atenção',
  'cliente',
  'com',
  'como',
  'para',
  'pois',
  'quando',
  'tela',
  'você',
  'essa',
  'este',
  'isso',
  'nesta',
  'neste',
  'passo',
  'depois',
  'deve',
  'então',
  'será',
  'terá',
]);

export function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** PRNG determinístico: as alternativas embaralham sempre igual. */
export function createRandom(seed) {
  let state = createHash('sha1').update(seed).digest().readUInt32LE(0) || 1;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, random) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }

  return copy;
}

export function textOf(tokens) {
  return tokens
    .filter((token) => token.type !== 'image')
    .map((token) => token.value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resumo curto e legível de um passo, para usar como alternativa. */
export function summarize(text) {
  if (text.length <= MAX_OPTION) return text;

  // 1. Frase completa: pontuação seguida de espaço + maiúscula/número.
  //    (ignora "app.yooga.com.br", onde o ponto não fecha a frase).
  const sentence = text.match(/^.*?[.!?](\s+[A-ZÀ-Ý0-9])/);

  if (sentence && sentence[0].length <= MAX_OPTION) {
    return sentence[0].replace(/\s+[A-ZÀ-Ý0-9]$/, '').trim();
  }

  // 2. Frase completa que ainda cabe depois de cortar a primeira.
  const allSentences = text.match(/^.*?[.!?](\s+|$)/);

  if (allSentences && allSentences[0].length <= MAX_OPTION) {
    return allSentences[0].replace(/\s+$/, '').trim();
  }

  // 3. Corte em uma vírgula (mantém a alternativa uma frase coerente).
  const cut = text.slice(0, MAX_OPTION);
  const comma = cut.lastIndexOf(',');

  if (comma > 60) return `${cut.slice(0, comma).trim()}.`;

  // 4. Último recurso: corta no espaço e sinaliza a continuação.
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** O trecho descreve uma ação (verbo no imperativo) ou é uma informação? */
export function isAction(text) {
  const start = normalize(text).split(' ').slice(0, 3).join(' ');

  return ACTION_STARTS.some((verb) => start.startsWith(verb));
}

/** Termo que distingue um passo dos demais (tela, botão, campo). */
export function distinctiveTerm(step) {
  const tokens = step.tokens;

  for (const token of tokens) {
    if (token.type !== 'strong' && token.type !== 'key') continue;

    const value = token.value.replace(/[.;:,]+$/, '').trim();

    if (value.length >= 4 && !STOP_TERMS.has(normalize(value))) return value;
  }

  // Fallback: a palavra mais longa que não seja comum.
  const words = textOf(tokens)
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}/-]+/gu, ''))
    .filter((word) => word.length >= 6);

  const distinctive = words
    .filter((word) => !COMMON_WORDS.has(normalize(word)))
    .sort((a, b) => b.length - a.length)[0];

  if (distinctive) return distinctive;

  const capitalized = textOf(tokens).match(/\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇ/-]{4,})\b/);

  return capitalized ? capitalized[1] : '';
}

/**
 * Passos de cada bloco, na ordem de leitura.
 *
 * O bloco "Tópicos" é o sumário do artigo (os itens se repetem nos títulos) e
 * os títulos que aparecem como passo são descartados: nenhum dos dois é
 * conteúdo de verdade.
 */
export function stepsByBlock(content) {
  const titles = new Set(
    content.blocks.map((block) => normalize(block.title)).filter((title) => title.length > 0),
  );

  const blocks = [];

  for (const block of content.blocks) {
    if (normalize(block.title) === 'topicos') continue;

    const steps = [];

    for (const step of block.steps) {
      if (step.kind === 'imagem') continue;

      const text = textOf(step.tokens);

      if (text.length < 18) continue;
      if (titles.has(normalize(text))) continue;

      steps.push({
        text,
        term: distinctiveTerm(step),
        termKey: normalize(distinctiveTerm(step)),
        action: isAction(text),
      });
    }

    if (steps.length > 0) blocks.push({ title: block.title, steps });
  }

  return blocks;
}

/** Todos os passos com texto, na ordem do artigo (sem sumário nem títulos). */
export function stepsOf(content) {
  return stepsByBlock(content).flatMap((block) => block.steps);
}

/** Passos que podem virar alternativa: texto útil e com um termo distintivo. */
export function candidatesOf(content) {
  const candidates = [];
  const seen = new Set();

  for (const step of stepsOf(content)) {
    if (step.text.length < MIN_CANDIDATE || step.text.length > MAX_CANDIDATE) continue;
    if (!step.term) continue;

    const key = normalize(step.text);

    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({ ...step, action: isAction(step.text) });
  }

  return candidates;
}

export function lessonPlainText(content) {
  return normalize(
    content.blocks
      .flatMap((block) => block.steps)
      .map((step) => textOf(step.tokens))
      .join(' '),
  );
}

/** Uma alternativa é válida quando o termo dela não aparece na aula. */
export function isForeign(candidate, lessonText) {
  return !lessonText.includes(candidate.termKey);
}

/**
 * O texto aparece na aula? Compara os primeiros palavras (o alternativa pode
 * estar truncada por `summarize`, então comparar o texto inteiro não serve).
 */
export function appearsInLesson(text, lessonText) {
  const prefix = normalize(text).split(' ').slice(0, 6).join(' ');

  if (prefix.length === 0) return false;

  return lessonText.includes(prefix);
}

/** Monta as alternativas: sempre 3 distintas, com a correta em posição sorteada. */
export function buildOptions(correct, distractors, random) {
  const key = normalize(correct);
  const seen = new Set([key]);
  const unique = [];

  for (const distractor of distractors) {
    const distractorKey = normalize(distractor);

    if (!distractorKey || seen.has(distractorKey)) continue;

    seen.add(distractorKey);
    unique.push(distractor);
  }

  if (unique.length < 2) return null;

  const options = shuffle([correct, ...unique], random);

  return {
    options,
    correctIndex: options.indexOf(correct),
  };
}

/** Texto pronto para entrar entre aspas no enunciado. */
export function quote(text) {
  return text.replace(/"/g, '’');
}

/**
 * Limpa o trecho que vira alternativa: some marcador de lista (`- `) e
 * pontuação solta no fim (`;`, `:`) e cola a pontuação que a extração separou
 * do texto (`"panel.yooga.com.br ."` → `"panel.yooga.com.br."`). O texto
 * continua sendo um trecho literal do artigo — só some a sujeira da extração.
 *
 * Fica na lib porque o gerador de quizzes e o rewriter por IA precisam citar
 * o **mesmo** trecho, senão a âncora da pergunta de sequência muda de forma
 * entre o texto determinístico e o reescrito.
 */
export function cleanOption(text) {
  return (
    text
      .replace(/^[-•*·]\s+/, '')
      // Pontuação que a extração deixou separada: "panel.yooga.com.br ." vira
      // "panel.yooga.com.br.". O texto continua literal — só cola a pontuação.
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[;:]\s*$/, '')
      .trim()
  );
}

/** Indicadores de alternativa mal limpa, para o teste da lib vigiar. */
export function hasLoosePunctuation(text) {
  return /\s+[.,;:!?]/.test(text);
}
