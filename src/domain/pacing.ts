export interface WeekPacingGoal {
  readonly weekNumber: number;
  readonly title: string;
  readonly groupIds: readonly string[];
  readonly description: string;
}

export interface CohortPlan {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly targetDate: string;
  readonly currentWeek: number;
  readonly leaderMessage: string;
  readonly weeks: readonly WeekPacingGoal[];
}

export const DEFAULT_COHORT_PLAN: CohortPlan = {
  id: 'turma-2026.11',
  name: 'Turma Onboarding 2026.11',
  startDate: '2026-11-01',
  targetDate: '2026-11-30',
  currentWeek: 2,
  leaderMessage: 'Foco total no domínio das configurações de balcão e impressoras nesta semana!',
  weeks: [
    {
      weekNumber: 1,
      title: 'Fundamentos & Frente de Caixa',
      groupIds: ['primeiros-passos', 'pdv-mesa-e-balcao'],
      description: 'Primeiros passos no sistema e operação de PDV (Mesa e balcão).',
    },
    {
      weekNumber: 2,
      title: 'Hardware & Delivery',
      groupIds: ['balancas-e-impressoras', 'delivery'],
      description: 'Configuração de impressoras, balanças e módulo de delivery.',
    },
    {
      weekNumber: 3,
      title: 'Canais & Conformidade Fiscal',
      groupIds: ['integracoes', 'fiscal'],
      description: 'Integrações com marketplaces e emissão de notas fiscais.',
    },
    {
      weekNumber: 4,
      title: 'Gestão, Planos & Graduação',
      groupIds: ['painel-de-relatorios', 'planos-e-precos'],
      description: 'Relatórios gerenciais, regras comerciais e Quiz Final.',
    },
  ],
};

export const PACING_STORAGE_KEY = 'yooga.academy.cohort_plan';

export function loadCohortPlan(): CohortPlan {
  try {
    const raw = localStorage.getItem(PACING_STORAGE_KEY);
    if (!raw) return DEFAULT_COHORT_PLAN;
    const parsed = JSON.parse(raw) as CohortPlan;
    if (parsed && Array.isArray(parsed.weeks) && parsed.weeks.length > 0) {
      return parsed;
    }
    return DEFAULT_COHORT_PLAN;
  } catch {
    return DEFAULT_COHORT_PLAN;
  }
}

export function saveCohortPlan(plan: CohortPlan): void {
  try {
    localStorage.setItem(PACING_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // ignorado em ambientes restritos
  }
}

export function getWeekPacingStatus(
  week: WeekPacingGoal,
  progressSelos: Record<string, boolean>,
): {
  readonly completedCount: number;
  readonly totalCount: number;
  readonly isCompleted: boolean;
  readonly pendingGroupIds: readonly string[];
} {
  const pendingGroupIds = week.groupIds.filter((gid) => progressSelos[gid] !== true);
  const completedCount = week.groupIds.length - pendingGroupIds.length;
  const totalCount = week.groupIds.length;
  const isCompleted = pendingGroupIds.length === 0;

  return {
    completedCount,
    totalCount,
    isCompleted,
    pendingGroupIds,
  };
}

