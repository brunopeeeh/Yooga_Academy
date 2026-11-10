import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { CertificatePage } from './CertificatePage';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    status: 'autenticado',
    user: {
      id: 'demo-analista',
      name: 'Ana Silveira',
      email: 'ana@demo.local',
      role: 'analista',
      initials: 'AS',
    },
    token: 'demo:demo-analista',
    error: null,
    isSubmitting: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('CertificatePage', () => {
  it('renderiza o certificado oficial para o usuário autenticado', () => {
    render(
      <MemoryRouter initialEntries={['/certificado']}>
        <Routes>
          <Route path="/certificado" element={<CertificatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Certificado de Conclusão' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ana Silveira')).toBeInTheDocument();
    expect(screen.getByText(/40 horas/)).toBeInTheDocument();
    expect(screen.getByText(/8 Grupos · 100% dos Selos/)).toBeInTheDocument();
    expect(screen.getByText(/Lucas Duarte/)).toBeInTheDocument();
  });

  it('renderiza o certificado oficial com o memberId especificado na URL', () => {
    render(
      <MemoryRouter initialEntries={['/certificado/exemplo-fabio']}>
        <Routes>
          <Route path="/certificado/:memberId" element={<CertificatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Fábio Ribeiro')).toBeInTheDocument();
  });

  it('dispara o comando de impressão ao clicar no botão de imprimir', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/certificado']}>
        <Routes>
          <Route path="/certificado" element={<CertificatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const printBtn = screen.getByRole('button', { name: /Imprimir \/ Salvar em PDF/ });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});

