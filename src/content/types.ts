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
  /**
   * Trecho literal da aula citado no enunciado (pergunta de sequência).
   *
   * Fica em campo próprio — e não só dentro do `prompt` — para que a
   * auditoria (`src/content/content.test.ts`) continue funcionando mesmo
   * depois de o enunciado ser reescrito por uma LLM.
   */
  readonly anchor?: string;
  /** Título da seção citada no enunciado, quando a pergunta âncora uma seção. */
  readonly section?: string;
}

export interface LessonContent {
  readonly lessonId: string;
  readonly minutes: number;
  readonly intro: string;
  readonly blocks: readonly ContentBlock[];
  readonly warning?: readonly InlineToken[];
  /** Perguntas de conferência: não valem nota, mas liberam a conclusão da aula. */
  readonly checks: readonly CheckQuestion[];
  /**
   * Origem das perguntas:
   * - `curado`: escritas à mão pela equipe de conteúdo;
   * - `rascunho`: geradas automaticamente a partir do artigo;
   * - `ia`: enunciados reescritos por uma LLM, ainda aguardando curadoria.
   */
  readonly checksOrigin?: 'curado' | 'rascunho' | 'ia';
  /** Artigo de origem na Central de Ajuda (conteúdo extraído automaticamente). */
  readonly sourceUrl?: string;
  /** Título do artigo na Central de Ajuda. */
  readonly sourceTitle?: string;
}

/**
 * Tipo da pergunta de quiz — **estruturado**, nunca deduzido do enunciado.
 *
 * A auditoria (`src/content/quiz.test.ts`) precisa saber se a pergunta é de
 * sequência, reconhecimento ou ordem para conferir que a alternativa correta é
 * o passo seguinte / o primeiro passo da aula. Se o tipo fosse deduzido do
 * texto do enunciado (`"depois de"`, `"vem primeiro"`), a auditoria quebraria
 * assim que uma LLM reescrevesse o enunciado.
 */
export type QuizQuestionType = 'sequencia' | 'reconhecimento' | 'ordem';

export interface QuizQuestion {
  readonly id: string;
  /** Fala da cliente fictícia que dá contexto à pergunta. */
  readonly scene: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  /** Rótulo curto do que a pergunta treina (aparece na tela de resultado). */
  readonly review: string;
  readonly lessonLabel: string;
  /** Aula relacionada, quando o conteúdo já foi migrado. */
  readonly lessonId?: string;
  /** Tipo da pergunta (ver `QuizQuestionType`). */
  readonly type?: QuizQuestionType;
  /**
   * Trecho literal da aula citado no enunciado (pergunta de sequência).
   *
   * Fica em campo próprio — e não só dentro do `prompt` — para que a
   * auditoria continue funcionando depois de o enunciado ser reescrito por
   * uma LLM.
   */
  readonly anchor?: string;
  /** Título da seção citada no enunciado (pergunta de sequência). */
  readonly section?: string;
}

export interface Quiz {
  readonly moduleId: string;
  readonly questions: readonly QuizQuestion[];
  /**
   * Origem do quiz:
   * - `curado`: escrito à mão pela equipe de conteúdo;
   * - `rascunho`: gerado automaticamente a partir dos artigos do módulo;
   * - `ia`: enunciados reescritos por uma LLM, ainda aguardando curadoria.
   */
  readonly origin?: 'curado' | 'rascunho' | 'ia';
}

/**
 * Reescrita por IA de **uma** pergunta de quiz.
 *
 * Guarda só os textos que a LLM pode reescrever. Tudo que sustenta a
 * verificabilidade — alternativas, índice da resposta, tipo, âncora, seção e
 * vínculo com a aula — continua no gerador determinístico.
 */
export interface QuizAiRewrite {
  readonly id: string;
  readonly scene: string;
  readonly prompt: string;
  readonly explanation: string;
  readonly review: string;
}
