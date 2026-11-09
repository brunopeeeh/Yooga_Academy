import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'danger';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: ToastMessage[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

export const TOAST_DURATION_MS = 3200;

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = 'default') => {
    nextId += 1;
    set((state) => ({ toasts: [...state.toasts, { id: nextId, message, tone }] }));
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
  },
  clear: () => {
    set({ toasts: [] });
  },
}));

/** Pode ser chamado de qualquer lugar, inclusive fora de componentes. */
export function toast(message: string, tone: ToastTone = 'default'): void {
  useToastStore.getState().push(message, tone);
}
