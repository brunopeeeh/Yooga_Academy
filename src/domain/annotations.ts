/**
 * Favoritos e anotações do analista (Fase 12).
 *
 * Regras puras (sem React): o que está marcado como favorito, como a nota é
 * guardada, como as listas são ordenadas e como a nota aparece resumida.
 * As telas e o store só aplicam estas regras.
 */

/** Momento em que a aula foi marcada como favorita. */
export interface FavoriteMark {
  /** ISO 8601. */
  readonly at: string;
}

/** Anotação livre escrita pelo analista sobre uma aula. */
export interface LessonNote {
  readonly text: string;
  /** Criação da nota (ISO 8601). */
  readonly at: string;
  /** Última alteração da nota (ISO 8601). */
  readonly updatedAt: string;
}

/** Estado local do analista: favoritos e anotações, por aula. */
export interface AnnotationsState {
  readonly favorites: Record<string, FavoriteMark>;
  readonly notes: Record<string, LessonNote>;
}

/**
 * Limite da nota — evita texto infinito e `localStorage` inchado.
 * Uma anotação é um recado curto, não o artigo inteiro.
 */
export const NOTE_MAX_LENGTH = 2000;

export function createEmptyAnnotations(): AnnotationsState {
  return { favorites: {}, notes: {} };
}

/** A aula está marcada como favorita? */
export function isFavorite(
  favorites: Readonly<Record<string, FavoriteMark>>,
  lessonId: string,
): boolean {
  return favorites[lessonId] !== undefined;
}

/**
 * Marca a aula como favorita ou desfaz a marca.
 *
 * A mesma função serve para os dois sentidos — é o botão "Favoritar" da
 * tela de aula, que alterna.
 */
export function toggleFavorite(
  state: AnnotationsState,
  lessonId: string,
  at = new Date().toISOString(),
): AnnotationsState {
  const favorites = { ...state.favorites };

  if (favorites[lessonId]) {
    delete favorites[lessonId];
  } else {
    favorites[lessonId] = { at };
  }

  return { ...state, favorites };
}

/** A nota da aula, quando existe. */
export function getNote(state: AnnotationsState, lessonId: string): LessonNote | undefined {
  return state.notes[lessonId];
}

/**
 * Guarda a nota da aula.
 *
 * Texto vazio (só espaços) **apaga** a nota: o campo em branco nunca fica
 * salvo. O texto é aparado e limitado a `NOTE_MAX_LENGTH`.
 */
export function setNote(
  state: AnnotationsState,
  lessonId: string,
  text: string,
  at = new Date().toISOString(),
): AnnotationsState {
  const clean = text.trim().slice(0, NOTE_MAX_LENGTH);

  if (clean.length === 0) return removeNote(state, lessonId);

  const notes = { ...state.notes };
  const existing = notes[lessonId];

  notes[lessonId] = {
    text: clean,
    at: existing?.at ?? at,
    updatedAt: at,
  };

  return { ...state, notes };
}

/** Apaga a nota da aula (não faz nada quando não há nota). */
export function removeNote(state: AnnotationsState, lessonId: string): AnnotationsState {
  if (!state.notes[lessonId]) return state;

  const notes = { ...state.notes };
  delete notes[lessonId];

  return { ...state, notes };
}

export function favoriteCount(state: AnnotationsState): number {
  return Object.keys(state.favorites).length;
}

export function noteCount(state: AnnotationsState): number {
  return Object.keys(state.notes).length;
}

/**
 * Ids das aulas favoritas, da mais recente para a mais antiga.
 *
 * Empates de carimbo (duas aulas marcadas no mesmo instante) são desempatados
 * pelo id, para a ordem não depender do sorteio do `Object.keys`.
 */
export function sortedFavorites(state: AnnotationsState): string[] {
  return Object.entries(state.favorites)
    .sort((a, b) =>
      a[1].at === b[1].at ? a[0].localeCompare(b[0]) : b[1].at.localeCompare(a[1].at),
    )
    .map(([lessonId]) => lessonId);
}

/** Anotações, da mais editada para a menos editada. */
export function sortedNotes(
  state: AnnotationsState,
): readonly { readonly lessonId: string; readonly note: LessonNote }[] {
  return Object.entries(state.notes)
    .sort((a, b) =>
      a[1].updatedAt === b[1].updatedAt
        ? a[0].localeCompare(b[0])
        : b[1].updatedAt.localeCompare(a[1].updatedAt),
    )
    .map(([lessonId, note]) => ({ lessonId, note }));
}

/**
 * Resumo da nota para a lista — texto curto, sem cortar palavra pela metade.
 */
export function notePreview(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();

  if (clean.length <= max) return clean;

  const slice = clean.slice(0, max);
  const space = slice.lastIndexOf(' ');

  return `${(space > max * 0.6 ? slice.slice(0, space) : slice).trimEnd()}…`;
}

/** Data da nota em formato curto pt-BR ("9 nov 2026"). */
export function formatNoteDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace('.', '');
}
