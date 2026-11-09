import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createEmptyCuration,
  type CurationApproval,
  type CurationDecision,
  type CurationState,
} from '@/domain/curation';

export const CURATION_STORAGE_KEY = 'yooga.academy.curation';

export interface CurationActions {
  /**
   * Registra a decisão do time de conteúdo sobre as perguntas geradas da
   * aula. `aprovado` libera a aula; `ajuste` devolve para a fila com o aviso
   * de que o texto precisa de ajuste.
   */
  reviewLesson(lessonId: string, decision: CurationDecision, by?: string, at?: string): void;
  /** Devolve a aula para a fila de revisão (limpa a decisão). */
  reopenLesson(lessonId: string): void;
  /** Limpa todas as revisões. */
  resetCuration(): void;
}

export type CurationStore = CurationState & CurationActions;

export const useCurationStore = create<CurationStore>()(
  persist(
    (set) => ({
      ...createEmptyCuration(),

      reviewLesson: (lessonId, decision, by, at = new Date().toISOString()) => {
        const approval: CurationApproval = by ? { decision, at, by } : { decision, at };

        set((state) => ({
          approvals: {
            ...state.approvals,
            [lessonId]: approval,
          },
        }));
      },

      reopenLesson: (lessonId) => {
        set((state) => {
          if (!state.approvals[lessonId]) return state;

          const approvals = { ...state.approvals };
          delete approvals[lessonId];

          return { approvals };
        });
      },

      resetCuration: () => set(createEmptyCuration()),
    }),
    {
      name: CURATION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): CurationState => ({ approvals: state.approvals }),
    },
  ),
);
