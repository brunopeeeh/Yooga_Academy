import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyCuration } from '@/domain/curation';
import { CURATION_STORAGE_KEY, useCurationStore } from './curation';

const LESSON = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';
const MODULE = 'primeiros-passos--acesso-ao-sistema';

beforeEach(() => {
  localStorage.clear();
  useCurationStore.setState(createEmptyCuration());
});

describe('curationStore', () => {
  it('registra a decisão de uma aula', () => {
    useCurationStore.getState().reviewLesson(LESSON, 'aprovado', 'Fábio Ribeiro');

    expect(useCurationStore.getState().approvals[LESSON]).toEqual({
      decision: 'aprovado',
      at: expect.any(String),
      by: 'Fábio Ribeiro',
    });
  });

  it('registra a decisão do quiz de um módulo', () => {
    useCurationStore.getState().reviewQuiz(MODULE, 'aprovado', 'Fábio Ribeiro');

    expect(useCurationStore.getState().quizApprovals[MODULE]).toEqual({
      decision: 'aprovado',
      at: expect.any(String),
      by: 'Fábio Ribeiro',
    });
  });

  it('guarda a decisão sem o autor quando não há sessão', () => {
    useCurationStore.getState().reviewQuiz(MODULE, 'ajuste');

    expect(useCurationStore.getState().quizApprovals[MODULE]?.decision).toBe('ajuste');
    expect(useCurationStore.getState().quizApprovals[MODULE]?.by).toBeUndefined();
  });

  it('reabre um item revisado', () => {
    useCurationStore.getState().reviewLesson(LESSON, 'aprovado');
    useCurationStore.getState().reviewQuiz(MODULE, 'aprovado');

    useCurationStore.getState().reopenLesson(LESSON);
    useCurationStore.getState().reopenQuiz(MODULE);

    expect(useCurationStore.getState().approvals[LESSON]).toBeUndefined();
    expect(useCurationStore.getState().quizApprovals[MODULE]).toBeUndefined();
  });

  it('persiste as decisões no navegador', () => {
    useCurationStore.getState().reviewLesson(LESSON, 'aprovado');
    useCurationStore.getState().reviewQuiz(MODULE, 'ajuste');

    const raw = localStorage.getItem(CURATION_STORAGE_KEY);

    expect(raw).not.toBeNull();

    const saved = JSON.parse(raw ?? '{}') as {
      state: { approvals: Record<string, unknown>; quizApprovals: Record<string, unknown> };
      version: number;
    };

    expect(saved.version).toBe(2);
    expect(saved.state.approvals[LESSON]).toBeDefined();
    expect(saved.state.quizApprovals[MODULE]).toBeDefined();
  });

  it('migra as revisões da v1 (só aulas) para a v2 sem perder nada', async () => {
    // Payload no formato da v1: só as revisões das aulas.
    localStorage.setItem(
      CURATION_STORAGE_KEY,
      JSON.stringify({
        state: {
          approvals: { [LESSON]: { decision: 'aprovado', at: '2026-11-01' } },
        },
        version: 1,
      }),
    );

    await useCurationStore.persist.rehydrate();

    // A revisão da aula continua valendo…
    expect(useCurationStore.getState().approvals[LESSON]?.decision).toBe('aprovado');
    // …e os quizzes começam sem revisão nenhuma.
    expect(useCurationStore.getState().quizApprovals).toEqual({});
  });

  it('limpa todas as revisões', () => {
    useCurationStore.getState().reviewLesson(LESSON, 'aprovado');
    useCurationStore.getState().reviewQuiz(MODULE, 'aprovado');

    useCurationStore.getState().resetCuration();

    expect(useCurationStore.getState().approvals).toEqual({});
    expect(useCurationStore.getState().quizApprovals).toEqual({});
  });
});
