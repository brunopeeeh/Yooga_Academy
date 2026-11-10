import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCohortPlan } from '@/domain/pacing';
import { useAuthStore } from '@/stores/auth';
import { CohortPacingPage } from './CohortPacingPage';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    status: 'autenticado',
    user: {
      id: 'demo-lider',
      name: 'Fábio Ribeiro',
      email: 'lider@demo.local',
      role: 'lider',
      initials: 'FR',
    },
    token: 'demo:demo-lider',
    error: null,
    isSubmitting: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function renderCohortPacing() {
  render(
    <MemoryRouter>
      <CohortPacingPage />
    </MemoryRouter>,
  );
}

describe('CohortPacingPage', () => {
  it('renderiza o cabeçalho, turma ativa, as 4 semanas e a tabela de analistas', () => {
    renderCohortPacing();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Gestão de Turmas & Pacing' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Turma Onboarding 2026.11')).toBeInTheDocument();
    expect(screen.getAllByText('Semana 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Semana 2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Semana 3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Semana 4').length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole('heading', { level: 2, name: /Roadmap Sugerido de Pacing/ }),
    ).toBeInTheDocument();

    expect(screen.getByText('Fábio')).toBeInTheDocument();
    expect(screen.getByText('Diego')).toBeInTheDocument();
  });

  it('permite alternar a semana e salvar nova mensagem do líder', () => {
    renderCohortPacing();

    // Seleciona a Semana 3
    const week3Btn = screen.getByRole('radio', { name: /Semana 3/ });
    fireEvent.click(week3Btn);
    expect(week3Btn).toHaveAttribute('aria-checked', 'true');

    // Altera a mensagem do líder
    const textarea = screen.getByLabelText(/Recado do Líder para esta Semana/);
    fireEvent.change(textarea, {
      target: { value: 'Atenção redobrada na homologação de marketplaces!' },
    });

    // Salva o plano
    fireEvent.click(
      screen.getByRole('button', { name: 'Publicar Meta & Recado para o Time' }),
    );

    // Verifica persistência no domain/localStorage
    const saved = loadCohortPlan();
    expect(saved.currentWeek).toBe(3);
    expect(saved.leaderMessage).toBe(
      'Atenção redobrada na homologação de marketplaces!',
    );
  });
});

