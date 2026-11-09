import rawQuizzes from './quizzes.generated.json';
import { parseGeneratedQuizzes } from './schema';

/**
 * Quizzes dos módulos gerados a partir dos artigos da Central de Ajuda.
 * Arquivo gerado por `npm run content:quizzes` — não editar à mão.
 */
export const generatedQuizzes = parseGeneratedQuizzes(rawQuizzes);
