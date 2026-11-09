import { API_TIMEOUT_MS, apiBaseUrl, isApiEnabled } from './config';

export type ApiErrorKind = 'rede' | 'nao_autorizado' | 'nao_encontrado' | 'servidor' | 'resposta';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;

  constructor(kind: ApiErrorKind, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  readonly token?: string | null;
  readonly signal?: AbortSignal;
}

function statusToKind(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'nao_autorizado';
  if (status === 404) return 'nao_encontrado';
  if (status >= 500) return 'servidor';
  return 'resposta';
}

/**
 * Requisição JSON para a API do Yooga Academy.
 * Lança `ApiError` com um `kind` estável para que a UI possa reagir
 * (sessão expirada, servidor fora, etc.).
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token, signal }: ApiRequestOptions = {},
): Promise<T> {
  if (!isApiEnabled()) {
    throw new ApiError('rede', 'A API está desligada neste ambiente.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        statusToKind(response.status),
        `A API respondeu ${response.status}.`,
        response.status,
      );
    }

    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('rede', 'A API não respondeu a tempo.');
    }

    throw new ApiError('rede', 'Não foi possível falar com a API.');
  } finally {
    clearTimeout(timeout);
  }
}
