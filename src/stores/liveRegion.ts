import { create } from 'zustand';

interface LiveRegionStore {
  message: string;
  announce: (message: string) => void;
  clear: () => void;
}

export const useLiveRegionStore = create<LiveRegionStore>((set) => ({
  message: '',
  announce: (message) => set({ message }),
  clear: () => set({ message: '' }),
}));

/** Anuncia uma mudança para leitores de tela sem tirar o foco do usuário. */
export function announce(message: string): void {
  useLiveRegionStore.getState().announce(message);
}
