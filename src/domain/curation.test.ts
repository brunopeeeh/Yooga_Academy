import { describe, expect, it } from 'vitest';
import { createCatalogIndex } from './selectors';
import type { Catalog } from './types';
import {
  checksBadge,
  createEmptyCuration,
  curationQueue,
  curationSummary,
  isApproved,
  isQuizApproved,
  quizBadge,
  type CurationApproval,
  type CurationItem,
} from './curation';

const CATALOG: Catalog = {
  versao: '1',
  fonte: 'teste',
  grupos: [
    {
      id: 'grupo-a',
      ordem: 1,
      nome: 'Grupo A',
      descricao: '',
      origem: '',
      modulos: [
        {
          id: 'modulo-a1',
          ordem: 1,
          nome: 'Módulo A1',
          observacao: '',
          tem_quiz: false,
          aulas: [
            {
              id: 'aula-1',
              ordem: 1,
              titulo: 'Aula 1',
              tipo: 'essencial',
              url_central: '',
              origem: '',
            },
            {
              id: 'aula-2',
              ordem: 2,
              titulo: 'Aula 2',
              tipo: 'essencial',
              url_central: '',
              origem: '',
            },
          ],
        },
      ],
    },
    {
      id: 'grupo-b',
      ordem: 2,
      nome: 'Grupo B',
      descricao: '',
      origem: '',
      modulos: [
        {
          id: 'modulo-b1',
          ordem: 1,
          nome: 'Módulo B1',
          observacao: '',
          tem_quiz: false,
          aulas: [
            {
              id: 'aula-3',
              ordem: 1,
              titulo: 'Aula 3',
              tipo: 'essencial',
              url_central: '',
              origem: '',
            },
          ],
        },
      ],
    },
  ],
};

const INDEX = createCatalogIndex(CATALOG);

function makeInput(overrides: Partial<Parameters<typeof curationQueue>[0]> = {}) {
  return {
    index: INDEX,
    generated: new Map([
      ['aula-1', 2],
      ['aula-2', 1],
      ['aula-3', 2],
    ]),
    curated: new Set<string>(),
    approvals: new Map<string, CurationApproval>(),
    ...overrides,
  };
}

describe('checksBadge', () => {
  it('não devolve selo quando a aula não tem perguntas', () => {
    expect(checksBadge(undefined, undefined)).toBeNull();
  });

  it('marca como curado quando as perguntas foram escritas à mão', () => {
    expect(checksBadge('curado', undefined)).toBe('curado');
    // Uma curadoria manual não muda o selo.
    expect(checksBadge('curado', { decision: 'aprovado', at: '2026-11-09' })).toBe('curado');
  });

  it('marca como rascunho quando as perguntas foram geradas e ainda não revisadas', () => {
    expect(checksBadge('rascunho', undefined)).toBe('rascunho');
  });

  it('marca como ia quando o enunciado foi reescrito por uma LLM', () => {
    expect(checksBadge('ia', undefined)).toBe('ia');
  });

  it('a revisão do time vale para as perguntas reescritas por IA', () => {
    expect(checksBadge('ia', { decision: 'aprovado', at: '2026-11-09' })).toBe('aprovado');
    expect(checksBadge('ia', { decision: 'ajuste', at: '2026-11-09' })).toBe('ajuste');
  });

  it('marca como aprovado depois da revisão do time', () => {
    expect(checksBadge('rascunho', { decision: 'aprovado', at: '2026-11-09' })).toBe('aprovado');
  });

  it('marca como ajuste quando o time pediu correção', () => {
    expect(checksBadge('rascunho', { decision: 'ajuste', at: '2026-11-09' })).toBe('ajuste');
  });
});

describe('isApproved', () => {
  it('só considera aprovada a revisão com decisão "aprovado"', () => {
    const state = createEmptyCuration();

    expect(isApproved(state, 'aula-1')).toBe(false);

    const approved = {
      approvals: { 'aula-1': { decision: 'aprovado' as const, at: '2026-11-09' } },
      quizApprovals: {},
    };

    expect(isApproved(approved, 'aula-1')).toBe(true);
    expect(isApproved(approved, 'aula-2')).toBe(false);
  });

  it('não considera aprovada a revisão que pediu ajuste', () => {
    const state = {
      approvals: { 'aula-1': { decision: 'ajuste' as const, at: '2026-11-09' } },
      quizApprovals: {},
    };

    expect(isApproved(state, 'aula-1')).toBe(false);
  });
});

describe('isQuizApproved', () => {
  it('só considera aprovado o quiz com decisão "aprovado"', () => {
    const state = createEmptyCuration();

    expect(isQuizApproved(state, 'modulo-a1')).toBe(false);

    const approved = {
      approvals: {},
      quizApprovals: { 'modulo-a1': { decision: 'aprovado' as const, at: '2026-11-09' } },
    };

    expect(isQuizApproved(approved, 'modulo-a1')).toBe(true);
    expect(isQuizApproved(approved, 'modulo-b1')).toBe(false);
  });

  it('não considera aprovado o quiz que pediu ajuste', () => {
    const state = {
      approvals: {},
      quizApprovals: { 'modulo-a1': { decision: 'ajuste' as const, at: '2026-11-09' } },
    };

    expect(isQuizApproved(state, 'modulo-a1')).toBe(false);
  });
});

