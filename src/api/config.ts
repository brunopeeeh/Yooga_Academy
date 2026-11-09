/**
 * Configuração da camada de API (Fase 8).
 *
 * O app continua local-first: a API só é usada quando `VITE_API_MODE=api`
 * e `VITE_API_URL` aponta para um servidor. Sem isso, tudo funciona offline
 * com as contas de demonstração do domínio.
 */

export type ApiMode = 'offline' | 'api';

export function apiMode(): ApiMode {
  const raw = import.meta.env.VITE_API_MODE;
  return raw === 'api' ? 'api' : 'offline';
}

export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

export function isApiEnabled(): boolean {
  return apiMode() === 'api' && apiBaseUrl().length > 0;
}

/** Timeout padrão das requisições, em milissegundos. */
export const API_TIMEOUT_MS = 8000;
