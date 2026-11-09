import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './http';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    ...response,
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('envia JSON, token e cabeçalhos quando a API está habilitada', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local/');
    const fetchMock = mockFetch({ json: async () => ({ ok: true }) });

    const result = await apiRequest<{ ok: boolean }>('/progress', {
      method: 'PUT',
      token: 'abc',
      body: { progress: { xp: 10 } },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test.local/progress');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ progress: { xp: 10 } }));
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('traduz 401 em erro de não autorizado', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    mockFetch({ ok: false, status: 401 });

    await expect(apiRequest('/auth/me', { token: 'abc' })).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'nao_autorizado',
      status: 401,
    });
  });

  it('traduz falha de rede em erro recuperável', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await apiRequest('/progress').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('rede');
  });

  it('recusa chamadas quando a API está desligada', async () => {
    vi.stubEnv('VITE_API_MODE', 'offline');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    const fetchMock = mockFetch({});

    await expect(apiRequest('/progress')).rejects.toMatchObject({ kind: 'rede' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
