import { excerptText, normalizeText, type HighlightSegment } from './text';

/**
 * Índice do conteúdo das aulas para busca dentro do texto.
 *
 * O índice é carregado sob demanda (a Biblioteca só o baixa quando o usuário
 * digita uma busca), então ele fica em `src/content/searchIndex.ts` — aqui
 * ficam só as regras de busca, puras e testáveis.
 */
export interface ContentIndexEntry {
  /** Texto como o usuário lê (com acentos). */
  readonly text: string;
  /** Mesmo texto sem acentos e em minúsculas, para comparar rápido. */
  readonly normalized: string;
}

export type ContentIndex = ReadonlyMap<string, ContentIndexEntry>;

export interface ContentMatch {
  readonly lessonId: string;
  /** Quantas vezes o termo aparece no texto da aula. */
  readonly occurrences: number;
  /** Trecho ao redor da primeira ocorrência, pronto para destacar. */
  readonly segments: readonly HighlightSegment[];
}

/** Conta quantas vezes o termo aparece no texto. */
export function countMatches(haystack: string, needle: string): number {
  if (!needle) return 0;

  let count = 0;
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }

  return count;
}

/**
 * Aulas cujo texto contém o termo.
 *
 * Ordena pela quantidade de ocorrências (quem mais cita o termo aparece
 * primeiro). A busca ignora acento e caixa.
 */
export function searchContent(index: ContentIndex, query: string): readonly ContentMatch[] {
  const term = normalizeText(query.trim());

  if (!term) return [];

  const matches: ContentMatch[] = [];

  for (const [lessonId, entry] of index) {
    if (!entry.normalized.includes(term)) continue;

    matches.push({
      lessonId,
      occurrences: countMatches(entry.normalized, term),
      segments: excerptText(entry.text, query),
    });
  }

  return matches.sort((a, b) => b.occurrences - a.occurrences);
}
