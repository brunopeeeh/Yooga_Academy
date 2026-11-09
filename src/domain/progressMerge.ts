import { createEmptyProgress } from './progress';
import type { ActivityEntry, ProgressData, QuizResult } from './types';

/**
 * Mescla o progresso local (navegador) com o progresso remoto (API).
 *
 * Regras conservadoras — nunca perdem o que já foi conquistado:
 * - aulas: união das concluídas;
 * - quizzes: melhor nota entre as duas, aprovação é "sticky";
 * - selos: união;
 * - XP: o maior dos dois (o servidor recalcula no próximo sync);
 * - histórico: união por `id`, mantendo a ordem mais recente primeiro.
 */
export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  return {
    concluidas: { ...remote.concluidas, ...local.concluidas },
    checks: { ...remote.checks, ...local.checks },
    quiz: mergeQuizzes(local.quiz, remote.quiz),
    selos: { ...remote.selos, ...local.selos },
    xp: Math.max(local.xp, remote.xp),
    sequencia: Math.max(local.sequencia, remote.sequencia),
    log: mergeLogs(local.log, remote.log),
  };
}

function mergeQuizzes(
  local: Record<string, QuizResult>,
  remote: Record<string, QuizResult>,
): Record<string, QuizResult> {
  const merged: Record<string, QuizResult> = { ...remote };

  for (const [moduleId, result] of Object.entries(local)) {
    const other = remote[moduleId];

    if (!other) {
      merged[moduleId] = result;
      continue;
    }

    merged[moduleId] = {
      melhor: Math.max(result.melhor, other.melhor),
      total: Math.max(result.total, other.total),
      aprovado: result.aprovado || other.aprovado,
    };
  }

  return merged;
}

function mergeLogs(local: ActivityEntry[], remote: ActivityEntry[]): ActivityEntry[] {
  const seen = new Set<string>();
  const merged: ActivityEntry[] = [];

  for (const entry of [...local, ...remote]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    merged.push(entry);
  }

  return merged.slice(0, 100);
}

/** Progresso zerado, usado quando o servidor ainda não tem nada. */
export function emptyRemoteProgress(): ProgressData {
  return createEmptyProgress();
}
