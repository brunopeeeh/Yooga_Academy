import { describe, expect, it } from 'vitest';
import {
  createEmptyAnnotations,
  favoriteCount,
  formatNoteDate,
  getNote,
  isFavorite,
  noteCount,
  notePreview,
  removeNote,
  setNote,
  sortedFavorites,
  sortedNotes,
  toggleFavorite,
  NOTE_MAX_LENGTH,
} from './annotations';

const AT = '2026-11-09T10:00:00.000Z';

describe('toggleFavorite', () => {
  it('marca a aula como favorita', () => {
    const state = toggleFavorite(createEmptyAnnotations(), 'aula-1', AT);

    expect(isFavorite(state.favorites, 'aula-1')).toBe(true);
    expect(state.favorites['aula-1']).toEqual({ at: AT });
  });

  it('desfaz a marca quando a aula já era favorita', () => {
    const favorite = toggleFavorite(createEmptyAnnotations(), 'aula-1', AT);
    const unfavorite = toggleFavorite(favorite, 'aula-1', AT);

    expect(isFavorite(unfavorite.favorites, 'aula-1')).toBe(false);
    expect(unfavorite.favorites).toEqual({});
  });

  it('não mexe nas notas ao alternar o favorito', () => {
    const withNote = setNote(createEmptyAnnotations(), 'aula-1', 'lembrete', AT);
    const state = toggleFavorite(withNote, 'aula-1', AT);

    expect(state.notes).toEqual(withNote.notes);
  });
});

describe('setNote', () => {
  it('guarda a nota da aula', () => {
    const state = setNote(createEmptyAnnotations(), 'aula-1', '  cliente pediu PIX  ', AT);

    expect(state.notes['aula-1']).toEqual({
      text: 'cliente pediu PIX',
      at: AT,
      updatedAt: AT,
    });
  });

  it('apaga a nota quando o texto fica vazio', () => {
    const withNote = setNote(createEmptyAnnotations(), 'aula-1', 'lembrete', AT);
    const cleared = setNote(withNote, 'aula-1', '   ', AT);

    expect(cleared.notes['aula-1']).toBeUndefined();
  });

  it('mantém a data de criação quando a nota é editada', () => {
    const created = setNote(createEmptyAnnotations(), 'aula-1', 'primeira versão', AT);
    const edited = setNote(created, 'aula-1', 'segunda versão', '2026-11-10T10:00:00.000Z');

    expect(edited.notes['aula-1']?.at).toBe(AT);
    expect(edited.notes['aula-1']?.updatedAt).toBe('2026-11-10T10:00:00.000Z');
  });

  it('limita o tamanho da nota', () => {
    const state = setNote(createEmptyAnnotations(), 'aula-1', 'x'.repeat(NOTE_MAX_LENGTH + 500), AT);

    expect(state.notes['aula-1']?.text).toHaveLength(NOTE_MAX_LENGTH);
  });
});

describe('removeNote', () => {
  it('apaga a nota', () => {
    const withNote = setNote(createEmptyAnnotations(), 'aula-1', 'lembrete', AT);
    const state = removeNote(withNote, 'aula-1');

    expect(getNote(state, 'aula-1')).toBeUndefined();
  });

  it('não cria uma cópia nova quando não há nota', () => {
    const state = createEmptyAnnotations();

    expect(removeNote(state, 'aula-1')).toBe(state);
  });
});

describe('contagens', () => {
  it('conta favoritos e notas', () => {
    const state = setNote(
      toggleFavorite(createEmptyAnnotations(), 'aula-1', AT),
      'aula-1',
      'lembrete',
      AT,
    );

    expect(favoriteCount(state)).toBe(1);
    expect(noteCount(state)).toBe(1);
  });
});

describe('sortedFavorites', () => {
  it('ordena da mais recente para a mais antiga', () => {
    let state = toggleFavorite(createEmptyAnnotations(), 'aula-1', '2026-11-01T10:00:00.000Z');
    state = toggleFavorite(state, 'aula-2', '2026-11-09T10:00:00.000Z');

    expect(sortedFavorites(state)).toEqual(['aula-2', 'aula-1']);
  });

  it('desempata pelo id quando o carimbo é o mesmo', () => {
    let state = toggleFavorite(createEmptyAnnotations(), 'aula-b', AT);
    state = toggleFavorite(state, 'aula-a', AT);

    expect(sortedFavorites(state)).toEqual(['aula-a', 'aula-b']);
  });
});

describe('sortedNotes', () => {
  it('ordena da nota mais editada para a menos editada', () => {
    let state = setNote(createEmptyAnnotations(), 'aula-1', 'antiga', '2026-11-01T10:00:00.000Z');
    state = setNote(state, 'aula-2', 'recente', '2026-11-09T10:00:00.000Z');

    expect(sortedNotes(state).map((item) => item.lessonId)).toEqual(['aula-2', 'aula-1']);
  });
});

describe('notePreview', () => {
  it('devolve o texto curto sem mexer', () => {
    expect(notePreview('nota curta')).toBe('nota curta');
  });

  it('corta no espaço e sinaliza com reticências', () => {
    const preview = notePreview(`${'palavra '.repeat(40)}fim`, 60);

    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(61);

    // O corte respeita a palavra: a última palavra continua inteira.
    const lastWord = preview.replace('…', '').trim().split(' ').pop();
    expect(['palavra', 'fim']).toContain(lastWord);
  });

  it('normaliza espaços extras', () => {
    expect(notePreview('uma   nota\ncom espaços')).toBe('uma nota com espaços');
  });
});

describe('formatNoteDate', () => {
  it('formata a data em pt-BR', () => {
    expect(formatNoteDate('2026-11-09T10:00:00.000Z')).toMatch(/9 de nov\.? de 2026|9 nov\.? 2026/);
  });

  it('devolve string vazia para data inválida', () => {
    expect(formatNoteDate('data inválida')).toBe('');
  });
});
