import { createCatalogIndex } from '@/domain/selectors';
import type { Catalog } from '@/domain/types';
import rawCatalog from './seed.json';
import { parseCatalog } from './schema';

/** Catálogo validado em tempo de carregamento. Falha rápido se o seed divergir. */
export const catalog: Catalog = parseCatalog(rawCatalog);

export const catalogIndex = createCatalogIndex(catalog);
