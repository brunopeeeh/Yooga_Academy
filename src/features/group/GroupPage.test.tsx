import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '@/data/catalog';
import { createEmptyProgress } from '@/domain/progress';
import { useProgressStore } from '@/stores/progress';
import { GroupPage } from './GroupPage';

const GROUP = 'pdv-mesa-e-balcao';
const MODULE_1 = 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio';
const MODULE_2 = 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-pagamento-clientes-e-estoque';

const MODULE_1_LESSONS = [
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-categorias-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-produtos-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-complementos-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-combos-no-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--pizza-de-mais-de-um-sabor-pdv',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--ativar-funcao-pesavel-nos-produtos',
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--ficha-tecnica-cadastro-de-receitas-insumos',
];

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
});

function renderGroup(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/grupo/:groupId" element={<GroupPage />} />
        <Route path="/grupo/:groupId/:moduleId" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupPage', () => {
  it('abre o primeiro módulo pendente e lista os módulos do grupo', () => {
    renderGroup(`/grupo/${GROUP}`);

    expect(
      screen.getByRole('heading', { level: 1, name: 'PDV (Mesa e balcão)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Configurações gerais do PDV · Cardápio' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Módulos · 7')).toBeInTheDocument();
    expect(screen.getByText('0 de 29 aulas essenciais')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /Configurações gerais do PDV · Cardápio/ }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('respeita o módulo explícito da URL', () => {
    renderGroup(`/grupo/${GROUP}/${MODULE_2}`);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Configurações gerais do PDV · Pagamento, clientes e estoque',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Configurações gerais do PDV · Pagamento, clientes e estoque/,
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('lista as aulas essenciais com link e mantém o quiz bloqueado', () => {
    renderGroup(`/grupo/${GROUP}/${MODULE_1}`);

    expect(screen.getByRole('link', { name: /Cadastro de produtos no PDV/ })).toHaveAttribute(
      'href',
      '/aula/pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-produtos-no-pdv',
    );
    expect(screen.getByText('0 de 7 essenciais')).toBeInTheDocument();
    expect(screen.getByText(/conclua 7 aulas essenciais para liberar/)).toBeInTheDocument();
    expect(screen.getByText('7 para liberar')).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Quiz do módulo/ })).not.toBeInTheDocument();
  });

  it('libera o quiz quando todas as essenciais do módulo foram concluídas', () => {
    act(() => {
      for (const [index, id] of MODULE_1_LESSONS.entries()) {
        useProgressStore.getState().completeLesson({ id, titulo: `Aula ${index + 1}` });
      }
    });

    renderGroup(`/grupo/${GROUP}/${MODULE_1}`);

    expect(screen.getByText('7 de 7 essenciais')).toBeInTheDocument();
    expect(screen.getByText(/todas as essenciais concluídas/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quiz do módulo/ })).toHaveAttribute(
      'href',
      `/quiz/${MODULE_1}`,
    );
  });

  it('mostra o quiz aprovado com o melhor resultado', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      quiz: { [MODULE_1]: { melhor: 5, total: 6, aprovado: true } },
    });

    renderGroup(`/grupo/${GROUP}/${MODULE_1}`);

    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText(/melhor 5\/6/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quiz do módulo/ })).toHaveAttribute(
      'href',
      `/quiz/${MODULE_1}`,
    );
  });

  it('lista as leituras de apoio do módulo', () => {
    renderGroup(`/grupo/${GROUP}/${MODULE_1}`);

    expect(screen.getByRole('heading', { name: 'Leituras de apoio · 3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reordenar cardápio do PDV' })).toHaveAttribute(
      'href',
      '/aula/pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--reordenar-cardapio-do-pdv',
    );
  });

  it('mostra o progresso do grupo depois de concluir aulas', () => {
    act(() => {
      useProgressStore
        .getState()
        .completeLesson({ id: MODULE_1_LESSONS[0] ?? '', titulo: 'Categorias' });
    });

    renderGroup(`/grupo/${GROUP}`);

    expect(screen.getByText('1 de 29 aulas essenciais')).toBeInTheDocument();
    expect(screen.getByText('1 de 7 essenciais')).toBeInTheDocument();
  });

  it('explica que o grupo não existe', () => {
    renderGroup('/grupo/nao-existe');

    expect(screen.getByRole('heading', { name: 'Grupo não encontrado' })).toBeInTheDocument();
  });

  it('explica que o módulo não pertence ao grupo', () => {
    renderGroup(`/grupo/${GROUP}/primeiros-passos--acesso-ao-sistema`);

    expect(screen.getByRole('heading', { name: 'Módulo não encontrado' })).toBeInTheDocument();
  });

  it('mantém o catálogo intacto ao renderizar', () => {
    const before = JSON.stringify(catalog.grupos);
    renderGroup(`/grupo/${GROUP}/${MODULE_1}`);
    expect(JSON.stringify(catalog.grupos)).toBe(before);
  });
});
