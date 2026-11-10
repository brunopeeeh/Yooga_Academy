import type { CatalogIndex } from './selectors';
import type { Group, Lesson, Module } from './types';

/**
 * Origem das perguntas de conferência de uma aula.
 *
 * - `curado`: escritas à mão pela equipe de conteúdo (`src/content/curated.ts`);
 * - `rascunho`: geradas automaticamente a partir do texto do artigo;
 * - `ia`: enunciados reescritos por uma LLM (`npm run content:checks:ai`).
 */
export type ChecksOrigin = 'curado' | 'rascunho' | 'ia';

/**
 * Origem do quiz de um módulo.
 *
 * - `curado`: escrito à mão pela equipe de conteúdo (`src/content/quizzes.ts`);
 * - `rascunho`: gerado automaticamente a partir dos artigos do módulo;
 * - `ia`: textos reescritos por uma LLM (`npm run content:quizzes:ai`).
 */
export type QuizOrigin = 'curado' | 'rascunho' | 'ia';

/** Decisão do time de conteúdo sobre um conjunto de perguntas geradas. */
export type CurationDecision = 'aprovado' | 'ajuste';

/**
 * Como o app apresenta a origem das perguntas.
 *
 * - `curado`: já são curadas à mão — não dependem de revisão;
 * - `rascunho`: geradas do artigo e ainda aguardando curadoria;
 * - `ia`: enunciados reescritos por uma LLM, aguardando curadoria;
 * - `aprovado`: geradas do artigo, mas revisadas e aprovadas pelo time;
 * - `ajuste`: geradas do artigo e marcadas como precisando de ajuste.
 */
export type ChecksBadge = 'curado' | 'rascunho' | 'ia' | 'aprovado' | 'ajuste';

/** Como o app apresenta a origem do quiz de um módulo. */
export type QuizBadge = 'curado' | 'rascunho' | 'ia' | 'aprovado' | 'ajuste';

/** Registro de uma revisão de curadoria. */
export interface CurationApproval {
  /** Decisão takena pelo time de conteúdo. */
  readonly decision: CurationDecision;
  /** Data/hora da revisão (ISO 8601). */
  readonly at: string;
  /** Quem revisou (nome do usuário logado, quando houver). */
  readonly by?: string;
}

/** Estado da curadoria: o que já foi revisado, por aula e por módulo. */
export interface CurationState {
  /** Revisões das perguntas de conferência, por `lessonId`. */
  readonly approvals: Record<string, CurationApproval>;
  /** Revisões dos quizzes dos módulos, por `moduleId`. */
  readonly quizApprovals: Record<string, CurationApproval>;
}

export function createEmptyCuration(): CurationState {
  return { approvals: {}, quizApprovals: {} };
}

/** A revisão da aula foi aprovada (as perguntas podem ir para produção)? */
export function isApproved(state: CurationState, lessonId: string): boolean {
  return state.approvals[lessonId]?.decision === 'aprovado';
}

/** A revisão do quiz do módulo foi aprovada? */
export function isQuizApproved(state: CurationState, moduleId: string): boolean {
  return state.quizApprovals[moduleId]?.decision === 'aprovado';
}

/**
 * Selo das perguntas de conferência de uma aula.
 *
 * `null` quando a aula não tem perguntas (não há o que curar).
 */
export function checksBadge(
  origin: ChecksOrigin | undefined,
  approval: CurationApproval | undefined,
): ChecksBadge | null {
  if (!origin) return null;
  if (origin === 'curado') return 'curado';
  if (approval?.decision === 'aprovado') return 'aprovado';
  if (approval?.decision === 'ajuste') return 'ajuste';
  return origin;
}

/** Rótulos exibidos no selo das perguntas de conferência. */
export const CHECKS_BADGE_LABEL: Record<ChecksBadge, string> = {
  curado: 'curadas à mão',
  rascunho: 'geradas a partir do artigo',
  ia: 'reformuladas com IA · aguardando revisão',
  aprovado: 'revisadas pelo time de conteúdo',
  ajuste: 'precisam de ajuste',
};

/**
 * Selo do quiz de um módulo.
 *
 * `null` quando o módulo não tem quiz (não há o que curar).
 */
export function quizBadge(
  origin: QuizOrigin | undefined,
  approval: CurationApproval | undefined,
): QuizBadge | null {
  if (!origin) return null;
  if (origin === 'curado') return 'curado';
  if (approval?.decision === 'aprovado') return 'aprovado';
  if (approval?.decision === 'ajuste') return 'ajuste';
  return origin;
}

/** Rótulos exibidos no selo do quiz. */
export const QUIZ_BADGE_LABEL: Record<QuizBadge, string> = {
  curado: 'curado à mão',
  rascunho: 'gerado a partir dos artigos',
  ia: 'reformulado com IA · aguardando revisão',
  aprovado: 'revisado pelo time de conteúdo',
  ajuste: 'precisa de ajuste',
};

