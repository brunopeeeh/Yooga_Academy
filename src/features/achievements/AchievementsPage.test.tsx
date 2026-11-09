import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProgress } from '@/domain/progress';
import { useProgressStore } from '@/stores/progress';
import { AchievementsPage } from './AchievementsPage';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
});

function renderAchievements() {
  render(
    <MemoryRouter>
      <AchievementsPage />
    </MemoryRouter>,
  );
}

describe('AchievementsPage', () => {
  it('mostra o perfil, os níveis e o estado vazio do histórico', () => {
    renderAchievements();

    expect(screen.getByRole('heading', { level: 1, name: 'Ana Nascimento' })).toBeInTheDocument();
    expect(screen.getByText('Nível 1 · Aprendiz')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('dias seguidos')).toBeInTheDocument();
    expect(screen.getByText('acerto nos quizzes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selos de grupo · 0 de 8' })).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma conquista ainda/)).toBeInTheDocument();
  });

  it('reflete nível, selo, acertos e histórico do progresso', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      xp: 300,
      sequencia: 3,
      selos: { 'pdv-mesa-e-balcao': true },
      quiz: {
        'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio': {
          melhor: 5,
          total: 6,
          aprovado: true,
        },
      },
      log: [
        { id: 'e1', text: 'Concluiu Cadastro de categorias no PDV', when: 'ontem', xp: 10 },
        { id: 'e2', text: 'Selo PDV (Mesa e balcão)', when: '4 nov', xp: 30 },
      ],
    });

    renderAchievements();

    expect(screen.getByText('Nível 2 · Praticante')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selos de grupo · 1 de 8' })).toBeInTheDocument();
    expect(screen.getByText('Conquistado')).toBeInTheDocument();
    expect(screen.getByText('Concluiu Cadastro de categorias no PDV')).toBeInTheDocument();
    expect(screen.getByText('Selo PDV (Mesa e balcão)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /PDV \(Mesa e balcão\)/ })).toHaveAttribute(
      'href',
      '/grupo/pdv-mesa-e-balcao',
    );
  });
});
