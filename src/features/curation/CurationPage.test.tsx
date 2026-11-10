import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { generatedChecks } from '@/content/checks';
import { effectiveGeneratedQuizzes } from '@/content/quizzes.effective';
import { createEmptyCuration } from '@/domain/curation';
import { useAuthStore } from '@/stores/auth';
import { useCurationStore } from '@/stores/curation';
import { CurationPage } from './CurationPage';

const FIRST_LESSON = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';
const FIRST_TITLE = 'Acesso do sistema · App e painel';
/** Aula de outro grupo, usada para conferir o filtro. */
const OTHER_GROUP_TITLE = 'Cadastro de categorias no PDV';
/** Primeiro módulo com quiz gerado — o primeiro quiz da fila. */
const FIRST_QUIZ_MODULE = 'primeiros-passos--acesso-ao-sistema';
const FIRST_QUIZ_TITLE = 'Quiz · Acesso ao sistema';

beforeEach(() => {
  localStorage.clear();
  useCurationStore.setState(createEmptyCuration());
  useAuthStore.setState({
    status: 'anonimo',
    user: null,
    token: null,
    error: null,
    isSubmitting: false,
  });
});

function renderCuration() {
  return render(
    <MemoryRouter>
      <CurationPage />
    </MemoryRouter>,
  );
}

function itemOf(title: string): HTMLElement {
  const item = screen.getByText(title).closest('li');
  expect(item).not.toBeNull();
  return item as HTMLElement;
}

describe('CurationPage', () => {
  it('mostra a fila com os itens que aguardam revisão', () => {
    renderCuration();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Fila de revisão das perguntas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aguardando revisão')).toBeInTheDocument();
    expect(screen.getByText(/itens na fila/)).toBeInTheDocument();

    // A primeira aula da trilha entra na fila.
    expect(screen.getByText(FIRST_TITLE)).toBeInTheDocument();
  });

  it('mostra as perguntas geradas para o revisor não precisar sair da tela', () => {
    renderCuration();

    const item = itemOf(FIRST_TITLE);
    expect(within(item).getAllByText(/Resposta:/).length).toBeGreaterThan(0);
  });

  it('registra a aprovação e tira a aula da fila de pendentes', () => {
    renderCuration();

    fireEvent.click(within(itemOf(FIRST_TITLE)).getByRole('button', { name: 'Aprovar' }));

    expect(useCurationStore.getState().approvals[FIRST_LESSON]?.decision).toBe('aprovado');
    expect(screen.queryByText(FIRST_TITLE)).not.toBeInTheDocument();
  });

  it('registra o pedido de ajuste e mantém a aula na fila de ajustes', () => {
    renderCuration();

    fireEvent.click(within(itemOf(FIRST_TITLE)).getByRole('button', { name: 'Pedir ajuste' }));

    expect(useCurationStore.getState().approvals[FIRST_LESSON]?.decision).toBe('ajuste');

    fireEvent.click(screen.getByRole('button', { name: 'Precisam de ajuste' }));

    expect(screen.getByText(FIRST_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Precisa de ajuste')).toBeInTheDocument();
  });

  it('registra quem revisou quando há sessão', () => {
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

    renderCuration();

    fireEvent.click(within(itemOf(FIRST_TITLE)).getByRole('button', { name: 'Aprovar' }));

    expect(useCurationStore.getState().approvals[FIRST_LESSON]?.by).toBe('Fábio Ribeiro');
  });

  it('reabre uma aula revisada', () => {
    useCurationStore.setState({
      approvals: { [FIRST_LESSON]: { decision: 'aprovado', at: '2026-11-09' } },
    });

    renderCuration();

    fireEvent.click(screen.getByRole('button', { name: 'Aprovadas' }));

    fireEvent.click(within(itemOf(FIRST_TITLE)).getByRole('button', { name: 'Reabrir' }));

    expect(useCurationStore.getState().approvals[FIRST_LESSON]).toBeUndefined();
  });

  it('filtra por grupo', () => {
    renderCuration();

    const select = screen.getByRole('combobox', { name: 'Filtrar por grupo' });

    fireEvent.change(select, { target: { value: 'primeiros-passos' } });

    expect(screen.getByText(FIRST_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(OTHER_GROUP_TITLE)).not.toBeInTheDocument();
  });

  it('avisa quando a fila está em dia', () => {
    useCurationStore.setState({
      approvals: Object.fromEntries(
        [...generatedChecks.keys()].map((lessonId) => [
          lessonId,
          { decision: 'aprovado' as const, at: '2026-11-09' },
        ]),
      ),
      quizApprovals: Object.fromEntries(
        effectiveGeneratedQuizzes.map((quiz) => [
          quiz.moduleId,
          { decision: 'aprovado' as const, at: '2026-11-09' },
        ]),
      ),
    });

    renderCuration();

    expect(
      screen.getByText('Nenhum item aguardando revisão. A fila está em dia.'),
    ).toBeInTheDocument();
  });
});

describe('CurationPage · quizzes dos módulos', () => {
  it('coloca o quiz do módulo na fila, depois das aulas dele', () => {
    renderCuration();

    expect(screen.getByText(FIRST_QUIZ_TITLE)).toBeInTheDocument();

    const item = itemOf(FIRST_QUIZ_TITLE);
    expect(within(item).getByText(/quiz do módulo/)).toBeInTheDocument();
  });

  it('mostra o selo do quiz reescrito por IA e as perguntas para revisão', () => {
    renderCuration();

    const item = itemOf(FIRST_QUIZ_TITLE);

    expect(within(item).getByText('reformulado com IA · aguardando revisão')).toBeInTheDocument();
    // A situação de atendimento vem antes do enunciado.
    expect(within(item).getAllByText(/Resposta:/).length).toBeGreaterThan(0);
  });

  it('registra a aprovação do quiz no store e tira o item dos pendentes', () => {
    renderCuration();

    fireEvent.click(within(itemOf(FIRST_QUIZ_TITLE)).getByRole('button', { name: 'Aprovar' }));

    expect(useCurationStore.getState().quizApprovals[FIRST_QUIZ_MODULE]?.decision).toBe('aprovado');
    expect(screen.queryByText(FIRST_QUIZ_TITLE)).not.toBeInTheDocument();
  });

  it('registra o pedido de ajuste do quiz e devolve o item para a fila de ajustes', () => {
    renderCuration();

    fireEvent.click(within(itemOf(FIRST_QUIZ_TITLE)).getByRole('button', { name: 'Pedir ajuste' }));

    expect(useCurationStore.getState().quizApprovals[FIRST_QUIZ_MODULE]?.decision).toBe('ajuste');

    fireEvent.click(screen.getByRole('button', { name: 'Precisam de ajuste' }));

    expect(screen.getByText(FIRST_QUIZ_TITLE)).toBeInTheDocument();
  });
});
