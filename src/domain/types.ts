export type LessonKind = 'essencial' | 'consulta';

export interface Lesson {
  readonly id: string;
  readonly ordem: number;
  readonly titulo: string;
  readonly tipo: LessonKind;
  readonly url_central: string;
  readonly origem: string;
}

export interface Module {
  readonly id: string;
  readonly ordem: number;
  readonly nome: string;
  readonly observacao: string;
  readonly tem_quiz: boolean;
  readonly aulas: readonly Lesson[];
}

export interface Group {
  readonly id: string;
  readonly ordem: number;
  readonly nome: string;
  readonly descricao: string;
  readonly origem: string;
  readonly modulos: readonly Module[];
}

export interface Catalog {
  readonly versao: string;
  readonly fonte: string;
  readonly grupos: readonly Group[];
}

export type GroupStatus = 'done' | 'doing' | 'next' | 'todo';

export interface QuizResult {
  /** Melhor número de acertos entre as tentativas. */
  melhor: number;
  /** Total de perguntas da última tentativa. */
  total: number;
  /** Aprovado em qualquer tentativa. */
  aprovado: boolean;
}

export interface ActivityEntry {
  readonly id: string;
  readonly text: string;
  readonly when: string;
  readonly xp: number;
}

export interface ProgressData {
  /** Aulas concluídas (apenas essenciais contam para progresso). */
  concluidas: Record<string, true>;
  /** Respostas dos quick checks: lessonId → questionId → índice da opção. */
  checks: Record<string, Record<string, number>>;
  /** Resultado consolidado por módulo de quiz. */
  quiz: Record<string, QuizResult>;
  /** Selos conquistados por grupo. */
  selos: Record<string, true>;
  xp: number;
  sequencia: number;
  log: ActivityEntry[];
}

export type NextItem =
  | {
      readonly kind: 'lesson';
      readonly group: Group;
      readonly module: Module;
      readonly lesson: Lesson;
    }
  | { readonly kind: 'quiz'; readonly group: Group; readonly module: Module };
