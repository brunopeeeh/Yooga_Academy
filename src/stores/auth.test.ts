import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    status: 'anonimo',
    user: null,
    token: null,
    error: null,
    isSubmitting: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('authStore', () => {
  it('valida e-mail e senha antes de qualquer chamada', async () => {
    const ok = await useAuthStore.getState().login({ email: 'invalido', password: '' });

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe('Informe e-mail e senha.');
  });

  it('recusa e-mail malformado', async () => {
    const ok = await useAuthStore.getState().login({ email: 'ana@', password: 'demo' });

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe('E-mail inválido.');
  });

  it('autentica com as contas de demonstração quando a API está desligada', async () => {
    vi.stubEnv('VITE_API_MODE', 'offline');

    const ok = await useAuthStore.getState().login({ email: 'lider@demo.local', password: 'demo' });

    expect(ok).toBe(true);
    expect(useAuthStore.getState().status).toBe('autenticado');
    expect(useAuthStore.getState().user?.role).toBe('lider');
    expect(useAuthStore.getState().token).toBe('demo:demo-lider');
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('recusa credenciais inválidas no modo local', async () => {
    vi.stubEnv('VITE_API_MODE', 'offline');

    const ok = await useAuthStore
      .getState()
      .login({ email: 'lider@demo.local', password: 'errada' });

    expect(ok).toBe(false);
    expect(useAuthStore.getState().status).toBe('anonimo');
    expect(useAuthStore.getState().error).toBe('E-mail ou senha inválidos.');
  });

  it('usa a API quando ela está habilitada', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          token: 'jwt-123',
          user: {
            id: 'u1',
            name: 'Ana Nascimento',
            email: 'ana@yooga.com.br',
            role: 'analista',
            initials: 'AN',
          },
        }),
      }),
    );

    const ok = await useAuthStore
      .getState()
      .login({ email: 'ana@yooga.com.br', password: 'segredo' });

    expect(ok).toBe(true);
    expect(useAuthStore.getState().token).toBe('jwt-123');
    expect(useAuthStore.getState().user?.email).toBe('ana@yooga.com.br');
  });

  it('traduz resposta 401 da API em erro de credenciais', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    const ok = await useAuthStore
      .getState()
      .login({ email: 'ana@yooga.com.br', password: 'errada' });

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe('E-mail ou senha inválidos.');
  });

  it('limpa a sessão ao sair', async () => {
    useAuthStore.setState({
      status: 'autenticado',
      user: {
        id: 'u1',
        name: 'Ana Nascimento',
        email: 'ana@yooga.com.br',
        role: 'analista',
        initials: 'AN',
      },
      token: 'demo:demo-analista',
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().status).toBe('anonimo');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('restaura a sessão guardada quando a API está desligada', async () => {
    vi.stubEnv('VITE_API_MODE', 'offline');
    useAuthStore.setState({
      status: 'desconhecido',
      user: {
        id: 'u1',
        name: 'Ana Nascimento',
        email: 'ana@yooga.com.br',
        role: 'analista',
        initials: 'AN',
      },
      token: 'demo:demo-analista',
    });

    await useAuthStore.getState().restore();

    expect(useAuthStore.getState().status).toBe('autenticado');
  });

  it('descarta a sessão quando a API responde 401', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );
    useAuthStore.setState({
      status: 'desconhecido',
      user: {
        id: 'u1',
        name: 'Ana Nascimento',
        email: 'ana@yooga.com.br',
        role: 'analista',
        initials: 'AN',
      },
      token: 'jwt-velho',
    });

    await useAuthStore.getState().restore();

    expect(useAuthStore.getState().status).toBe('anonimo');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('mantém a sessão em cache quando a API está fora do ar', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    useAuthStore.setState({
      status: 'desconhecido',
      user: {
        id: 'u1',
        name: 'Ana Nascimento',
        email: 'ana@yooga.com.br',
        role: 'analista',
        initials: 'AN',
      },
      token: 'jwt-cache',
    });

    await useAuthStore.getState().restore();

    expect(useAuthStore.getState().status).toBe('autenticado');
    expect(useAuthStore.getState().token).toBe('jwt-cache');
  });
});