describe('quizBadge', () => {
  it('não devolve selo quando o módulo não tem quiz', () => {
    expect(quizBadge(undefined, undefined)).toBeNull();
  });

  it('marca como curado quando o quiz foi escrito à mão', () => {
    expect(quizBadge('curado', undefined)).toBe('curado');
    expect(quizBadge('curado', { decision: 'aprovado', at: '2026-11-09' })).toBe('curado');
  });

  it('marca como rascunho quando o quiz foi gerado e ainda não revisado', () => {
    expect(quizBadge('rascunho', undefined)).toBe('rascunho');
  });

  it('marca como ia quando os textos foram reescritos por uma LLM', () => {
    expect(quizBadge('ia', undefined)).toBe('ia');
  });

  it('a revisão do time vale para o quiz reescrito por IA', () => {
    expect(quizBadge('ia', { decision: 'aprovado', at: '2026-11-09' })).toBe('aprovado');
    expect(quizBadge('ia', { decision: 'ajuste', at: '2026-11-09' })).toBe('ajuste');
  });
});

describe('curationQueue', () => {
  /** Ids das aulas da fila (ignora os quizzes dos módulos). */
  function lessonIds(queue: readonly CurationItem[]): string[] {
    return queue.flatMap((item) => (item.kind === 'aula' ? [item.lesson.id] : []));
  }

  it('lista as aulas com perguntas geradas na ordem do catálogo', () => {
    const queue = curationQueue(makeInput());

    expect(lessonIds(queue)).toEqual(['aula-1', 'aula-2', 'aula-3']);
    expect(queue[0]?.group.id).toBe('grupo-a');
    expect(queue[0]?.module.id).toBe('modulo-a1');
    expect(queue[0]?.questionCount).toBe(2);
  });

  it('tira da fila as aulas cujas perguntas já são curadas à mão', () => {
    const queue = curationQueue(makeInput({ curated: new Set(['aula-2']) }));

    expect(lessonIds(queue)).toEqual(['aula-1', 'aula-3']);
  });

  it('tira da fila as aulas sem perguntas geradas', () => {
    const queue = curationQueue(makeInput({ generated: new Map([['aula-1', 2]]) }));

    expect(lessonIds(queue)).toEqual(['aula-1']);
  });

  it('leva a revisão junto do item quando a aula já foi revisada', () => {
    const approval: CurationApproval = {
      decision: 'aprovado',
      at: '2026-11-09',
      by: 'Ana',
    };

    const queue = curationQueue(makeInput({ approvals: new Map([['aula-1', approval]]) }));

    expect(queue[0]?.approval).toEqual(approval);
    expect(queue[1]?.approval).toBeUndefined();
  });

  it('coloca o quiz do módulo logo depois das aulas dele', () => {
    const queue = curationQueue(
      makeInput({
        generatedQuizzes: new Map([
          ['modulo-a1', 6],
          ['modulo-b1', 4],
        ]),
      }),
    );

    expect(queue.map((item) => item.kind)).toEqual(['aula', 'aula', 'quiz', 'aula', 'quiz']);

    const quiz = queue.find((item) => item.kind === 'quiz' && item.module.id === 'modulo-a1');

    expect(quiz?.questionCount).toBe(6);
    expect(quiz?.group.id).toBe('grupo-a');
  });

  it('tira da fila os quizzes curados à mão', () => {
    const queue = curationQueue(
      makeInput({
        generatedQuizzes: new Map([['modulo-a1', 6]]),
        curatedQuizModules: new Set(['modulo-a1']),
      }),
    );

    expect(queue.some((item) => item.kind === 'quiz')).toBe(false);
  });

  it('leva a revisão do quiz junto do item', () => {
    const approval: CurationApproval = { decision: 'aprovado', at: '2026-11-09' };

    const queue = curationQueue(
      makeInput({
        generatedQuizzes: new Map([['modulo-a1', 6]]),
        quizApprovals: new Map([['modulo-a1', approval]]),
      }),
    );

    const quiz = queue.find((item) => item.kind === 'quiz');

    expect(quiz?.approval).toEqual(approval);
  });
});

describe('curationSummary', () => {
  it('conta pendentes, aprovadas e ajustes', () => {
    const summary = curationSummary(
      makeInput({
        approvals: new Map([
          ['aula-1', { decision: 'aprovado', at: '2026-11-09' }],
          ['aula-2', { decision: 'ajuste', at: '2026-11-09' }],
        ]),
      }),
    );

    expect(summary.total).toBe(3);
    expect(summary.approved).toBe(1);
    expect(summary.needsAdjustment).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.questionCount).toBe(5);
    expect(summary.percent).toBe(33);
  });

  it('conta as aulas curadas à mão fora da fila', () => {
    const summary = curationSummary(makeInput({ curated: new Set(['aula-2']) }));

    expect(summary.curated).toBe(1);
    expect(summary.total).toBe(2);
  });

  it('devolve 100% quando não há nada na fila', () => {
    const summary = curationSummary(
      makeInput({ generated: new Map(), curated: new Set(['aula-1', 'aula-2', 'aula-3']) }),
    );

    expect(summary.total).toBe(0);
    expect(summary.percent).toBe(100);
  });
});
