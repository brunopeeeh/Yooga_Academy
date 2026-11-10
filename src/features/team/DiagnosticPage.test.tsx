import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { useCurationStore } from '@/stores/curation';
import { DiagnosticPage } from './DiagnosticPage';

beforeEach(() => {
  localStorage.clear();
  useCurationStore.getState().resetCuration();
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

function renderDiagnostic() {
  render(
    <MemoryRouter>
      <DiagnosticPage />
    </MemoryRouter>,
  );
}

describe('DiagnosticPage', () => {
  it('renderiza o cabeçalho, os 4 KPIs e a tabela de módulos', () => {
    renderDiagnostic();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Diagnóstico de Gaps & Conteúdo' }),
    ).toBeInTheDocument();

    // KPIs
    expect(screen.getByText('Aprovação Média 1º Quiz')).toBeInTheDocument();
    expect(screen.getByText('Módulos Críticos')).toBeInTheDocument();
    expect(screen.getByText('Perguntas Problemáticas')).toBeInTheDocument();
    expect(screen.getByText('Sinalizações para Curadoria')).toBeInTheDocument();

    // Tabela
    expect(screen.getByRole('heading', { name: 'Desempenho por Módulo' })).toBeInTheDocument();
    expect(screen.getByText('Configurações gerais do PDV · Cardápio')).toBeInTheDocument();
    expect(screen.getByText('NFC-e')).toBeInTheDocument();
  });

  it('exibe as perguntas com mais erros e as alternativas', () => {
    renderDiagnostic();

    expect(
      screen.getByRole('heading', { name: 'Top Questões Mais Erradas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ao copiar complementos de um produto para outro no cardápio/),
    ).toBeInTheDocument();
    expect(screen.getByText(/67% erro/)).toBeInTheDocument();
    expect(screen.getByText(/Substitui todos os complementos já existentes/)).toBeInTheDocument();
  });

  it('abre o modal de sinalização e encaminha para a fila de curadoria', () => {
    renderDiagnostic();

    // Clica no primeiro botão de sinalizar para curadoria da lista de perguntas
    const flagButtons = screen.getAllByRole('button', { name: 'Sinalizar para Curadoria' });
    expect(flagButtons.length).toBeGreaterThan(0);
    fireEvent.click(flagButtons[0]!);

    // Modal deve estar aberto
    const modal = screen.getByRole('dialog', { name: 'Encaminhar para Curadoria' });
    expect(modal).toBeInTheDocument();

    // Preenche a observação do líder
    const textarea = screen.getByLabelText(/Observação do Líder para o time de conteúdo/);
    fireEvent.change(textarea, {
      target: { value: 'A tela de complementos mudou na última atualização do sistema.' },
    });

    // Envia para curadoria
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para Fila de Curadoria' }));

    // Modal deve ter fechado
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Verifica se registrou a decisão de ajuste no store de curadoria
    const curationState = useCurationStore.getState();
    expect(
      curationState.quizApprovals['pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio']?.decision,
    ).toBe('ajuste');
    expect(
      curationState.quizApprovals['pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio']?.by,
    ).toContain('Fábio Ribeiro');

    // Verifica persistência no localStorage
    const savedFlags = JSON.parse(
      localStorage.getItem('yooga.academy.leader_curation_flags') ?? '{}',
    );
    expect(savedFlags['crit-1']?.note).toBe(
      'A tela de complementos mudou na última atualização do sistema.',
    );
  });
});
