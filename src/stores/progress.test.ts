import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProgress } from '@/domain/progress';
import { PROGRESS_STORAGE_KEY, useProgressStore } from './progress';

const lesson = { id: 'aula-1', titulo: 'Aula 1' };

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
});

describe('store de progresso', () => {
  it('conclui uma aula apenas uma vez e soma XP', () => {
    const first = useProgressStore.getState().completeLesson(lesson);

    expect(first).toEqual({ xpGained: 10, leveledUp: false });
    expect(useProgressStore.getState().xp).toBe(10);
    expect(useProgressStore.getState().concluidas[lesson.id]).toBe(true);
    expect(useProgressStore.getState().log[0]?.text).toBe('Concluiu Aula 1');

    const second = useProgressStore.getState().completeLesson(lesson);
    expect(second.xpGained).toBe(0);
    expect(useProgressStore.getState().xp).toBe(10);
  });

  it('avisa quando a aula faz subir de nível', () => {
    useProgressStore.setState({ xp: 240 });

    const result = useProgressStore.getState().completeLesson(lesson);

    expect(result.leveledUp).toBe(true);
    expect(useProgressStore.getState().xp).toBe(250);
  });

  it('guarda a resposta de cada quick check por aula e pergunta', () => {
    const store = useProgressStore.getState();

    store.answerCheck('aula-1', 'q1', 2);
    store.answerCheck('aula-1', 'q2', 0);
    store.answerCheck('aula-1', 'q1', 1);

    expect(useProgressStore.getState().checks).toEqual({
      'aula-1': { q1: 1, q2: 0 },
    });
  });

  it('considera a melhor tentativa do quiz e só paga o delta', () => {
    const attempt = (correct: number, total = 6) =>
      useProgressStore.getState().recordQuizAttempt({
        moduleId: 'm1',
        moduleName: 'Módulo 1',
        groupId: 'g1',
        groupName: 'Grupo 1',
        correct,
        total,
      });

    expect(attempt(4).xpGained).toBe(20);
    expect(useProgressStore.getState().quiz.m1).toEqual({
      melhor: 4,
      total: 6,
      aprovado: false,
    });

    expect(attempt(6).xpGained).toBe(10);
    expect(useProgressStore.getState().quiz.m1).toMatchObject({ melhor: 6, aprovado: true });

    expect(attempt(5).xpGained).toBe(0);
    expect(useProgressStore.getState().quiz.m1).toMatchObject({ melhor: 6, aprovado: true });
  });

  it('concede o selo uma única vez', () => {
    const input = {
      moduleId: 'm2',
      moduleName: 'Módulo 2',
      groupId: 'g1',
      groupName: 'Grupo 1',
      correct: 6,
      total: 6,
      sealEligible: true,
    };

    const first = useProgressStore.getState().recordQuizAttempt(input);
    expect(first).toEqual({ xpGained: 60, sealAwarded: true, leveledUp: false });
    expect(useProgressStore.getState().selos.g1).toBe(true);

    const second = useProgressStore.getState().recordQuizAttempt(input);
    expect(second.sealAwarded).toBe(false);
    expect(useProgressStore.getState().xp).toBe(60);
  });

  it('persiste apenas os dados de progresso', () => {
    useProgressStore.getState().completeLesson(lesson);

    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    expect(raw).toBeTruthy();

    const stored = JSON.parse(raw ?? '{}') as { state: Record<string, unknown>; version: number };
    expect(stored.version).toBe(1);
    expect(stored.state.xp).toBe(10);
    expect(stored.state).not.toHaveProperty('completeLesson');
  });

  it('zera o progresso mantendo as ações', () => {
    useProgressStore.getState().completeLesson(lesson);
    useProgressStore.getState().resetProgress();

    expect(useProgressStore.getState().xp).toBe(0);
    expect(useProgressStore.getState().concluidas).toEqual({});
    expect(typeof useProgressStore.getState().completeLesson).toBe('function');
  });
});
