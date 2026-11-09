import { createEmptyProgress } from '@/domain/progress';
import type { Catalog, Lesson, Module, ProgressData } from '@/domain/types';

function lesson(id: string, ordem: number, tipo: Lesson['tipo'] = 'essencial'): Lesson {
  return {
    id,
    ordem,
    titulo: `Aula ${id}`,
    tipo,
    url_central: `https://example.com/${id}`,
    origem: 'teste',
  };
}

function module(id: string, ordem: number, temQuiz: boolean, aulas: Lesson[]): Module {
  return {
    id,
    ordem,
    nome: `Módulo ${id}`,
    observacao: '',
    tem_quiz: temQuiz,
    aulas,
  };
}

/**
 * Catálogo pequeno e independente do seed real:
 * g1 › m1 (l1, l2 essenciais, l3 apoio, quiz) e m2 (l4 essencial, quiz)
 * g2 › m3 (l5 essencial, sem quiz)
 */
export function makeCatalog(): Catalog {
  return {
    versao: 'teste',
    fonte: 'https://example.com',
    grupos: [
      {
        id: 'g1',
        ordem: 0,
        nome: 'Grupo 1',
        descricao: 'Primeiro grupo.',
        origem: 'teste',
        modulos: [
          module('m1', 1, true, [lesson('l1', 1), lesson('l2', 2), lesson('l3', 3, 'consulta')]),
          module('m2', 2, true, [lesson('l4', 1)]),
        ],
      },
      {
        id: 'g2',
        ordem: 1,
        nome: 'Grupo 2',
        descricao: 'Segundo grupo.',
        origem: 'teste',
        modulos: [module('m3', 1, false, [lesson('l5', 1)])],
      },
    ],
  };
}

export function makeProgress(overrides: Partial<ProgressData> = {}): ProgressData {
  return { ...createEmptyProgress(), ...overrides };
}
