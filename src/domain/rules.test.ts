import { describe, expect, it } from 'vitest';
import {
  approvedQuizCount,
  dayKey,
  essentialDoneCount,
  essentialDoneTotal,
  groupStatus,
  isQuizUnlocked,
  isSealEarned,
  levelForXp,
  levelProgress,
  nextStreak,
  passesQuiz,
  previousDayKey,
  quizPassScore,
  quizXpGain,
  resolveNextItem,
} from './rules';
import { createCatalogIndex } from './selectors';
import { makeCatalog, makeProgress } from '@/test/factories';

const index = createCatalogIndex(makeCatalog());
const g1 = index.groupById.get('g1')!;
const g2 = index.groupById.get('g2')!;
const m1 = index.moduleById.get('m1')!;

const done = (...lessonIds: string[]) =>
  makeProgress({
    concluidas: Object.fromEntries(lessonIds.map((id) => [id, true as const])),
  });

const approved = (...moduleIds: string[]) =>
  makeProgress({
    quiz: Object.fromEntries(moduleIds.map((id) => [id, { melhor: 6, total: 6, aprovado: true }])),
  });

const mixed = (lessonIds: string[], moduleIds: string[]) =>
  makeProgress({
    concluidas: Object.fromEntries(lessonIds.map((id) => [id, true as const])),
    quiz: Object.fromEntries(moduleIds.map((id) => [id, { melhor: 6, total: 6, aprovado: true }])),
  });

describe('níveis e XP', () => {
  it('calcula o nível a cada 250 XP e trava no último', () => {
    expect([0, 249, 250, 499, 500, 999, 1000, 1249, 1250].map(levelForXp)).toEqual([
      0, 0, 1, 1, 2, 3, 4, 4, 4,
    ]);
  });

  it('devolve progresso percentual dentro do nível', () => {
    expect(levelProgress(300)).toMatchObject({
      level: 1,
      name: 'Praticante',
      nextXp: 500,
      percent: 20,
      isMax: false,
    });
  });

  it('marca 100% no nível máximo', () => {
    expect(levelProgress(1250)).toMatchObject({ level: 4, percent: 100, isMax: true });
  });

  it('só ganha XP pelos acertos que superam a melhor tentativa', () => {
    expect(quizXpGain(6, 0)).toBe(30);
    expect(quizXpGain(6, 4)).toBe(10);
    expect(quizXpGain(5, 6)).toBe(0);
    expect(quizXpGain(3, 4)).toBe(0);
  });
});

describe('sequência de dias', () => {
  it('gera a chave do dia local e a do dia anterior', () => {
    expect(dayKey(new Date(2026, 10, 10, 23, 59))).toBe('2026-11-10');
    expect(previousDayKey('2026-11-10')).toBe('2026-11-09');
    // virada de mês
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDayKey('2027-01-01')).toBe('2026-12-31');
  });

  it('recomeça em 1 na primeira atividade, mesmo que o fluxo venha por trás', () => {
    expect(nextStreak({ sequencia: 0, ultimoDiaAtivo: null }, '2026-11-10')).toEqual({
      sequencia: 1,
      ultimoDiaAtivo: '2026-11-10',
    });
  });

  it('não refaz a contagem quando a atividade é do mesmo dia', () => {
    expect(nextStreak({ sequencia: 3, ultimoDiaAtivo: '2026-11-10' }, '2026-11-10')).toEqual({
      sequencia: 3,
      ultimoDiaAtivo: '2026-11-10',
    });
    // uma sequência perdida no storage nunca volta a zero
    expect(nextStreak({ sequencia: 0, ultimoDiaAtivo: '2026-11-10' }, '2026-11-10')).toEqual({
      sequencia: 1,
      ultimoDiaAtivo: '2026-11-10',
    });
  });

  it('soma +1 quando a atividade anterior foi ontem', () => {
    expect(nextStreak({ sequencia: 3, ultimoDiaAtivo: '2026-11-09' }, '2026-11-10')).toEqual({
      sequencia: 4,
      ultimoDiaAtivo: '2026-11-10',
    });
  });

  it('recomeça em 1 depois de buracos ou de progresso sem data', () => {
    expect(nextStreak({ sequencia: 7, ultimoDiaAtivo: '2026-10-05' }, '2026-11-10')).toEqual({
      sequencia: 1,
      ultimoDiaAtivo: '2026-11-10',
    });
    expect(nextStreak({ sequencia: 7, ultimoDiaAtivo: null }, '2026-11-10')).toEqual({
      sequencia: 1,
      ultimoDiaAtivo: '2026-11-10',
    });
  });
});

