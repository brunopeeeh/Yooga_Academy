import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProgress } from '@/domain/progress';
import { useProgressStore } from '@/stores/progress';
import { syncProgressFromRemote, syncProgressToRemote } from './progressSync';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('progressSync', () => {
  it('não faz nada quando a API está desligada', async () => {
    vi.stubEnv('VITE_API_MODE', 'offline');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await syncProgressFromRemote('token')).toBe(false);
    expect(await syncProgressToRemote('token')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mescla o progresso do servidor com o local', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          progress: {
            concluidas: { 'aula-remota': true },
            checks: {},
            quiz: { modulo: { melhor: 5, total: 6, aprovado: true } },
            selos: { 'primeiros-passos': true },
            xp: 80,
            sequencia: 2,
            log: [],
          },
        }),
      }),
    );

    useProgressStore.setState({
      ...createEmptyProgress(),
      concluidas: { 'aula-local': true },
      xp: 40,
    });

    const synced = await syncProgressFromRemote('token');

    expect(synced).toBe(true);

    const state = useProgressStore.getState();
    expect(state.concluidas).toEqual({ 'aula-remota': true, 'aula-local': true });
    expect(state.quiz.modulo?.melhor).toBe(5);
    expect(state.selos['primeiros-passos']).toBe(true);
    expect(state.xp).toBe(80);
  });

  it('envia o progresso local para o servidor', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    useProgressStore.setState({ ...createEmptyProgress(), xp: 30 });

    const pushed = await syncProgressToRemote('token');

    expect(pushed).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test.local/progress');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toMatchObject({ progress: { xp: 30 } });
  });

  it('não quebra o app quando a API falha', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    expect(await syncProgressFromRemote('token')).toBe(false);
    expect(await syncProgressToRemote('token')).toBe(false);
  });
});
