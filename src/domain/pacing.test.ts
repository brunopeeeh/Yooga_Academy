import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_COHORT_PLAN,
  getWeekPacingStatus,
  loadCohortPlan,
  PACING_STORAGE_KEY,
  saveCohortPlan,
} from './pacing';

describe('domain/pacing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('carrega o plano default quando o localStorage está vazio', () => {
    const plan = loadCohortPlan();
    expect(plan.id).toBe('turma-2026.11');
    expect(plan.weeks).toHaveLength(4);
    expect(plan.currentWeek).toBe(2);
  });

  it('salva e recupera o plano do localStorage', () => {
    const custom = {
      ...DEFAULT_COHORT_PLAN,
      name: 'Turma Especial Suporte',
      currentWeek: 3,
      leaderMessage: 'Nova mensagem do líder!',
    };
    saveCohortPlan(custom);

    const loaded = loadCohortPlan();
    expect(loaded.name).toBe('Turma Especial Suporte');
    expect(loaded.currentWeek).toBe(3);
    expect(loaded.leaderMessage).toBe('Nova mensagem do líder!');
  });

  it('calcula o status de conclusão dos grupos da semana corretamente', () => {
    const week = DEFAULT_COHORT_PLAN.weeks[0]!; // ['primeiros-passos', 'pdv-mesa-e-balcao']

    // Nenhum selo
    const s1 = getWeekPacingStatus(week, {});
    expect(s1.completedCount).toBe(0);
    expect(s1.totalCount).toBe(2);
    expect(s1.isCompleted).toBe(false);
    expect(s1.pendingGroupIds).toEqual(['primeiros-passos', 'pdv-mesa-e-balcao']);

    // 1 selo
    const s2 = getWeekPacingStatus(week, { 'primeiros-passos': true });
    expect(s2.completedCount).toBe(1);
    expect(s2.totalCount).toBe(2);
    expect(s2.isCompleted).toBe(false);
    expect(s2.pendingGroupIds).toEqual(['pdv-mesa-e-balcao']);

    // Todos os selos
    const s3 = getWeekPacingStatus(week, {
      'primeiros-passos': true,
      'pdv-mesa-e-balcao': true,
    });
    expect(s3.completedCount).toBe(2);
    expect(s3.totalCount).toBe(2);
    expect(s3.isCompleted).toBe(true);
    expect(s3.pendingGroupIds).toEqual([]);
  });

  it('retorna DEFAULT_COHORT_PLAN quando o JSON no storage está corrompido', () => {
    localStorage.setItem(PACING_STORAGE_KEY, 'invalid-json');
    const plan = loadCohortPlan();
    expect(plan.id).toBe(DEFAULT_COHORT_PLAN.id);
  });
});

