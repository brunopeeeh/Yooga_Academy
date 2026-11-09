/**
 * Extrai o conteúdo das aulas direto da Central de Ajuda (ajuda.yooga.com.br).
 *
 *   npm run content:extract              # extrai as 170 aulas
 *   npm run content:extract -- --refresh # ignora o cache e baixa tudo de novo
 *   npm run content:extract -- --only=app-yooga
 *
 * Saída: `src/content/lessons.generated.json` — arquivo gerado, não editar à mão.
 * O HTML baixado fica em `.cache/central/` para as próximas execuções não
 * baterem na rede de novo.
 *
 * O script não usa dependências: faz um parse simples do HTML do Help Center
 * (HubSpot), que é estável — `h1` = título, `h2` = descrição e o corpo vem em
 * módulos `data-hs-cos-type="inline_richtext_field"`.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = path.join(ROOT, 'src', 'data', 'seed.json');
const OUTPUT_PATH = path.join(ROOT, 'src', 'content', 'lessons.generated.json');
const CACHE_DIR = path.join(ROOT, '.cache', 'central');

const CONCURRENCY = 6;
const TIMEOUT_MS = 30_000;
const WORDS_PER_MINUTE = 90;
const REFRESH = process.argv.includes('--refresh');
const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);

const ENTITIES = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™',
  bull: '•',
  middot: '·',
  deg: '°',
  euro: '€',
  pound: '£',
  dollar: '$',
  rarr: '→',
  larr: '←',
  uarr: '↑',
  darr: '↓',
  check: '✓',
  times: '×',
  raquo: '»',
  laquo: '«',
  eacute: 'é',
  ecirc: 'ê',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  otilde: 'õ',
  iacute: 'í',
  icirc: 'î',
  igrave: 'ì',
  oacute: 'ó',
  ocirc: 'ô',
  ograve: 'ò',
  uacute: 'ú',
  ucirc: 'û',
  ugrave: 'ù',
  ccedil: 'ç',
  ntilde: 'ñ',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  szlig: 'ß',
};

/** Decodifica as entidades HTML mais comuns (inclusive numéricas). */
function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z][a-z0-9]*);/gi, (match, name) => {
      const decoded = ENTITIES[name.toLowerCase()];
      return decoded === undefined ? match : decoded;
    });
}

function normalizeText(text) {
  return decodeEntities(text)
    .replace(/[\u00a0\u200b\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveUrl(href, base) {
  const value = decodeEntities(href ?? '').trim();

  if (!value || value.startsWith('#')) return '';

  try {
    return new URL(value, base).toString();
  } catch {
    return '';
  }
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Tags cujo conteúdo não faz parte do texto da aula. */
const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'video',
  'audio',
  'svg',
  'form',
  'button',
  'input',
  'select',
  'textarea',
  'nav',
  'footer',
  'header',
  'aside',
]);

const HEADING_TAGS = new Set(['h3', 'h4', 'h5', 'h6']);

/** Tipos de caixa de destaque da Central e o passo equivalente no app. */
const CALLOUT_KINDS = {
  note: 'nota',
  tip: 'dica',
  warning: 'aviso',
  caution: 'aviso',
};

const CALLOUT_STEP_KINDS = new Set(Object.values(CALLOUT_KINDS));

/** Remove o cabeçalho/rodapé da página antes do parse. */
function stripNoise(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function parseAttributes(source) {
  const attributes = {};

  for (const match of source.matchAll(
    /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g,
  )) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes[key] = decodeEntities(value);
  }

  return attributes;
}

/**
 * Parser de HTML: monta uma árvore simples ({ name, attrs, children }) a partir
 * do HTML do artigo. Não é um parser completo, mas o markup do Help Center é
 * previsível e isso basta para extrair o texto.
 */
function parseTree(html) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];

  const pattern =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>|([^<]+)/gi;

  let match;

  while ((match = pattern.exec(html)) !== null) {
    const [, closeName, openName, attrs, selfClosing, text] = match;

    if (closeName) {
      const name = closeName.toLowerCase();

      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].name === name) {
          stack.length = index;
          break;
        }
      }

      continue;
    }

    if (openName) {
      const name = openName.toLowerCase();
      const element = { name, attrs: parseAttributes(attrs ?? ''), children: [] };

      stack[stack.length - 1].children.push(element);

      if (!VOID_TAGS.has(name) && selfClosing !== '/') stack.push(element);

      continue;
    }

    if (text !== undefined) {
      stack[stack.length - 1].children.push({ name: '#text', value: text, children: [] });
    }
  }

  return root;
}

