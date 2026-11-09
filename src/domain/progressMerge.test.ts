import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from './progress';
import { mergeProgress } from './progressMerge';

describe('mergeProgress', () => {
  it('une as aulas concluídas sem perder as locais', () => {
    const local = createEmptyProgress();
    local.concluidas = { 'aula-local': true };

    const remote = createEmptyProgress();
    remote.concluidas = { 'aula-remota': true };

    const merged = mergeProgress(local, remote);

    expect(merged.concluidas).toEqual({ 'aula-remota': true, 'aula-local': true });
  });

  it('mantém a melhor nota dos quizzes e a aprovação é sticky', () => {
    const local = createEmptyProgress();
    local.quiz = { modulo: { melhor: 3, total: 6, aprovado: false } };

    const remote = createEmptyProgress();
    remote.quiz = { modulo: { melhor: 5, total: 6, aprovado: true } };

    const merged = mergeProgress(local, remote);

    expect(merged.quiz.modulo).toEqual({ melhor: 5, total: 6, aprovado: true });
  });

  it('não perde a aprovação já conquistada quando o outro lado reprovou', () => {
    const local = createEmptyProgress();
    local.quiz = { modulo: { melhor: 6, total: 6, aprovado: true } };

    const remote = createEmptyProgress();
    remote.quiz = { modulo: { melhor: 2, total: 6, aprovado: false } };

    expect(mergeProgress(local, remote).quiz.modulo?.aprovado).toBe(true);
  });

  it('une selos, fica com o maior XP e junta o histórico sem repetir', () => {
    const local = createEmptyProgress();
    local.selos = { 'primeiros-passos': true };
    local.xp = 40;
    local.log = [{ id: 'e1', text: 'Aula', when: 'hoje', xp: 10 }];

    const remote = createEmptyProgress();
    remote.selos = { delivery: true };
    remote.xp = 80;
    remote.log = [
      { id: 'e1', text: 'Aula', when: 'hoje', xp: 10 },
      { id: 'e2', text: 'Selo', when: 'ontem', xp: 30 },
    ];

    const merged = mergeProgress(local, remote);

    expect(merged.selos).toEqual({ delivery: true, 'primeiros-passos': true });
    expect(merged.xp).toBe(80);
    expect(merged.log.map((entry) => entry.id)).toEqual(['e1', 'e2']);
  });
});
