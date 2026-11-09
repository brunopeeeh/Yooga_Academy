import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as QuizzesContent from '@/content/quizzes';
import { catalog } from '@/data/catalog';
import { createEmptyProgress } from '@/domain/progress';
import { useProgressStore } from '@/stores/progress';
import { useQuizResultStore } from '@/stores/quizResult';
import { QuizPage } from './QuizPage';

/**
 * O módulo abaixo já tem quiz gerado a partir dos artigos. O mock devolve
 * `undefined` para ele só para exercitar a rede de segurança: a tela de
 * "conteúdo em migração" com a simulação de resultado.
 */
vi.mock('@/content/quizzes', async (importOriginal) => {
  const actual = await importOriginal<typeof QuizzesContent>();

  return {
    ...actual,
    getQuiz: (moduleId: string) =>
      moduleId === 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque'
        ? undefined
        : actual.getQuiz(moduleId),
  };
});

const GROUP = 'pdv-mesa-e-balcao';
const MODULE = 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio';
const MODULE_WITHOUT_CONTENT =
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque';
const GENERATED_MODULE = 'pdv-mesa-e-balcao--historico-de-vendas';

const ESSENTIALS = [
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-categorias-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-produtos-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-complementos-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-combos-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--pizza-de-mais-de-um-sabor-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--ativar-funcao-pesavel-nos-produtos',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--ficha-tecnica-cadastro-de-receitas-insumos',
];

const ESSENTIALS_WITHOUT_CONTENT = [
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque--cadastro-de-formas-de-pagamento-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque--como-adicionar-um-desconto',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque--cadastro-de-clientes',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque--programa-de-cashback',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque--fidelidade-unificada-pdv-e-delivery',
];

const ESSENTIALS_GENERATED = [
  'pdv-mesa-e-balcao--historico-de-vendas--como-operar-pelo-caixa',
  'pdv-mesa-e-balcao--historico-de-vendas--como-adicionar-duas-formas-de-pagamento-na-venda',
  'pdv-mesa-e-balcao--historico-de-vendas--como-cancelar-vendas',
  'pdv-mesa-e-balcao--historico-de-vendas--senha-para-cancelamento-de-venda',
  'pdv-mesa-e-balcao--historico-de-vendas--como-reimprimir-venda-cupom-fiscal',
];

const CORRECT_ANSWERS = [
  'Criando duas categorias de complemento no produto',
  'Só Administrador ou Gerente criam produtos',
  'Controle interno e manter vendas, estoque e relatórios certos com o iFood',
  'Foram substituídas pelos complementos copiados',
  'Marca Pesável e coloca o preço do kg no valor de venda',
  'Sem Preenchimento Obrigatório e máximo 2',
];

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
  useQuizResultStore.getState().clearResult();
});

function completeLessons(ids: readonly string[]) {
  act(() => {
    for (const [index, id] of ids.entries()) {
      useProgressStore.getState().completeLesson({ id, titulo: `Aula ${index + 1}` });
    }
  });
}

