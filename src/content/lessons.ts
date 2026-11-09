import { generatedChecks } from './checks';
import { curatedContent } from './curated';
import { generatedContent } from './generated';
import type { LessonContent } from './types';

/**
 * Conteúdo de todas as aulas: o curado tem prioridade sobre o extraído da
 * Central de Ajuda (`npm run content:extract`).
 *
 * As aulas sem curadoria manual recebem as perguntas de conferência geradas
 * automaticamente a partir do artigo (`npm run content:checks`), marcadas como
 * `rascunho` para a equipe de conteúdo revisar (tela de curadoria).
 */
export const lessonsContent: readonly LessonContent[] = [
  ...curatedContent,
  ...generatedContent
    .filter((content) => !curatedContent.some((curated) => curated.lessonId === content.lessonId))
    .map((content) => {
      const checks = generatedChecks.get(content.lessonId);

      if (!checks || checks.length === 0) return content;

      return { ...content, checks, checksOrigin: 'rascunho' as const };
    }),
];

export const lessonContentById: ReadonlyMap<string, LessonContent> = new Map(
  lessonsContent.map((content) => [content.lessonId, content]),
);

export function getLessonContent(lessonId: string): LessonContent | undefined {
  return lessonContentById.get(lessonId);
}

export { curatedContent };