function textContent(node) {
  if (node.name === '#text') return node.value;
  return node.children.map(textContent).join('');
}

function isCallout(node) {
  const className = node.attrs.class ?? '';
  return className.includes('hs-callout-type');
}

/** Traduz o tipo de callout da Central (`hs-callout-type-note`) em um passo. */
function calloutKind(node) {
  const className = node.attrs.class ?? '';
  const match = className.match(/hs-callout-type-([a-z-]+)/);
  const type = match ? match[1] : 'note';
  return CALLOUT_KINDS[type] ?? 'nota';
}

function createState() {
  return {
    title: '',
    blocks: [],
    steps: [],
    buffer: [],
    link: null,
    strong: false,
    key: false,
  };
}

function appendText(state, value) {
  // Preserva o espaço das bordas: `<strong>Nota:</strong> o login` precisa
  // manter a separação entre os tokens.
  const clean = decodeEntities(value)
    .replace(/[\u00a0\u200b\u202f]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!clean.trim()) return;

  if (state.link) {
    state.link.text += clean;
    return;
  }

  if (state.key) {
    state.buffer.push({ type: 'key', value: clean.trim() });
    return;
  }

  if (state.strong) {
    state.buffer.push({ type: 'strong', value: clean.trim() });
    return;
  }

  state.buffer.push({ type: 'text', value: clean });
}

function flushStep(state, kind) {
  const tokens = state.buffer;
  state.buffer = [];

  const hasContent = tokens.some((token) => token.type !== 'text' || token.value.trim().length > 0);

  if (!hasContent) return;

  const trimmed = [];

  for (const [index, token] of tokens.entries()) {
    if (token.type !== 'text') {
      trimmed.push(token);
      continue;
    }

    let value = token.value;

    if (index === 0) value = value.replace(/^\s+/, '');
    if (index === tokens.length - 1) value = value.replace(/\s+$/, '');

    if (!value) continue;

    trimmed.push({ ...token, value });
  }

  if (trimmed.length === 0) return;

  state.steps.push({ kind, tokens: trimmed });
}

function flushBlock(state) {
  if (state.steps.length === 0) return;

  state.blocks.push({ title: state.title, steps: state.steps });
  state.steps = [];
}

