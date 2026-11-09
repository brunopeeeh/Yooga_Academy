/**
 * Busca sem acento, herdada do protótipo (`sem`). Normaliza para NFD e remove
 * os sinais diacríticos, preservando o comprimento do texto para permitir
 * destacar o trecho original.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export interface HighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

/** Divide o texto em trechos para destacar a primeira ocorrência da busca. */
export function highlightText(text: string, query: string): readonly HighlightSegment[] {
  const term = normalizeText(query.trim());
  if (!term) return [{ text, match: false }];

  const normalized = normalizeText(text);
  if (normalized.length !== text.length) return [{ text, match: false }];

  const index = normalized.indexOf(term);
  if (index < 0) return [{ text, match: false }];

  const end = index + term.length;
  const segments: HighlightSegment[] = [];

  if (index > 0) segments.push({ text: text.slice(0, index), match: false });
  segments.push({ text: text.slice(index, end), match: true });
  if (end < text.length) segments.push({ text: text.slice(end), match: false });

  return segments;
}

/**
 * Recorta o trecho ao redor da primeira ocorrência do termo e devolve os
 * segmentos prontos para o `<mark>`.
 *
 * O corte respeita as palavras (não quebra no meio) e começa na frase
 * anterior quando ela estiver perto — o resultado parece um trecho de texto,
 * não um recorte arbitrário.
 */
export function excerptText(text: string, query: string, radius = 70): readonly HighlightSegment[] {
  const term = normalizeText(query.trim());

  if (!term) return [];

  const normalized = normalizeText(text);

  // `normalizeText` preserva o comprimento, exceto em casos raros de Unicode.
  if (normalized.length !== text.length) return [];

  const index = normalized.indexOf(term);

  if (index < 0) return [];

  const matchEnd = index + term.length;
  let start = Math.max(0, index - radius);

  // Se o termo começa uma frase, mostra a frase inteira desde o início.
  const sentence = normalized.slice(start, index).match(/[.!?]\s[^\s]*$/);

  if (sentence) start = index - sentence[0].length;

  // Não corta palavras pela metade.
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space === -1 || space >= index ? start : space + 1;
  }

  let end = Math.min(text.length, matchEnd + radius);

  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    end = space === -1 || space <= matchEnd ? end : space;
  }

  const segments: HighlightSegment[] = [];

  if (start > 0) segments.push({ text: '…', match: false });
  if (start < index) segments.push({ text: text.slice(start, index), match: false });
  segments.push({ text: text.slice(index, matchEnd), match: true });
  if (matchEnd < end) segments.push({ text: text.slice(matchEnd, end), match: false });
  if (end < text.length) segments.push({ text: '…', match: false });

  return segments;
}
