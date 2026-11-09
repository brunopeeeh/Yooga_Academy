import { describe, expect, it } from 'vitest';
import { catalog, catalogIndex } from './catalog';
import { parseCatalog } from './schema';

describe('catálogo extraído da Central', () => {
  it('mantém os totais do mapa original', () => {
    expect(catalogIndex.totals).toEqual({
      groups: 8,
      modules: 35,
      lessons: 170,
      essentials: 102,
      support: 68,
      quizModules: 32,
    });
  });

  it('não tem ids duplicados', () => {
    const groupIds = catalog.grupos.map((group) => group.id);
    const moduleIds = catalog.grupos.flatMap((group) => group.modulos.map((m) => m.id));
    const lessonIds = catalog.grupos.flatMap((group) =>
      group.modulos.flatMap((module) => module.aulas.map((lesson) => lesson.id)),
    );

    expect(new Set(groupIds).size).toBe(groupIds.length);
    expect(new Set(moduleIds).size).toBe(moduleIds.length);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
  });

  it('mantém o grupo de primeiros passos na frente', () => {
    expect(catalog.grupos[0]?.id).toBe('primeiros-passos');
  });

  it('rejeita um catálogo inválido', () => {
    expect(() => parseCatalog({})).toThrow();
    expect(() => parseCatalog({ ...catalog, grupos: [] })).toThrow();
  });
});
