import { lessonsContent } from './lessons';
import type { ContentIndex } from '@/domain/search';
import { normalizeText } from '@/domain/text';
import type { LessonContent } from './types';

/**
 * Índice de busca do conteúdo das aulas.
 *
 * Este módulo é carregado **sob demanda** pela Biblioteca (dynamic import),
 * para que o texto das 170 aulas (~700 kB) não pese no carregamento inicial.
 * O mesmo JSON já é usado pela tela de aula, então o navegador baixa uma vez
 * só e reaproveita em cache.
 */

/** Texto corrido da aula: intro, títulos das seções e passos (sem imagens). */
function plainText(content: LessonContent): string {
  const parts: string[] = [content.intro];

  for (const block of content.blocks) {
    if (block.title) parts.push(block.title);

    for (const step of block.steps) {
      if (step.kind === 'imagem') continue;

      const text = step.tokens
        .filter((token) => token.type !== 'image')
        .map((token) => token.value)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text) parts.push(text);
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Mapa `lessonId` → texto da aula, pronto para busca. */
export const contentIndex: ContentIndex = new Map(
  lessonsContent.map((content) => {
    const text = plainText(content);

    return [content.lessonId, { text, normalized: normalizeText(text) }];
  }),
);
