import { aiChecks } from './checks.ai.generated';
import { generatedChecks } from './checks';
import type { CheckQuestion } from './types';

/**
 * Perguntas de conferência **efetivas** por aula: a reescrita por IA tem
 * prioridade sobre o enunciado gerado pelo template.
 *
 * Fica num módulo leve de propósito — a fila de curadoria precisa mostrar as
 * perguntas que o analista vai revisar, mas não o texto das 170 aulas
 * (~700 kB).
 */
export const effectiveChecks: ReadonlyMap<string, readonly CheckQuestion[]> = new Map([
  ...generatedChecks,
  ...aiChecks,
]);

/** A aula tem perguntas reescritas por IA (e não só pelo template)? */
export function hasAiRewrite(lessonId: string): boolean {
  return aiChecks.has(lessonId);
}
