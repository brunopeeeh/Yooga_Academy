import { z } from 'zod';
import type { Catalog } from '@/domain/types';

const lessonSchema = z.object({
  id: z.string().min(1),
  ordem: z.number().int().nonnegative(),
  titulo: z.string().min(1),
  tipo: z.enum(['essencial', 'consulta']),
  url_central: z.url(),
  origem: z.string().min(1),
});

const moduleSchema = z.object({
  id: z.string().min(1),
  ordem: z.number().int().nonnegative(),
  nome: z.string().min(1),
  observacao: z.string(),
  tem_quiz: z.boolean(),
  aulas: z.array(lessonSchema),
});

const groupSchema = z.object({
  id: z.string().min(1),
  ordem: z.number().int().nonnegative(),
  nome: z.string().min(1),
  descricao: z.string(),
  origem: z.string().min(1),
  modulos: z.array(moduleSchema),
});

export const catalogSchema: z.ZodType<Catalog> = z.object({
  versao: z.string().min(1),
  fonte: z.url(),
  grupos: z.array(groupSchema).min(1),
});

export function parseCatalog(input: unknown): Catalog {
  return catalogSchema.parse(input);
}
