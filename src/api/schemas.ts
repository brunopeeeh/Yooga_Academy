import { z } from 'zod';
import type { AuthUser, UserRole } from '@/domain/auth';
import type { ActivityEntry, ProgressData, QuizResult } from '@/domain/types';

/**
 * Contrato da API do Yooga Academy (Fase 8), validado com Zod.
 * Toda resposta da rede passa por estes schemas antes de chegar nas telas.
 */

export const authUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(['analista', 'lider']),
  initials: z.string().min(1),
});

export const sessionSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema,
});

export const meSchema = z.object({
  user: authUserSchema,
});

const quizResultSchema = z.object({
  melhor: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  aprovado: z.boolean(),
});

const activityEntrySchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  when: z.string(),
  xp: z.number().int().nonnegative(),
});

export const progressSchema = z.object({
  concluidas: z.record(z.string(), z.literal(true)),
  checks: z.record(z.string(), z.record(z.string(), z.number().int())),
  quiz: z.record(z.string(), quizResultSchema),
  selos: z.record(z.string(), z.literal(true)),
  xp: z.number().int().nonnegative(),
  sequencia: z.number().int().nonnegative(),
  /** Opcional para tolerar payloads antigos; `null` quando o dia é desconhecido. */
  ultimoDiaAtivo: z.string().nullable().optional(),
  log: z.array(activityEntrySchema),
});

export const progressEnvelopeSchema = z.object({
  progress: progressSchema,
});

export const teamMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  initials: z.string().min(1),
  since: z.string(),
  seals: z.number().int().nonnegative(),
  current: z.number().int(),
  essentials: z.number().int().nonnegative(),
  quizzesApproved: z.number().int().nonnegative(),
  lastActivity: z.string(),
  stalled: z.boolean().optional(),
});

export const teamOverviewSchema = z.object({
  members: z.array(teamMemberSchema),
});

export function toAuthUser(input: z.infer<typeof authUserSchema>): AuthUser {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role as UserRole,
    initials: input.initials,
  };
}

export function toProgressData(input: z.infer<typeof progressSchema>): ProgressData {
  return {
    concluidas: input.concluidas,
    checks: input.checks,
    quiz: input.quiz as Record<string, QuizResult>,
    selos: input.selos,
    xp: input.xp,
    sequencia: input.sequencia,
    ultimoDiaAtivo: input.ultimoDiaAtivo ?? null,
    log: input.log as ActivityEntry[],
  };
}
