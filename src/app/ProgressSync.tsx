import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { syncProgressFromRemote, syncProgressToRemote } from '@/services/progressSync';

const PUSH_DEBOUNCE_MS = 1200;

function progressSignature(state: ReturnType<typeof useProgressStore.getState>): string {
  return JSON.stringify({
    concluidas: state.concluidas,
    checks: state.checks,
    quiz: state.quiz,
    selos: state.selos,
    xp: state.xp,
    sequencia: state.sequencia,
    ultimoDiaAtivo: state.ultimoDiaAtivo,
    log: state.log,
  });
}

/**
 * Mantém o progresso local e o remoto em sincronia quando há sessão ativa.
 * Roda junto do shell: puxa ao entrar e envia (com debounce) a cada mudança.
 */
export function ProgressSync() {
  const status = useAuthStore((state) => state.status);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (status !== 'autenticado' || !token) return;

    void syncProgressFromRemote(token);
  }, [status, token]);

  useEffect(() => {
    if (status !== 'autenticado' || !token) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = useProgressStore.subscribe((state, previous) => {
      if (progressSignature(state) === progressSignature(previous)) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void syncProgressToRemote(token);
      }, PUSH_DEBOUNCE_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [status, token]);

  return null;
}
