import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyCuration } from '@/domain/curation';
import { createEmptyProgress } from '@/domain/progress';
import { useAuthStore } from '@/stores/auth';
import { useCurationStore } from '@/stores/curation';
import { useLiveRegionStore } from '@/stores/liveRegion';
import { useProgressStore } from '@/stores/progress';
import { useToastStore } from '@/stores/toast';
import { routes } from './router';

const FIRST_LESSON = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';
const FIRST_MODULE = 'primeiros-passos--acesso-ao-sistema';

const ANALISTA = {
  id: 'demo-analista',
  name: 'Ana Nascimento',
  email: 'analista@demo.local',
  role: 'analista' as const,
  initials: 'AN',
};

const LIDER = {
  id: 'demo-lider',
  name: 'Fábio Ribeiro',
  email: 'lider@demo.local',
  role: 'lider' as const,
  initials: 'FR',
};

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
  useCurationStore.setState(createEmptyCuration());
  useAuthStore.setState({
    status: 'anonimo',
    user: null,
    token: null,
    error: null,
    isSubmitting: false,
  });
  useToastStore.getState().clear();
  useLiveRegionStore.getState().clear();
  document.title = 'Yooga Academy';
});

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('shell de navegação', () => {
  it('renderiza header, navegação e a tela inicial', async () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Yooga Academy, início' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Acesso do sistema · App e painel' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Continue de onde parou')).toBeInTheDocument();
    expect(screen.getByText('Nível 1 · Aprendiz')).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);

    await waitFor(() => expect(document.title).toBe('Onboarding · Yooga Academy'));
  });

  it('abre a Biblioteca com a busca de aulas', () => {
    renderRoute('/biblioteca');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Cliente na linha? Ache a aula certa.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar aulas' })).toBeInTheDocument();
    expect(screen.getByText('170 resultados', { selector: 'b' })).toBeInTheDocument();
  });

  it('abre Conquistas com os selos e o histórico', () => {
    renderRoute('/conquistas');

    expect(screen.getByRole('heading', { level: 1, name: 'Ana Nascimento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selos de grupo · 0 de 8' })).toBeInTheDocument();
  });

  it('abre a fila de curadoria', async () => {
    renderRoute('/curadoria');

    // A rota é carregada sob demanda (chunk separado).
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Fila de revisão das perguntas' },
        { timeout: 30_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Aguardando revisão')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Curadoria · Yooga Academy'));
  });

  it('cai no 404 em rotas desconhecidas', async () => {
    renderRoute('/nao-existe');

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Página não encontrada · Yooga Academy'));
  });

  it('ao navegar, volta ao topo, foca o main e anuncia a tela', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderRoute('/');

    const main = screen.getByRole('main');
    expect(main).not.toHaveFocus();

    fireEvent.click(screen.getByRole('link', { name: 'Biblioteca' }));

    await waitFor(() => expect(main).toHaveFocus());
    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
    expect(document.title).toBe('Biblioteca · Yooga Academy');
    expect(screen.getByTestId('live-region')).toHaveTextContent('Biblioteca');
  });
});

describe('sessão e papel', () => {
  it('esconde a visão de time para quem não é líder', async () => {
    renderRoute('/');

    expect(screen.queryByRole('link', { name: 'Meu time' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('mostra a curadoria para todo mundo (não é exclusivo de líder)', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Curadoria' })).toBeInTheDocument();
  });

  it('libera a visão de time para o líder autenticado', async () => {
    useAuthStore.setState({ status: 'autenticado', user: LIDER, token: 'demo:demo-lider' });
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Meu time' })).toBeInTheDocument();
    expect(screen.getByText('Fábio Ribeiro')).toBeInTheDocument();
  });

  it('leva quem não tem sessão para a tela de entrada guardando o destino', async () => {
    renderRoute('/lider');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrar no Academy' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Entrar · Yooga Academy'));
  });

  it('bloqueia deep link para /lider com sessão de analista', async () => {
    useAuthStore.setState({ status: 'autenticado', user: ANALISTA, token: 'demo:demo-analista' });
    renderRoute('/lider');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Acesso do sistema · App e painel' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Onboarding do time' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Essa visão é só para líderes de time.');
  });

  it('abre /lider quando a sessão persistida é de líder', async () => {
    useAuthStore.setState({ status: 'autenticado', user: LIDER, token: 'demo:demo-lider' });
    renderRoute('/lider');

    expect(
      await screen.findByRole('heading', { name: 'Onboarding do time' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('entra como líder e cai direto na visão de time', async () => {
    renderRoute('/lider');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrar no Academy' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Entrar como Fábio Ribeiro · Líder/ }));

    expect(
      await screen.findByRole('heading', { name: 'Onboarding do time' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Meu time · Yooga Academy'));
    expect(screen.getByRole('link', { name: 'Meu time' })).toBeInTheDocument();
  });
});

describe('navegação de conteúdo', () => {
  it('abre o grupo a partir da grade da Home', async () => {
    renderRoute('/');

    fireEvent.click(screen.getByRole('link', { name: /Primeiros passos/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Primeiros passos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Acesso ao sistema' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Módulos · 1')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Primeiros passos · Yooga Academy'));
  });

  it('lista os módulos e as aulas do grupo por deep link', async () => {
    renderRoute(`/grupo/primeiros-passos/${FIRST_MODULE}`);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Acesso ao sistema' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Acesso do sistema · App e painel/ })).toHaveAttribute(
      'href',
      `/aula/${FIRST_LESSON}`,
    );
    await waitFor(() => expect(document.title).toBe('Acesso ao sistema · Yooga Academy'));
  });

  it('abre a aula com o link para a Central e a lista do módulo', async () => {
    renderRoute(`/aula/${FIRST_LESSON}`);

    // A rota da aula é carregada sob demanda (chunk separado).
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Acesso do sistema · App e painel' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Para acessar o aplicativo de vendas/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Texto e imagens extraídos de/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir na Central' })).toHaveAttribute(
      'href',
      expect.stringContaining('ajuda.yooga.com.br'),
    );
    expect(screen.getByRole('link', { name: 'Abrir na Central' })).toHaveAttribute(
      'target',
      '_blank',
    );
    await waitFor(() =>
      expect(document.title).toBe('Acesso do sistema · App e painel · Yooga Academy'),
    );
  });

  it('redireciona o quiz bloqueado para o módulo', async () => {
    renderRoute(`/quiz/${FIRST_MODULE}`);

    // A rota do quiz é carregada sob demanda (chunk separado).
    expect(
      await screen.findByRole(
        'heading',
        { level: 2, name: 'Acesso ao sistema' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Acesso ao sistema · Yooga Academy'));
  });

  it('protege o quiz final enquanto os selos não fecham', async () => {
    renderRoute('/quiz/final');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Acesso do sistema · App e painel' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
  });

  it('mostra entidade não encontrada em deep link inválido', () => {
    renderRoute('/grupo/nao-existe');

    expect(screen.getByRole('heading', { name: 'Grupo não encontrado' })).toBeInTheDocument();
  });
});

describe('feedback do shell', () => {
  it('mostra um toast ao zerar o progresso local', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderRoute('/');

    fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso local' }));

    expect(confirmSpy).toHaveBeenCalledWith('Zerar todo o progresso salvo neste navegador?');
    expect(await screen.findByRole('status')).toHaveTextContent('Progresso local zerado.');
  });
});
