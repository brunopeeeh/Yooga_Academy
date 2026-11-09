import type { Catalog, Group, Lesson, Module } from './types';

export interface CatalogTotals {
  groups: number;
  modules: number;
  lessons: number;
  essentials: number;
  support: number;
  quizModules: number;
}

export interface CatalogIndex {
  readonly catalog: Catalog;
  readonly groups: readonly Group[];
  readonly groupById: ReadonlyMap<string, Group>;
  readonly moduleById: ReadonlyMap<string, Module>;
  readonly lessonById: ReadonlyMap<string, Lesson>;
  readonly groupOfModule: ReadonlyMap<string, Group>;
  readonly moduleOfLesson: ReadonlyMap<string, Module>;
  readonly essentialsOf: ReadonlyMap<string, readonly Lesson[]>;
  readonly supportOf: ReadonlyMap<string, readonly Lesson[]>;
  readonly quizModulesOfGroup: ReadonlyMap<string, readonly Module[]>;
  readonly positionOfGroup: ReadonlyMap<string, number>;
  readonly totals: CatalogTotals;
}

/**
 * Constrói de uma vez os índices usados pelas telas. O catálogo em si nunca é
 * mutado: diferente do protótipo, nada de pendurar `grupo`/`modulo` nos objetos.
 */
export function createCatalogIndex(catalog: Catalog): CatalogIndex {
  const groups = catalog.grupos;
  const groupById = new Map<string, Group>();
  const moduleById = new Map<string, Module>();
  const lessonById = new Map<string, Lesson>();
  const groupOfModule = new Map<string, Group>();
  const moduleOfLesson = new Map<string, Module>();
  const essentialsOf = new Map<string, readonly Lesson[]>();
  const supportOf = new Map<string, readonly Lesson[]>();
  const quizModulesOfGroup = new Map<string, Module[]>();
  const positionOfGroup = new Map<string, number>();

  const totals: CatalogTotals = {
    groups: 0,
    modules: 0,
    lessons: 0,
    essentials: 0,
    support: 0,
    quizModules: 0,
  };

  groups.forEach((group, position) => {
    totals.groups += 1;
    groupById.set(group.id, group);
    positionOfGroup.set(group.id, position);
    quizModulesOfGroup.set(group.id, []);

    for (const module of group.modulos) {
      totals.modules += 1;
      moduleById.set(module.id, module);
      groupOfModule.set(module.id, group);

      const essentials: Lesson[] = [];
      const support: Lesson[] = [];

      for (const lesson of module.aulas) {
        totals.lessons += 1;
        lessonById.set(lesson.id, lesson);
        moduleOfLesson.set(lesson.id, module);
        if (lesson.tipo === 'essencial') {
          totals.essentials += 1;
          essentials.push(lesson);
        } else {
          totals.support += 1;
          support.push(lesson);
        }
      }

      essentialsOf.set(module.id, essentials);
      supportOf.set(module.id, support);

      if (module.tem_quiz) {
        totals.quizModules += 1;
        quizModulesOfGroup.get(group.id)?.push(module);
      }
    }
  });

  return {
    catalog,
    groups,
    groupById,
    moduleById,
    lessonById,
    groupOfModule,
    moduleOfLesson,
    essentialsOf,
    supportOf,
    quizModulesOfGroup,
    positionOfGroup,
    totals,
  };
}

export function essentialsOf(index: CatalogIndex, module: Module): readonly Lesson[] {
  return index.essentialsOf.get(module.id) ?? [];
}

export function supportOf(index: CatalogIndex, module: Module): readonly Lesson[] {
  return index.supportOf.get(module.id) ?? [];
}

export function quizModulesOfGroup(index: CatalogIndex, group: Group): readonly Module[] {
  return index.quizModulesOfGroup.get(group.id) ?? [];
}