describe('quiz', () => {
  it('aprova a partir de 70%', () => {
    expect(passesQuiz(4, 6)).toBe(false);
    expect(passesQuiz(5, 6)).toBe(true);
    expect(passesQuiz(7, 10)).toBe(true);
    expect(passesQuiz(0, 0)).toBe(false);
  });

  it('calcula a nota de corte arredondando para cima', () => {
    expect(quizPassScore(6)).toBe(5);
    expect(quizPassScore(10)).toBe(7);
  });

  it('libera o quiz só depois de todas as essenciais', () => {
    expect(isQuizUnlocked(m1, makeProgress())).toBe(false);
    expect(isQuizUnlocked(m1, done('l1'))).toBe(false);
    expect(isQuizUnlocked(m1, done('l1', 'l2'))).toBe(true);
  });
});

describe('progresso de grupo', () => {
  it('conta essenciais e ignora leituras de apoio', () => {
    expect(essentialDoneCount(index, m1, makeProgress())).toBe(0);
    expect(essentialDoneCount(index, m1, done('l1', 'l3'))).toBe(1);
    expect(essentialDoneTotal(index, makeProgress())).toBe(0);
    expect(essentialDoneTotal(index, done('l1', 'l2'))).toBe(2);
  });

  it('conta quizzes aprovados por grupo', () => {
    expect(approvedQuizCount(index, g1, makeProgress())).toBe(0);
    expect(approvedQuizCount(index, g1, approved('m1'))).toBe(1);
  });

  it('usa a mesma máquina de estados do protótipo', () => {
    expect(groupStatus(index, g1, makeProgress())).toBe('todo');
    expect(groupStatus(index, g2, makeProgress())).toBe('todo');

    const started = done('l1');
    expect(groupStatus(index, g1, started)).toBe('doing');
    expect(groupStatus(index, g2, started)).toBe('next');

    const sealed = makeProgress({ selos: { g1: true } });
    expect(groupStatus(index, g1, sealed)).toBe('done');
    expect(groupStatus(index, g2, sealed)).toBe('next');
  });

  it('só conquista o selo quando todos os quizzes do grupo são aprovados', () => {
    expect(isSealEarned(index, g1, approved('m1'))).toBe(false);
    expect(isSealEarned(index, g1, approved('m1', 'm2'))).toBe(true);
    // Grupo sem módulo de quiz nunca gera selo.
    expect(isSealEarned(index, g2, makeProgress())).toBe(false);
  });
});

describe('próximo item da trilha', () => {
  it('percorre aulas, quiz do módulo, próximo módulo e próximo grupo', () => {
    expect(resolveNextItem(index, makeProgress())).toMatchObject({
      kind: 'lesson',
      lesson: { id: 'l1' },
    });

    expect(resolveNextItem(index, done('l1'))).toMatchObject({
      kind: 'lesson',
      lesson: { id: 'l2' },
    });

    expect(resolveNextItem(index, done('l1', 'l2'))).toMatchObject({
      kind: 'quiz',
      module: { id: 'm1' },
    });

    expect(resolveNextItem(index, mixed(['l1', 'l2'], ['m1']))).toMatchObject({
      kind: 'lesson',
      lesson: { id: 'l4' },
    });

    expect(resolveNextItem(index, mixed(['l1', 'l2', 'l4'], ['m1', 'm2']))).toMatchObject({
      kind: 'lesson',
      lesson: { id: 'l5' },
    });

    expect(resolveNextItem(index, mixed(['l1', 'l2', 'l4', 'l5'], ['m1', 'm2']))).toBeNull();
  });
});
