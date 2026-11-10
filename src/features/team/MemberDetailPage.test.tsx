import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProgress } from '@/domain/progress';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { MemberDetailPage } from './MemberDetailPage';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
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

function renderMemberDetail(memberId = 'exemplo-diego') {
  render(
    <MemoryRouter initialEntries={[`/lider/analista/${memberId}`]}>
      <Routes>
        <Route path="/lider/analista/:memberId" element={<MemberDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemberDetailPage', () => {
  it('renderiza o cabeçalho, status e KPIs do analista selecionado', () => {
    renderMemberDetail('exemplo-diego');

    expect(screen.getByRole('heading', { level: 1, name: 'Diego' })).toBeInTheDocument();
    expect(screen.getByText('DI')).toBeInTheDocument();
    expect(screen.getByText('Sem atividade (+3 dias)')).toBeInTheDocument();
    expect(screen.getByText(/desde 20 out/)).toBeInTheDocument();

    // KPIs
    expect(screen.getByText('Selos Conquistados')).toBeInTheDocument();
    expect(screen.getByText('Aulas Essenciais')).toBeInTheDocument();
    expect(screen.getByText('Quizzes Aprovados')).toBeInTheDocument();
    expect(screen.getByText('Última Atividade')).toBeInTheDocument();
  });

  it('navega entre as abas e exibe os 8 grupos na aba de trilha', () => {
    renderMemberDetail('exemplo-diego');

    // Aba inicial: Trilha e Competências
    expect(screen.getByRole('tab', { name: /Trilha e Competências/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Primeiros passos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'PDV (Mesa e balcão)' })).toBeInTheDocument();

    // Muda para Histórico de Quizzes
    const quizzesTab = screen.getByRole('tab', { name: /Histórico de Quizzes/ });
    fireEvent.click(quizzesTab);

    expect(quizzesTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Pontos de Atenção Identificados')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('permite registrar uma nova pauta de 1:1 e salvar meta da semana', () => {
    renderMemberDetail('exemplo-diego');

    // Clica na aba Pauta de 1:1
    const pautaTab = screen.getByRole('tab', { name: /Pauta de 1:1 e Metas/ });
    fireEvent.click(pautaTab);

    // Adiciona anotação
    const textarea = screen.getByLabelText('Texto da anotação de 1:1');
    fireEvent.change(textarea, { target: { value: 'Reforçar fluxo de sangria e fechamento no PDV' } });

    const categorySelect = screen.getByLabelText('Categoria da anotação');
    fireEvent.change(categorySelect, { target: { value: 'atencao' } });

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar à Pauta' }));

    // A anotação deve aparecer no histórico
    expect(screen.getByText('Reforçar fluxo de sangria e fechamento no PDV')).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();

    // Salva meta da semana
    const goalInput = screen.getByPlaceholderText(/Ex: Concluir o Grupo 2/);
    fireEvent.change(goalInput, { target: { value: 'Concluir Grupo 2 até sexta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Meta' }));

    expect(screen.getByText('Meta ativa:')).toBeInTheDocument();
    expect(screen.getByText('Concluir Grupo 2 até sexta')).toBeInTheDocument();

    // Verifica persistência no localStorage
    expect(localStorage.getItem('yooga.academy.goal_exemplo-diego')).toBe(
      'Concluir Grupo 2 até sexta',
    );
  });

  it('mostra mensagem amigável quando o analista não é encontrado', () => {
    renderMemberDetail('analista-inexistente');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Analista não encontrado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar para o Dashboard/ })).toBeInTheDocument();
  });
});
