import rawQuizzes from './quizzes.ai.generated.json';
import { parseAiQuizzes } from './schema';

/**
 * Reescritas por IA dos quizzes dos módulos
 * (`src/content/quizzes.ai.generated.json`).
 *
 * Arquivo gerado por `npm run content:quizzes:ai` — não editar à mão.
 *
 * O arquivo é um **overlay**: guarda só os textos reescritos (situação,
 * enunciado, feedback e rótulo de revisão). As alternativas, o índice da
 * resposta, o tipo da pergunta, a âncora, a seção e o vínculo com a aula
 * **não existem aqui** — eles continuam no gerador determinístico
 * (`npm run content:quizzes`), que é o que mantém a verificabilidade
 * automática (`src/content/quiz.test.ts`).
 *
 * O arquivo começa vazio (`{}`) e só ganha entradas quando o script roda
 * contra a Edge Function `rewrite-quizzes`.
 */
export const aiQuizRewrites = parseAiQuizzes(rawQuizzes);