/** Percorre a árvore e transforma o artigo em blocos/passos. */
function walk(nodes, state, base, kind, fallbackAlt) {
  for (const node of nodes) {
    if (node.name === '#text') {
      appendText(state, node.value);
      continue;
    }

    const name = node.name;

    if (SKIP_TAGS.has(name)) continue;

    if (HEADING_TAGS.has(name)) {
      flushStep(state, kind);
      flushBlock(state);
      state.title = normalizeText(textContent(node));
      continue;
    }

    if (name === 'p') {
      flushStep(state, kind);
      const stepKind = CALLOUT_STEP_KINDS.has(kind) ? kind : 'paragrafo';
      walk(node.children, state, base, stepKind, fallbackAlt);
      flushStep(state, stepKind);
      continue;
    }

    if (name === 'li') {
      flushStep(state, kind);
      walk(node.children, state, base, 'item', fallbackAlt);
      flushStep(state, 'item');
      continue;
    }

    if (name === 'ul' || name === 'ol') {
      flushStep(state, kind);
      walk(node.children, state, base, kind, fallbackAlt);
      continue;
    }

    if (name === 'img') {
      flushStep(state, kind);
      const src = resolveUrl(node.attrs.src, base);

      if (src) {
        const alt = normalizeText(node.attrs.alt ?? '') || fallbackAlt;

        state.steps.push({
          kind: 'imagem',
          tokens: [{ type: 'image', value: src, alt }],
        });
      }

      continue;
    }

    if (name === 'a') {
      const href = resolveUrl(node.attrs.href, base);
      const previous = state.link;

      state.link = { href, text: '' };
      walk(node.children, state, base, kind, fallbackAlt);

      const link = state.link;
      state.link = previous;

      const text = link.text.replace(/\s+/g, ' ').trim();

      if (text) {
        if (href) {
          state.buffer.push({ type: 'link', value: text, href });
        } else {
          state.buffer.push({ type: 'text', value: text });
        }
      }

      continue;
    }

    if (name === 'strong' || name === 'b') {
      const previous = state.strong;
      state.strong = true;
      walk(node.children, state, base, kind, fallbackAlt);
      state.strong = previous;
      continue;
    }

    if (name === 'code' || name === 'kbd' || name === 'samp') {
      const previous = state.key;
      state.key = true;
      walk(node.children, state, base, kind, fallbackAlt);
      state.key = previous;
      continue;
    }

    if (name === 'br') {
      // Quebra de linha vira espaço (sem isso, `</strong><br>Texto` fica colado).
      if (state.link) {
        state.link.text += ' ';
      } else {
        state.buffer.push({ type: 'text', value: ' ' });
      }

      continue;
    }

    if (name === 'hr') {
      flushStep(state, kind);
      continue;
    }

    if (name === 'tr') {
      flushStep(state, kind);
      walk(node.children, state, base, 'paragrafo', fallbackAlt);
      flushStep(state, 'paragrafo');
      continue;
    }

    if (name === 'td' || name === 'th') {
      walk(node.children, state, base, 'paragrafo', fallbackAlt);
      appendText(state, ' · ');
      continue;
    }

    if (name === 'div' && isCallout(node)) {
      flushStep(state, kind);
      const callout = calloutKind(node);
      walk(node.children, state, base, callout, fallbackAlt);
      flushStep(state, callout);
      continue;
    }

    walk(node.children, state, base, kind, fallbackAlt);
  }
}

/** Extrai o corpo do artigo (módulos richtext do HubSpot). */
function extractBody(html) {
  const modules = [];
  const marker = /<div[^>]*data-hs-cos-type="inline_richtext_field"[^>]*>/gi;
  let match;

  while ((match = marker.exec(html)) !== null) {
    const block = extractBalanced(html, match.index);
    modules.push(block);
    marker.lastIndex = match.index + block.length;
  }

  return modules.join('\n');
}

/** Encontra o fim de um `<div>` contando o balanceamento das tags. */
function extractBalanced(html, startIndex) {
  const open = /<div\b/gi;
  const close = /<\/div\s*>/gi;

  let depth = 0;
  let index = startIndex;

  while (index < html.length) {
    open.lastIndex = index;
    close.lastIndex = index;

    const nextOpen = open.exec(html);
    const nextClose = close.exec(html);

    if (!nextClose) return html.slice(startIndex);

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      index = nextOpen.index + nextOpen[0].length;
      continue;
    }

    depth -= 1;
    index = nextClose.index + nextClose[0].length;

    if (depth === 0) return html.slice(startIndex, index);
  }

  return html.slice(startIndex);
}

/** Título e descrição do artigo. */
function extractHead(html) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? normalizeText(textContent(parseTree(h1[1]))) : '';

  const meta = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const metaDescription = meta ? normalizeText(meta[1]) : '';

  const h2 = html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  const subtitle = h2 ? normalizeText(textContent(parseTree(h2[1]))) : '';

  return { title, description: subtitle || metaDescription };
}

