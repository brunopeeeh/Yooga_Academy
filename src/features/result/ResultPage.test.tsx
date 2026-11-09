import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProgress } from '@/domain/progress';
import { useProgressStore } from '@/stores/progress';
import { useQuizResultStore, type QuizAttemptSummary } from '@/stores/quizResult';
import { useToastStore } from '@/stores/toast';
import { ResultPage } from './ResultPage';

const GROUP = 'pdv-mesa-e-balcao';
const MODULE = 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio';
const NEXT_MODULE = 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque';

const APPROVED_ANSWERS = [0, 1, 1, 1, 1, 1];
const FAILED_ANSWERS = [0, 1, 1, 0, 0, 0];

function attempt(overrides: Partial<QuizAttemptSummary> = {}): QuizAttemptSummary {
  return {
    moduleId: MODULE,
    correct: 6,
    total: 6,
    approved: true,
    answers: APPROVED_ANSWERS,
    previousBest: 0,
    answerXp: 30,
    sealXp: 0,
    sealAwarded: false,
    leveledUp: false,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
  useQuizResultStore.getState().clearResult();
  useToastStore.getState().clear();
});

function renderResult(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/resultado/:moduleId" element={<ResultPage />} />
        <Route path="/quiz/:moduleId" element={<div>Página do quiz</div>} />
        <Route path="/" element={<div>Página inicial</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResultPage', () => {
  it('volta para o quiz quando não há resultado na sessão', () => {
    renderResult(`/resultado/${MODULE}`);

    expect(screen.getByText('Página do quiz')).toBeInTheDocument();
  });

  it('mostra o resultado aprovado, a revisão e o XP da tentativa', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      xp: 30,
      quiz: { [MODULE]: { melhor: 6, total: 6, aprovado: true } },
    });
    useQuizResultStore.getState().setResult(attempt());

    renderResult(`/resultado/${MODULE}`);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Cardápio dominado.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('6/6')).toBeInTheDocument();
    expect(screen.getByText('Aprovado · mínimo 70%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revisão das respostas' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Certa')).toHaveLength(6);

    expect(screen.getByText('XP desta tentativa')).toBeInTheDocument();
    expect(screen.getByText('+30 XP')).toBeInTheDocument();
    expect(screen.getByText('Selo PDV (Mesa e balcão) · 1 de 7 quizzes')).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: 'Próximo módulo · Configurações gerais do PDV · Pagamento, clientes e estoque',
      }),
    ).toHaveAttribute('href', `/grupo/${GROUP}/${NEXT_MODULE}`);
    expect(screen.getByRole('link', { name: 'Refazer o quiz' })).toHaveAttribute(
      'href',
      `/quiz/${MODULE}`,
    );
  });

  it('mostra o resultado reprovado e o caminho de revisão', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      xp: 15,
      quiz: { [MODULE]: { melhor: 3, total: 6, aprovado: false } },
    });
    useQuizResultStore.getState().setResult(
      attempt({
        correct: 3,
        approved: false,
        answers: FAILED_ANSWERS,
        answerXp: 15,
      }),
    );

    renderResult(`/resultado/${MODULE}`);

    expect(screen.getByRole('heading', { level: 1, name: 'Faltou pouco.' })).toBeInTheDocument();
    expect(screen.getByText('Ainda não · mínimo 70%')).toBeInTheDocument();
    expect(screen.getByText(/Você precisa de 5 acertos/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Certa')).toHaveLength(3);
    expect(screen.getAllByLabelText('Errada')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Revisar as aulas' })).toHaveAttribute(
      'href',
      `/grupo/${GROUP}/${MODULE}`,
    );
    expect(screen.getByText('+15 XP')).toBeInTheDocument();
  });

  it('comemora o selo e avisa no toast', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      xp: 100,
      selos: { [GROUP]: true },
      quiz: { [MODULE]: { melhor: 6, total: 6, aprovado: true } },
    });
    useQuizResultStore
      .getState()
      .setResult(attempt({ sealAwarded: true, sealXp: 30, answerXp: 30 }));

    renderResult(`/resultado/${MODULE}`);

    expect(screen.getByText('Selo conquistado: PDV (Mesa e balcão)')).toBeInTheDocument();
    expect(screen.getByText('+60 XP')).toBeInTheDocument();
    expect(useToastStore.getState().toasts.map((item) => item.message)).toContain(
      'Selo conquistado: PDV (Mesa e balcão)',
    );
  });

  it('fecha a revisão final com CTA para o início', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      xp: 30,
      quiz: { final: { melhor: 6, total: 6, aprovado: true } },
    });
    useQuizResultStore.getState().setResult(
      attempt({
        moduleId: 'final',
        answers: [0, 1, 1, 1, 1, 1],
      }),
    );

    renderResult('/resultado/final');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Revisão concluída.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Você fechou o onboarding e revisou os pontos principais.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Refazer o quiz final' })).toHaveAttribute(
      'href',
      '/quiz/final',
    );
    expect(screen.queryByText(/Selo Revisão final/)).not.toBeInTheDocument();
  });
});
