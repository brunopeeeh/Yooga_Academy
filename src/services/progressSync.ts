import { fetchRemoteProgress, pushRemoteProgress } from '@/api/progressApi';
import { isApiEnabled } from '@/api/config';
import { mergeProgress } from '@/domain/progressMerge';
import { useProgressStore } from '@/stores/progress';

/**
 * Sincronização do progresso entre o navegador e a API (Fase 8).
 * O app segue local-first: sem API habilitada, nada acontece.
 */

/** Busca o progresso do servidor e mescla com o local (sem perder conquistas). */
export async function syncProgressFromRemote(token: string): Promise<boolean> {
  if (!isApiEnabled()) return false;

  try {
    const remote = await fetchRemoteProgress(token);
    const local = useProgressStore.getState();
    useProgressStore.setState(mergeProgress(local, remote));
    return true;
  } catch {
    return false;
  }
}

/** Envia o progresso local para o servidor. */
export async function syncProgressToRemote(token: string): Promise<boolean> {
  if (!isApiEnabled()) return false;

  try {
    const { concluidas, checks, quiz, selos, xp, sequencia, log } = useProgressStore.getState();
    await pushRemoteProgress(token, { concluidas, checks, quiz, selos, xp, sequencia, log });
    return true;
  } catch {
    return false;
  }
}
