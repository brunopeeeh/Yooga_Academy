import rawContent from './lessons.generated.json';
import { parseGeneratedContent } from './schema';
import type { LessonContent } from './types';

/**
 * Conteúdo extraído automaticamente da Central de Ajuda.
 * Arquivo gerado por `npm run content:extract` — não editar à mão.
 */
export const generatedContent: readonly LessonContent[] = parseGeneratedContent(rawContent);
