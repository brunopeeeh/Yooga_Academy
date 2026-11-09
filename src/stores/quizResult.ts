import { create } from 'zustand';

/**
 * Resultado da última tentativa, usado pela tela de resultado.
 * Vive só na sessão: recarregar a página leva o usuário de volta ao quiz.
 */
export interface QuizAttemptSummary {
  readonly moduleId: string;
  readonly correct: number;
  readonly total: number;
  readonly approved: boolean;
  readonly answers: readonly number[];
  readonly previousBest: number;
  readonly answerXp: number;
  readonly sealXp: number;
  readonly sealAwarded: boolean;
  readonly leveledUp: boolean;
}

interface QuizResultState {
  result: QuizAttemptSummary | null;
  setResult(result: QuizAttemptSummary): void;
  clearResult(): void;
}

export const useQuizResultStore = create<QuizResultState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));
