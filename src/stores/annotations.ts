import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createEmptyAnnotations,
  removeNote as removeNoteOf,
  setNote as setNoteOf,
  toggleFavorite as toggleFavoriteOf,
  type AnnotationsState,
} from '@/domain/annotations';

export const ANNOTATIONS_STORAGE_KEY = 'yooga.academy.annotations';

export interface AnnotationsActions {
  /** Marca a aula como favorita ou desfaz a marca. */
  toggleFavorite(lessonId: string): void;
  /** Salva a nota da aula (texto vazio apaga a nota). */
  setNote(lessonId: string, text: string): void;
  /** Apaga a nota da aula. */
  removeNote(lessonId: string): void;
  /** Limpa favoritos e anotações. */
  resetAnnotations(): void;
}

export type AnnotationsStore = AnnotationsState & AnnotationsActions;

/**
 * Favoritos e anotações do analista (Fase 12).
 *
 * Local-first, como o progresso e a curadoria: ficam no `localStorage` deste
 * navegador e não são enviados para a API.
 */
export const useAnnotationsStore = create<AnnotationsStore>()(
  persist(
    (set) => ({
      ...createEmptyAnnotations(),

      toggleFavorite: (lessonId) => set((state) => toggleFavoriteOf(state, lessonId)),

      setNote: (lessonId, text) => set((state) => setNoteOf(state, lessonId, text)),

      removeNote: (lessonId) => set((state) => removeNoteOf(state, lessonId)),

      resetAnnotations: () => set(createEmptyAnnotations()),
    }),
    {
      name: ANNOTATIONS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): AnnotationsState => ({
        favorites: state.favorites,
        notes: state.notes,
      }),
    },
  ),
);