/** Dados necessários para montar a fila de curadoria. */
export interface CurationQueueInput {
  readonly index: CatalogIndex;
  /** Quantas perguntas geradas existem por aula (`lessonId` → quantidade). */
  readonly generated: ReadonlyMap<string, number>;
  /** Aulas cujas perguntas foram escritas à mão (não entram na fila). */
  readonly curated: ReadonlySet<string>;
  /** Revisões já registradas das perguntas de conferência. */
  readonly approvals: ReadonlyMap<string, CurationApproval>;
  /** Módulos com quiz gerado (`moduleId` → quantidade de perguntas). */
  readonly generatedQuizzes?: ReadonlyMap<string, number>;
  /** Módulos cujo quiz foi escrito à mão (não entram na fila). */
  readonly curatedQuizModules?: ReadonlySet<string>;
  /** Revisões já registradas dos quizzes, por `moduleId`. */
  readonly quizApprovals?: ReadonlyMap<string, CurationApproval>;
}

/** Uma aula na fila de curadoria. */
export interface CurationLessonItem {
  readonly kind: 'aula';
  readonly lesson: Lesson;
  readonly module: Module;
  readonly group: Group;
  readonly groupPosition: number;
  /** Quantas perguntas foram geradas para a aula. */
  readonly questionCount: number;
  /** Revisão registrada, quando a aula já foi revisada. */
  readonly approval?: CurationApproval;
}

/** O quiz de um módulo na fila de curadoria. */
export interface CurationQuizItem {
  readonly kind: 'quiz';
  readonly module: Module;
  readonly group: Group;
  readonly groupPosition: number;
  /** Quantas perguntas tem o quiz do módulo. */
  readonly questionCount: number;
  /** Revisão registrada, quando o quiz já foi revisado. */
  readonly approval?: CurationApproval;
}

/** Um item da fila: uma aula com perguntas ou o quiz de um módulo. */
export type CurationItem = CurationLessonItem | CurationQuizItem;

/**
 * Fila de curadoria: aulas com perguntas geradas do artigo e os quizzes
 * gerados dos módulos.
 *
 * A ordem é a do catálogo (grupo → módulo → aula → quiz do módulo), para o
 * time de conteúdo trabalhar na mesma sequência da trilha: primeiro as aulas
 * do módulo, depois o quiz que fecha o módulo.
 */
export function curationQueue(input: CurationQueueInput): readonly CurationItem[] {
  const items: CurationItem[] = [];
  const generatedQuizzes = input.generatedQuizzes ?? new Map<string, number>();
  const curatedQuizModules = input.curatedQuizModules ?? new Set<string>();
  const quizApprovals = input.quizApprovals ?? new Map<string, CurationApproval>();

  input.index.groups.forEach((group, groupPosition) => {
    for (const module of group.modulos) {
      for (const lesson of module.aulas) {
        const questionCount = input.generated.get(lesson.id);

        // Sem perguntas geradas ou já curadas à mão: não há o que revisar.
        if (!questionCount || input.curated.has(lesson.id)) continue;

        items.push({
          kind: 'aula',
          lesson,
          module,
          group,
          groupPosition,
          questionCount,
          approval: input.approvals.get(lesson.id),
        });
      }

      const quizCount = generatedQuizzes.get(module.id);

      // Sem quiz gerado ou já curado à mão: não há o que revisar.
      if (!quizCount || curatedQuizModules.has(module.id)) continue;

      items.push({
        kind: 'quiz',
        module,
        group,
        groupPosition,
        questionCount: quizCount,
        approval: quizApprovals.get(module.id),
      });
    }
  });

  return items;
}

/** Resumo da curadoria para os indicadores da tela. */
export interface CurationSummary {
  /** Itens (aulas e quizzes) que ainda aguardam decisão do time. */
  readonly pending: number;
  /** Itens cujas perguntas foram aprovadas. */
  readonly approved: number;
  /** Itens marcados como precisando de ajuste. */
  readonly needsAdjustment: number;
  /** Itens já curados à mão (fora da fila). */
  readonly curated: number;
  /** Total de itens na fila. */
  readonly total: number;
  /** Total de perguntas na fila. */
  readonly questionCount: number;
  /** Percentual da fila já aprovado (0–100). */
  readonly percent: number;
}

export function curationSummary(input: CurationQueueInput): CurationSummary {
  const queue = curationQueue(input);

  let approved = 0;
  let needsAdjustment = 0;
  let questionCount = 0;

  for (const item of queue) {
    questionCount += item.questionCount;

    if (item.approval?.decision === 'aprovado') approved += 1;
    else if (item.approval?.decision === 'ajuste') needsAdjustment += 1;
  }

  let curated = 0;
  const curatedQuizModules = input.curatedQuizModules ?? new Set<string>();

  for (const group of input.index.groups) {
    for (const module of group.modulos) {
      for (const lesson of module.aulas) {
        if (input.curated.has(lesson.id)) curated += 1;
      }

      if (curatedQuizModules.has(module.id)) curated += 1;
    }
  }

  const total = queue.length;

  return {
    pending: total - approved - needsAdjustment,
    approved,
    needsAdjustment,
    curated,
    total,
    questionCount,
    percent: total === 0 ? 100 : Math.round((approved / total) * 100),
  };
}
