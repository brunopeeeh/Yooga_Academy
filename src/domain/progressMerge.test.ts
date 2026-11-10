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

  it('a sequência vem do lado com o dia de atividade mais recente', () => {
    const local = createEmptyProgress();
    local.sequencia = 2;
    local.ultimoDiaAtivo = '2026-11-09';

    const remote = createEmptyProgress();
    remote.sequencia = 5;
    remote.ultimoDiaAtivo = '2026-11-07';

    // o remoto tem mais dias, mas parou há mais tempo — a contagem dele
    // já estaria invalidada hoje
    expect(mergeProgress(local, remote).sequencia).toBe(2);
    expect(mergeProgress(local, remote).ultimoDiaAtivo).toBe('2026-11-09');

    // trocando os lados, o resultado é o mesmo
    expect(mergeProgress(remote, local).sequencia).toBe(2);
    expect(mergeProgress(remote, local).ultimoDiaAtivo).toBe('2026-11-09');
  });

  it('dia igual dos dois lados fica com a maior sequência', () => {
    const local = createEmptyProgress();
    local.sequencia = 3;
    local.ultimoDiaAtivo = '2026-11-10';

    const remote = createEmptyProgress();
    remote.sequencia = 7;
    remote.ultimoDiaAtivo = '2026-11-10';

    expect(mergeProgress(local, remote).sequencia).toBe(7);
    expect(mergeProgress(local, remote).ultimoDiaAtivo).toBe('2026-11-10');
  });

  it('lado sem data de atividade não decide a sequência', () => {
    const local = createEmptyProgress();

    const remote = createEmptyProgress();
    remote.sequencia = 4;
    remote.ultimoDiaAtivo = '2026-11-08';

    expect(mergeProgress(local, remote).sequencia).toBe(4);
    expect(mergeProgress(local, remote).ultimoDiaAtivo).toBe('2026-11-08');
    expect(mergeProgress(remote, local).ultimoDiaAtivo).toBe('2026-11-08');
  });
});
