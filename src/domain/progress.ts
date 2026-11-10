import type { ProgressData } from './types';

export function createEmptyProgress(): ProgressData {
  return {
    concluidas: {},
    checks: {},
    quiz: {},
    selos: {},
    xp: 0,
    sequencia: 0,
    ultimoDiaAtivo: null,
    log: [],
  };
}
