import { z } from 'zod';
import type { CheckQuestion, LessonContent, Quiz, QuizAiRewrite } from './types';

const inlineTokenSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({ type: z.literal('strong'), value: z.string() }),
  z.object({ type: z.literal('key'), value: z.string() }),
  z.object({ type: z.literal('link'), value: z.string(), href: z.string() }),
  z.object({ type: z.literal('image'), value: z.string(), alt: z.string() }),
]);

const contentStepSchema = z.object({
  kind: z.enum(['texto', 'paragrafo', 'item', 'imagem', 'nota', 'dica', 'aviso']).optional(),
  tokens: z.array(inlineTokenSchema).min(1),
});

const contentBlockSchema = z.object({
  title: z.string(),
  steps: z.array(contentStepSchema).min(1),
});

export const checkQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().nonnegative(),
  success: z.string().min(1),
  anchor: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
});

export const generatedContentSchema = z.array(
  z.object({
    lessonId: z.string().min(1),
    minutes: z.number().int().positive(),
    intro: z.string().min(1),
    blocks: z.array(contentBlockSchema).min(1),
    checks: z.array(checkQuestionSchema),
    sourceUrl: z.url().optional(),
    sourceTitle: z.string().optional(),
  }),
);

/** Mapa `lessonId` → perguntas geradas (`src/content/checks.generated.json`). */
export const generatedChecksSchema = z.record(z.string(), z.array(checkQuestionSchema).min(1));

/**
 * Mapa `lessonId` → perguntas reescritas por IA
 * (`src/content/checks.ai.generated.json`).
 *
 * A camada de IA só troca o **enunciado** e o **feedback** — as alternativas,
 * o índice da resposta, a âncora e a seção continuam sendo os do gerador
 * determinístico, que é o que garante a verificabilidade automática.
 */
export const aiChecksSchema = z.record(z.string(), z.array(checkQuestionSchema).min(1));

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  scene: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(3),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string().min(1),
  review: z.string().min(1),
  lessonLabel: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  type: z.enum(['sequencia', 'reconhecimento', 'ordem']).optional(),
  anchor: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
});

export const generatedQuizSchema = z.object({
  moduleId: z.string().min(1),
  questions: z.array(quizQuestionSchema).min(1),
});

/** Lista de quizzes gerados (`src/content/quizzes.generated.json`). */
export const generatedQuizzesSchema = z.array(generatedQuizSchema);

/**
 * Mapa `moduleId` → quizzes reescritos por IA
 * (`src/content/quizzes.ai.generated.json`).
 *
 * A camada de IA só troca os **textos** — situação, enunciado, feedback e
 * rótulo de revisão. As alternativas, o índice da resposta, o tipo, a âncora
 * e a seção continuam sendo os do gerador determinístico, que é o que garante
 * a verificabilidade automática (`src/content/quiz.test.ts`).
 */
export const aiQuizSchema = z.record(
  z.string(),
  z.array(
    z.object({
      id: z.string().min(1),
      scene: z.string().min(1),
      prompt: z.string().min(1),
      explanation: z.string().min(1),
      review: z.string().min(1),
    }),
  ),
);

/** Valida o conteúdo extraído da Central; falha rápido se o arquivo divergir. */
export function parseGeneratedContent(input: unknown): readonly LessonContent[] {
  return generatedContentSchema.parse(input);
}

/** Mapa `lessonId` → perguntas geradas, já validado. */
export function parseChecksByLesson(input: unknown): ReadonlyMap<string, readonly CheckQuestion[]> {
  const parsed = generatedChecksSchema.parse(input);

  return new Map(
    Object.entries(parsed).map(([lessonId, checks]) => [lessonId, checks as CheckQuestion[]]),
  );
}

/** Mapa `lessonId` → perguntas reescritas por IA, já validado. */
export function parseAiChecksByLesson(
  input: unknown,
): ReadonlyMap<string, readonly CheckQuestion[]> {
  const parsed = aiChecksSchema.parse(input);

  return new Map(
    Object.entries(parsed).map(([lessonId, checks]) => [lessonId, checks as CheckQuestion[]]),
  );
}

/** Quizzes gerados, já validados. */
export function parseGeneratedQuizzes(input: unknown): readonly Quiz[] {
  return generatedQuizzesSchema.parse(input);
}

/** Mapa `moduleId` → quizzes reescritos por IA, já validado. */
export function parseAiQuizzes(input: unknown): ReadonlyMap<string, readonly QuizAiRewrite[]> {
  const parsed = aiQuizSchema.parse(input);

  return new Map(
    Object.entries(parsed).map(([moduleId, questions]) => [moduleId, questions as QuizAiRewrite[]]),
  );
}