function renderQuiz(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/quiz/:moduleId" element={<QuizPage />} />
        <Route path="/resultado/:moduleId" element={<ResultadoProbe />} />
        <Route path="/grupo/:groupId/:moduleId" element={<div>Página do módulo</div>} />
        <Route path="/" element={<div>Página inicial</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function ResultadoProbe() {
  return <div>Página de resultado</div>;
}

function answerCurrent(answer: string, last: boolean) {
  fireEvent.click(screen.getByRole('radio', { name: answer }));
  fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
  fireEvent.click(
    screen.getByRole('button', { name: last ? 'Ver resultado' : 'Próxima pergunta' }),
  );
}

describe('QuizPage', () => {
  it('redireciona o quiz bloqueado para o módulo', () => {
    renderQuiz(`/quiz/${MODULE}`);

    expect(screen.getByText('Página do módulo')).toBeInTheDocument();
  });

  it('mostra a situação, as alternativas e o feedback da pergunta', () => {
    completeLessons(ESSENTIALS);
    renderQuiz(`/quiz/${MODULE}`);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Como o cliente organiza isso?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Dona Lúcia, cliente fictícia')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByText('1 de 6')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '✕ Sair do quiz' })).toHaveAttribute(
      'href',
      `/grupo/${GROUP}/${MODULE}`,
    );

    const respond = screen.getByRole('button', { name: 'Responder' });
    expect(respond).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: CORRECT_ANSWERS[0] ?? '' }));
    expect(respond).toBeEnabled();

    fireEvent.click(respond);

    expect(screen.getByText('Isso! +5 XP')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Categorias de complemento agrupam as escolhas por tipo: uma para molhos, outra para adicionais.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima pergunta' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima pergunta' }));

    expect(screen.getByText('2 de 6')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'O que explica isso?' }),
    ).toBeInTheDocument();
  });

  it('conclui 6/6, soma XP e abre o resultado', () => {
    completeLessons(ESSENTIALS);
    renderQuiz(`/quiz/${MODULE}`);

    CORRECT_ANSWERS.forEach((answer, index) => {
      answerCurrent(answer, index === CORRECT_ANSWERS.length - 1);
    });

    expect(screen.getByText('Página de resultado')).toBeInTheDocument();
    expect(useProgressStore.getState().quiz[MODULE]).toEqual({
      melhor: 6,
      total: 6,
      aprovado: true,
    });
    expect(useProgressStore.getState().xp).toBe(7 * 10 + 6 * 5);

    const result = useQuizResultStore.getState().result;
    expect(result?.approved).toBe(true);
    expect(result?.correct).toBe(6);
    expect(result?.answers).toHaveLength(6);
    expect(result?.sealAwarded).toBe(false);
  });

  it('reprova com 3/6 e mantém a melhor tentativa', () => {
    completeLessons(ESSENTIALS);
    renderQuiz(`/quiz/${MODULE}`);

    CORRECT_ANSWERS.forEach((answer, index) => {
      if (index < 3) {
        answerCurrent(answer, index === CORRECT_ANSWERS.length - 1);
        return;
      }

      const wrong = screen
        .getAllByRole('radio')
        .find((option) => !option.textContent?.includes(answer));
      fireEvent.click(wrong!);
      fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
      fireEvent.click(
        screen.getByRole('button', {
          name: index === CORRECT_ANSWERS.length - 1 ? 'Ver resultado' : 'Próxima pergunta',
        }),
      );
    });

    expect(useProgressStore.getState().quiz[MODULE]?.aprovado).toBe(false);
    expect(useProgressStore.getState().quiz[MODULE]?.melhor).toBe(3);
    expect(useQuizResultStore.getState().result?.approved).toBe(false);
  });

  it('simula a tentativa em módulo cujo quiz ainda não foi migrado', () => {
    completeLessons(ESSENTIALS_WITHOUT_CONTENT);
    renderQuiz(`/quiz/${MODULE_WITHOUT_CONTENT}`);

    expect(screen.getByText('Conteúdo em migração')).toBeInTheDocument();
    expect(screen.getByText(/perguntas deste quiz ainda não foram migradas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simular 6/6' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simular 6/6' }));

    expect(screen.getByText('Página de resultado')).toBeInTheDocument();
    expect(useProgressStore.getState().quiz[MODULE_WITHOUT_CONTENT]?.melhor).toBe(6);
    expect(useQuizResultStore.getState().result?.answers).toEqual([]);
  });

  it('mostra o quiz gerado a partir dos artigos do módulo', () => {
    completeLessons(ESSENTIALS_GENERATED);
    renderQuiz(`/quiz/${GENERATED_MODULE}`);

    expect(screen.getByText('gerado a partir dos artigos')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /qual é o próximo passo\?$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tô com uma dúvida sobre operar pelo Caixa.')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByText('1 de 6')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo em migração')).not.toBeInTheDocument();
  });

  it('abre o quiz final liberado com os selos completos', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      selos: Object.fromEntries(catalog.grupos.map((group) => [group.id, true as const])),
    });

    renderQuiz('/quiz/final');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Como o cliente organiza isso?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Quiz final de revisão')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '✕ Sair do quiz' })).toHaveAttribute('href', '/');
  });
});
