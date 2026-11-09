/**
 * Modelo tipado do conteúdo migrado da Central de Ajuda.
 * O protótipo guardava HTML cru (`<kbd>`, `<b>`) dentro de strings; aqui os
 * trechos viram tokens para renderização segura e testável.
 */
export type InlineToken =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'strong'; readonly value: string }
  | { readonly type: 'key'; readonly value: string }
  | { readonly type: 'link'; readonly value: string; readonly href: string }
  | { readonly type: 'image'; readonly value: string; readonly alt: string };

/**
 * Como o passo deve ser renderizado:
 * - `texto`: passo numerado (conteúdo curado à mão);
 * - `paragrafo`: parágrafo corrido (artigo da Central);
 * - `item`: item de lista;
 * - `imagem`: figura;
 * - `nota` / `dica` / `aviso`: caixa de destaque da Central.
 */
export type ContentStepKind = 'texto' | 'paragrafo' | 'item' | 'imagem' | 'nota' | 'dica' | 'aviso';

export interface ContentStep {
  readonly tokens: readonly InlineToken[];
  /** Ausente = `texto` (passo numerado). */
  readonly kind?: ContentStepKind;
}

export interface ContentBlock {
  readonly title: string;
  readonly steps: readonly ContentStep[];
}

export interface CheckQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly success: string;
}

export interface LessonContent {
  readonly lessonId: string;
  readonly minutes: number;
  readonly intro: string;
  readonly blocks: readonly ContentBlock[];
  readonly warning?: readonly InlineToken[];
  /** Perguntas de conferência: não valem nota, mas liberam a conclusão da aula. */
  readonly checks: readonly CheckQuestion[];
  /** `rascunho` = perguntas geradas automaticamente a partir do artigo. */
  readonly checksOrigin?: 'curado' | 'rascunho';
  /** Artigo de origem na Central de Ajuda (conteúdo extraído automaticamente). */
  readonly sourceUrl?: string;
  /** Título do artigo na Central de Ajuda. */
  readonly sourceTitle?: string;
}

export interface QuizQuestion {
  readonly id: string;
  readonly scene: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly review: string;
  readonly lessonLabel: string;
  /** Aula relacionada, quando o conteúdo já foi migrado. */
  readonly lessonId?: string;
}

export interface Quiz {
  readonly moduleId: string;
  readonly questions: readonly QuizQuestion[];
  /** `rascunho` = quiz gerado automaticamente a partir dos artigos do módulo. */
  readonly origin?: 'curado' | 'rascunho';
}
