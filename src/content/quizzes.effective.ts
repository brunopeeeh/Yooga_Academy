import { aiQuizRewrites } from './quizzes.ai.generated';
import { generatedQuizzes } from './quizzes.generated';
import type { Quiz, QuizAiRewrite, QuizQuestion } from './types';

/**
 * Aplica uma reescrita por IA sobre uma pergunta do gerador determinístico.
 *
 * Só os **textos** são trocados. Tudo que sustenta a verificabilidade —
 * alternativas, índice da resposta, tipo, âncora, seção e vínculo com a
 * aula — continua exatamente como o gerador escreveu.
 */
export function applyQuizRewrite(question: QuizQuestion, rewrite: QuizAiRewrite): QuizQuestion {
  return {
    ...question,
    scene: rewrite.scene,
    prompt: rewrite.prompt,
    explanation: rewrite.explanation,
    review: rewrite.review,
  };
}

/**
 * Quizzes gerados dos módulos, já com a camada de IA aplicada.
 *
 * Precedência, como nas perguntas de conferência:
 *
 * 1. `ia` — textos reescritos por uma LLM (`npm run content:quizzes:ai`),
 *    ainda aguardando curadoria humana;
 * 2. `rascunho` — textos gerados pelo template determinístico
 *    (`npm run content:quizzes`).
 *
 * Um módulo só entra como `ia` quando **todas** as suas perguntas foram
 * reescritas: um quiz meio reescrito é meio template, e dizer o contrário
 * esconderia isso do time de conteúdo.
 */
export const effectiveGeneratedQuizzes: readonly Quiz[] = generatedQuizzes.map((quiz) => {
  const overlay = aiQuizRewrites.get(quiz.moduleId);

  if (!overlay || overlay.length === 0) return { ...quiz, origin: 'rascunho' as const };

  const byId = new Map(overlay.map((item) => [item.id, item]));

  const questions = quiz.questions.map((question) => {
    const rewrite = byId.get(question.id);

    return rewrite ? applyQuizRewrite(question, rewrite) : question;
  });

  const complete = questions.every((question) => byId.has(question.id));

  return {
    ...quiz,
    questions,
    origin: complete ? ('ia' as const) : ('rascunho' as const),
  };
});
