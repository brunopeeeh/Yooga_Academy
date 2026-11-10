import { aiChecks } from './checks.ai.generated';
import { generatedChecks } from './checks';
import { curatedContent } from './curated';
import { generatedContent } from './generated';
import type { LessonContent } from './types';

/**
 * Conteúdo de todas as aulas: o curado tem prioridade sobre o extraído da
 * Central de Ajuda (`npm run content:extract`).
 *
 * As perguntas de conferência seguem a mesma lógica, em três camadas:
 *
 * 1. `curado` — escritas à mão pela equipe de conteúdo (`src/content/curated.ts`);
 * 2. `ia` — enunciados reescritos por uma LLM (`npm run content:checks:ai`),
 *    ainda aguardando curadoria humana;
 * 3. `rascunho` — geradas pelo template determinístico (`npm run content:checks`).
 *
 * As alternativas nunca são reescritas: em todas as camadas elas são trechos
 * literais do artigo, o que torna a resposta verificável automaticamente.
 */
export const lessonsContent: readonly LessonContent[] = [
  ...curatedContent,
  ...generatedContent
    .filter((content) => !curatedContent.some((curated) => curated.lessonId === content.lessonId))
    .map((content) => {
      const ai = aiChecks.get(content.lessonId);

      if (ai && ai.length > 0) {
        return { ...content, checks: ai, checksOrigin: 'ia' as const };
      }

      const generated = generatedChecks.get(content.lessonId);

      if (!generated || generated.length === 0) return content;

      return { ...content, checks: generated, checksOrigin: 'rascunho' as const };
    }),
];

export const lessonContentById: ReadonlyMap<string, LessonContent> = new Map(
  lessonsContent.map((content) => [content.lessonId, content]),
);

export function getLessonContent(lessonId: string): LessonContent | undefined {
  return lessonContentById.get(lessonId);
}

export { curatedContent };
