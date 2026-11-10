import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createEmptyProgress } from '@/domain/progress';
import { dayKey, levelForXp, nextStreak, passesQuiz, quizXpGain, RULES } from '@/domain/rules';
import type { ActivityEntry, Lesson, ProgressData, QuizResult } from '@/domain/types';

export const PROGRESS_STORAGE_KEY = 'yooga.academy.progress';

export interface LessonCompletion {
  xpGained: number;
  leveledUp: boolean;
}

export interface QuizAttemptInput {
  moduleId: string;
  moduleName: string;
  groupId: string;
  groupName: string;
  correct: number;
  total: number;
  /** Calculado pela tela com `isSealEarned`: todos os quizzes do grupo aprovados. */
  sealEligible?: boolean;
  when?: string;
}

export interface QuizAttemptOutcome {
  xpGained: number;
  sealAwarded: boolean;
  leveledUp: boolean;
}

export interface ProgressActions {
  completeLesson(lesson: Pick<Lesson, 'id' | 'titulo'>, when?: string): LessonCompletion;
  answerCheck(lessonId: string, questionId: string, optionIndex: number): void;
  recordQuizAttempt(input: QuizAttemptInput): QuizAttemptOutcome;
  resetProgress(): void;
}

export type ProgressStore = ProgressData & ProgressActions;

let entrySequence = 0;

function createEntry(text: string, when: string, xp: number): ActivityEntry {
  entrySequence += 1;
  return { id: `entry-${Date.now()}-${entrySequence}`, text, when, xp };
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...createEmptyProgress(),

      completeLesson: (lesson, when = 'agora') => {
        if (get().concluidas[lesson.id]) {
          return { xpGained: 0, leveledUp: false };
        }

        const levelBefore = levelForXp(get().xp);
        const streak = nextStreak(
          { sequencia: get().sequencia, ultimoDiaAtivo: get().ultimoDiaAtivo ?? null },
          dayKey(new Date()),
        );

        set((state) => ({
          concluidas: { ...state.concluidas, [lesson.id]: true },
          xp: state.xp + RULES.lessonXp,
          sequencia: streak.sequencia,
          ultimoDiaAtivo: streak.ultimoDiaAtivo,
          log: [createEntry(`Concluiu ${lesson.titulo}`, when, RULES.lessonXp), ...state.log],
        }));

        return {
          xpGained: RULES.lessonXp,
          leveledUp: levelForXp(get().xp) > levelBefore,
        };
      },

      answerCheck: (lessonId, questionId, optionIndex) => {
        set((state) => ({
          checks: {
            ...state.checks,
            [lessonId]: {
              ...(state.checks[lessonId] ?? {}),
              [questionId]: optionIndex,
            },
          },
        }));
      },

      recordQuizAttempt: ({
        moduleId,
        moduleName,
        groupId,
        groupName,
        correct,
        total,
        sealEligible = false,
        when = 'agora',
      }) => {
        const safeTotal = Math.max(0, total);
        const safeCorrect = Math.min(Math.max(0, correct), safeTotal);
        const previous = get().quiz[moduleId];
        const previousBest = previous?.melhor ?? 0;
        const best = Math.max(safeCorrect, previousBest);
        const approved = passesQuiz(safeCorrect, safeTotal) || previous?.aprovado === true;
        const xpFromAnswers = quizXpGain(safeCorrect, previousBest);
        const sealAwarded = sealEligible && !get().selos[groupId];

        const levelBefore = levelForXp(get().xp);
        const entries: ActivityEntry[] = [];

        if (xpFromAnswers > 0) {
          entries.push(
            createEntry(
              `${approved ? 'Passou' : 'Fez'} o quiz ${moduleName} · ${safeCorrect}/${safeTotal}`,
              when,
              xpFromAnswers,
            ),
          );
        }

        if (sealAwarded) {
          entries.push(createEntry(`Selo ${groupName}`, when, RULES.sealXp));
        }

        const result: QuizResult = { melhor: best, total: safeTotal, aprovado: approved };
        const xpGained = xpFromAnswers + (sealAwarded ? RULES.sealXp : 0);
        const streak = nextStreak(
          { sequencia: get().sequencia, ultimoDiaAtivo: get().ultimoDiaAtivo ?? null },
          dayKey(new Date()),
        );

        set((state) => ({
          quiz: { ...state.quiz, [moduleId]: result },
          selos: sealAwarded ? { ...state.selos, [groupId]: true } : state.selos,
          xp: state.xp + xpGained,
          sequencia: streak.sequencia,
          ultimoDiaAtivo: streak.ultimoDiaAtivo,
          log: entries.length > 0 ? [...entries, ...state.log] : state.log,
        }));

        return {
          xpGained,
          sealAwarded,
          leveledUp: levelForXp(get().xp) > levelBefore,
        };
      },

      resetProgress: () => {
        set(createEmptyProgress());
      },
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): ProgressData => ({
        concluidas: state.concluidas,
        checks: state.checks,
        quiz: state.quiz,
        selos: state.selos,
        xp: state.xp,
        sequencia: state.sequencia,
        ultimoDiaAtivo: state.ultimoDiaAtivo,
        log: state.log,
      }),
    },
  ),
);
