import type { CatalogIndex } from './selectors';
import { essentialsOf, quizModulesOfGroup } from './selectors';
import type { Group, GroupStatus, Module, NextItem, ProgressData } from './types';

export const RULES = {
  /** XP por aula essencial concluída. */
  lessonXp: 10,
  /** XP por acerto no quiz. */
  correctAnswerXp: 5,
  /** XP ao conquistar um selo de grupo. */
  sealXp: 30,
  /** Percentual mínimo de acertos para aprovar um quiz. */
  approvalRate: 0.7,
  /** XP necessário para subir um nível. */
  levelXp: 250,
} as const;

export const LEVELS = ['Aprendiz', 'Praticante', 'Analista', 'Referência', 'Especialista'] as const;

export type LevelName = (typeof LEVELS)[number];

export const MAX_LEVEL_INDEX = LEVELS.length - 1;

export interface LevelProgress {
  level: number;
  name: LevelName;
  currentXp: number;
  nextXp: number;
  percent: number;
  isMax: boolean;
}

export function levelForXp(xp: number): number {
  return Math.min(Math.floor(Math.max(0, xp) / RULES.levelXp), MAX_LEVEL_INDEX);
}

export function levelProgress(xp: number): LevelProgress {
  const currentXp = Math.max(0, Math.floor(xp));
  const level = levelForXp(currentXp);

  if (level >= MAX_LEVEL_INDEX) {
    return {
      level,
      name: LEVELS[level],
      currentXp,
      nextXp: currentXp,
      percent: 100,
      isMax: true,
    };
  }

  const baseXp = level * RULES.levelXp;
  const nextXp = (level + 1) * RULES.levelXp;
  const percent = Math.round(((currentXp - baseXp) / RULES.levelXp) * 100);

  return {
    level,
    name: LEVELS[level],
    currentXp,
    nextXp,
    percent: Math.min(100, Math.max(0, percent)),
    isMax: false,
  };
}

export function lessonComplete(progress: ProgressData, lessonId: string): boolean {
  return progress.concluidas[lessonId] === true;
}

export function essentialDoneCount(
  index: CatalogIndex,
  module: Module,
  progress: ProgressData,
): number {
  return essentialsOf(index, module).filter((lesson) => lessonComplete(progress, lesson.id)).length;
}

export function groupEssentialDone(
  index: CatalogIndex,
  group: Group,
  progress: ProgressData,
): number {
  return group.modulos.reduce(
    (total, module) => total + essentialDoneCount(index, module, progress),
    0,
  );
}

export function essentialDoneTotal(index: CatalogIndex, progress: ProgressData): number {
  return index.groups.reduce(
    (total, group) => total + groupEssentialDone(index, group, progress),
    0,
  );
}

export function approvedQuizCount(
  index: CatalogIndex,
  group: Group,
  progress: ProgressData,
): number {
  return quizModulesOfGroup(index, group).filter(
    (module) => progress.quiz[module.id]?.aprovado === true,
  ).length;
}

export function isQuizUnlocked(module: Module, progress: ProgressData): boolean {
  if (!module.tem_quiz) return false;
  return module.aulas
    .filter((lesson) => lesson.tipo === 'essencial')
    .every((lesson) => lessonComplete(progress, lesson.id));
}

export function passesQuiz(correct: number, total: number): boolean {
  return total > 0 && correct / total >= RULES.approvalRate;
}

export function quizPassScore(total: number): number {
  return Math.ceil(total * RULES.approvalRate);
}

export function quizXpGain(correct: number, previousBest: number): number {
  return Math.max(0, correct - previousBest) * RULES.correctAnswerXp;
}

/** Chave local do dia (`YYYY-MM-DD`), base da contagem da sequência. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** A chave do dia anterior à chave dada (sem cair em armações de fuso). */
export function previousDayKey(today: string): string {
  const [year, month, day] = today.split('-').map((part) => Number(part));
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

/**
 * Contagem da sequência de dias com atividade.
 *
 * Atividade no mesmo dia não altera a contagem; um dia de intervalo soma +1;
 * mais de um dia sem atividade recomeça em 1. Aula concluída e tentativa de
 * quiz (mesmo sem XP novo) contam como atividade.
 */
export function nextStreak(
  current: Pick<ProgressData, 'sequencia' | 'ultimoDiaAtivo'>,
  today: string,
): { sequencia: number; ultimoDiaAtivo: string } {
  if (current.ultimoDiaAtivo === today) {
    return { sequencia: Math.max(1, current.sequencia), ultimoDiaAtivo: today };
  }

  if (current.ultimoDiaAtivo === previousDayKey(today)) {
    return { sequencia: current.sequencia + 1, ultimoDiaAtivo: today };
  }

  return { sequencia: 1, ultimoDiaAtivo: today };
}

export function isSealEarned(index: CatalogIndex, group: Group, progress: ProgressData): boolean {
  const quizModules = quizModulesOfGroup(index, group);
  return (
    quizModules.length > 0 &&
    quizModules.every((module) => progress.quiz[module.id]?.aprovado === true)
  );
}

export function groupStatus(
  index: CatalogIndex,
  group: Group,
  progress: ProgressData,
): GroupStatus {
  if (progress.selos[group.id]) return 'done';

  const activity =
    groupEssentialDone(index, group, progress) + approvedQuizCount(index, group, progress);
  if (activity > 0) return 'doing';

  const position = index.positionOfGroup.get(group.id) ?? 0;
  const previous = index.groups[position - 1];

  if (
    previous &&
    (groupStatus(index, previous, progress) === 'done' ||
      groupStatus(index, previous, progress) === 'doing')
  ) {
    return 'next';
  }

  return 'todo';
}

/**
 * Primeira aula essencial pendente e, depois dela, o primeiro quiz pendente.
 * Ao final devolve `null` (onboarding concluído).
 */
export function resolveNextItem(index: CatalogIndex, progress: ProgressData): NextItem | null {
  for (const group of index.groups) {
    for (const module of group.modulos) {
      for (const lesson of essentialsOf(index, module)) {
        if (!lessonComplete(progress, lesson.id)) {
          return { kind: 'lesson', group, module, lesson };
        }
      }

      if (module.tem_quiz && progress.quiz[module.id]?.aprovado !== true) {
        return { kind: 'quiz', group, module };
      }
    }
  }

  return null;
}
