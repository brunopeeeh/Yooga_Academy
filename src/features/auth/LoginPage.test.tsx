import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { LoginPage } from './LoginPage';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    status: 'anonimo',
    user: null,
    token: null,
    error: null,
    isSubmitting: false,
  });
  vi.unstubAllEnvs();
});

function renderLogin(path = '/entrar') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/" element={<div>Página inicial</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('mostra o formulário e o modo local', () => {
    renderLogin();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Entrar no Academy' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByText('Modo local')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Entrar como Ana Nascimento · Analista/ }),
    ).toBeInTheDocument();
  });

  it('autentica com uma conta de demonstração e volta para o destino', async () => {
    renderLogin('/entrar?redirect=%2Flider');

    fireEvent.click(screen.getByRole('button', { name: /Entrar como Fábio Ribeiro · Líder/ }));

    await waitFor(() => expect(useAuthStore.getState().status).toBe('autenticado'));
    expect(useAuthStore.getState().user?.role).toBe('lider');
  });

  it('mostra o erro quando as credenciais são inválidas', async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'lider@demo.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(useAuthStore.getState().status).toBe('anonimo');
  });

  it('não mostra as contas de demonstração quando a API está habilitada', () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');

    renderLogin();

    expect(screen.queryByText('Modo local')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Entrar como Ana Nascimento/ }),
    ).not.toBeInTheDocument();
  });
});