function textOfTokens(tokens) {
  return tokens
    .map((token) => (token.type === 'image' ? '' : token.value))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converte o HTML do artigo no formato de `LessonContent`. */
function toLessonContent(lesson, html) {
  const { title, description } = extractHead(html);
  const body = extractBody(html);

  if (!body) return null;

  const state = createState();
  const fallbackAlt = title ? `Imagem do artigo ${title}` : 'Imagem do artigo';
  walk(parseTree(stripNoise(body)).children, state, lesson.url_central, 'paragrafo', fallbackAlt);
  flushStep(state, 'paragrafo');
  flushBlock(state);

  const blocks = state.blocks.filter((block) => block.steps.length > 0);

  if (blocks.length === 0) return null;

  const words = blocks
    .flatMap((block) => block.steps)
    .map((step) => textOfTokens(step.tokens))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const firstText = blocks
    .flatMap((block) => block.steps)
    .map((step) => textOfTokens(step.tokens))
    .find((text) => text.length > 0);

  const intro = description || firstText || lesson.titulo;

  return {
    lessonId: lesson.id,
    minutes: Math.max(2, Math.min(30, Math.round(words / WORDS_PER_MINUTE) || 2)),
    intro,
    blocks,
    checks: [],
    sourceUrl: lesson.url_central,
    sourceTitle: title || lesson.titulo,
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'YoogaAcademyContentExtractor/1.0' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function loadHtml(url) {
  const cacheFile = path.join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.html`);

  if (!REFRESH && existsSync(cacheFile)) {
    return { html: await readFile(cacheFile, 'utf8'), cached: true };
  }

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const html = await fetchWithTimeout(url);
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cacheFile, html, 'utf8');
      return { html, cached: false };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  throw lastError;
}

function listLessons() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const lessons = [];

  for (const group of seed.grupos) {
    for (const module of group.modulos) {
      for (const lesson of module.aulas) {
        lessons.push({
          id: lesson.id,
          titulo: lesson.titulo,
          tipo: lesson.tipo,
          url_central: lesson.url_central,
          grupo: group.nome,
          modulo: module.nome,
        });
      }
    }
  }

  return lessons;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);

  return results;
}

async function main() {
  const lessons = listLessons();
  const targets = ONLY
    ? lessons.filter(
        (lesson) =>
          lesson.id.includes(ONLY) || lesson.titulo.toLowerCase().includes(ONLY.toLowerCase()),
      )
    : lessons;

  console.log(`Extraindo ${targets.length} aulas da Central de Ajuda…`);

  const output = [];
  const failures = [];
  let cached = 0;

  await mapWithConcurrency(targets, CONCURRENCY, async (lesson) => {
    try {
      const { html, cached: fromCache } = await loadHtml(lesson.url_central);
      if (fromCache) cached += 1;

      const content = toLessonContent(lesson, html);

      if (!content) {
        failures.push({ id: lesson.id, motivo: 'artigo sem corpo de texto' });
        process.stdout.write('x');
        return;
      }

      output.push(content);
      process.stdout.write('.');
    } catch (error) {
      failures.push({ id: lesson.id, motivo: error.message });
      process.stdout.write('x');
    }
  });

  console.log('');
  console.log(`Conteúdo extraído: ${output.length}/${targets.length} (${cached} do cache)`);

  if (failures.length > 0) {
    console.log(`Falhas (${failures.length}):`);
    for (const failure of failures) console.log(`  - ${failure.id}: ${failure.motivo}`);
  }

  if (ONLY) {
    console.log('Modo --only: o arquivo gerado não foi sobrescrito.');
    console.log(JSON.stringify(output[0] ?? null, null, 2));
    return;
  }

  output.sort((a, b) => a.lessonId.localeCompare(b.lessonId));
  // Minificado de propósito: o arquivo entra no bundle da SPA (~700 kB em vez de ~1,2 MB).
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8');
  console.log(`Arquivo gerado: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
