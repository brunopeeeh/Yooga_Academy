import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProgress } from '@/domain/progress';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { TeamPage } from './TeamPage';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
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

function renderTeam() {
  render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  );
}

/**
 * A linha da Ana é localizada pelo grid de selos (`aria-label` estável),
 * e não pelo nome da linha — "Ana" também aparece no cabeçalho "Analistas".
 */
function anaRow() {
  const grid = screen.getByRole('img', { name: /^Ana: \d+ selos?$/ });
  const row = grid.closest('tr');
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

describe('TeamPage', () => {
  it('mostra os KPIs e a tabela com a linha da Ana refletindo o progresso', () => {
    renderTeam();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Onboarding do time' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dados de exemplo/)).toBeInTheDocument();

    expect(screen.getByText('Em onboarding').nextElementSibling).toHaveTextContent('6');
    expect(screen.getByText('Aulas essenciais concluídas').nextElementSibling).toHaveTextContent(
      '89',
    );
    expect(screen.getByText('Aprovação no 1º quiz').nextElementSibling).toHaveTextContent('78%');
    expect(screen.getByText('Sem atividade há 3+ dias úteis').nextElementSibling).toHaveTextContent(
      '1',
    );
    expect(screen.getByText('Diego', { selector: 'span' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Analistas' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(7);

    const ana = anaRow();
    expect(within(ana).getByText('Primeiros passos')).toBeInTheDocument();
    expect(within(ana).getByText('/ 102')).toBeInTheDocument();
    expect(within(ana).getByText('0 aprovados')).toBeInTheDocument();
    expect(within(ana).getByText('agora')).toBeInTheDocument();
    expect(within(ana).getByRole('img', { name: 'Ana: 0 selos' })).toBeInTheDocument();
  });

  it('atualiza a linha da Ana e a distribuição do time com o progresso real', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      concluidas: {
        'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel': true,
        'primeiros-passos--acesso-ao-sistema--como-baixar-o-app-yooga': true,
        'primeiros-passos--acesso-ao-sistema--como-acesso-minha-area-de-gestao': true,
      },
      quiz: {
        'primeiros-passos--acesso-ao-sistema': { melhor: 6, total: 6, aprovado: true },
      },
      selos: { 'primeiros-passos': true },
      xp: 60,
    });

    renderTeam();

    const ana = anaRow();
    expect(within(ana).getByText('PDV (Mesa e balcão)')).toBeInTheDocument();
    expect(within(ana).getByText('3')).toBeInTheDocument();
    expect(within(ana).getByText('1 aprovado')).toBeInTheDocument();
    expect(within(ana).getByRole('img', { name: 'Ana: 1 selos' })).toBeInTheDocument();

    const where = screen.getByRole('region', { name: 'Onde o time está' });
    expect(within(where).getByText('Primeiros passos').nextElementSibling).toHaveTextContent('1');
    expect(within(where).getByText('PDV (Mesa e balcão)').nextElementSibling).toHaveTextContent(
      '4',
    );
  });

  it('mostra as perguntas com mais erro e a legenda', () => {
    renderTeam();

    expect(screen.getByText('Copiar complementos substitui os existentes')).toBeInTheDocument();
    expect(screen.getByText('Quem pode criar produtos')).toBeInTheDocument();

    // "Grupo atual" aparece na legenda e no cabeçalho da tabela: a legenda é
    // escopada pelo próprio rótulo para não ficar ambígua.
    const legend = screen.getByLabelText('Legenda do grid de grupos');
    expect(within(legend).getByText('Selo')).toBeInTheDocument();
    expect(within(legend).getByText('Grupo atual')).toBeInTheDocument();
    expect(within(legend).getByText('Não iniciado')).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: 'Grupo atual' })).toBeInTheDocument();
  });

  it('usa os dados da API quando o líder está autenticado e a API responde', async () => {
    vi.stubEnv('VITE_API_MODE', 'api');
    vi.stubEnv('VITE_API_URL', 'https://api.test.local');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          members: [
            {
              id: 'u9',
              name: 'Marina',
              initials: 'MA',
              since: 'desde 1 nov',
              seals: 3,
              current: 3,
              essentials: 55,
              quizzesApproved: 11,
              lastActivity: 'hoje',
            },
          ],
        }),
      }),
    );
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
    });

    renderTeam();

    expect(await screen.findByText('Marina')).toBeInTheDocument();
    expect(screen.getByText(/Dados da API/)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
