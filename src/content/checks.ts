import rawChecks from './checks.generated.json';
import { parseChecksByLesson } from './schema';

/**
 * Perguntas de conferência geradas a partir do texto extraído da Central.
 * Arquivo gerado por `npm run content:checks` — não editar à mão.
 */
export const generatedChecks = parseChecksByLesson(rawChecks);
