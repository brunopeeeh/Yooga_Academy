import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyAnnotations } from '@/domain/annotations';
import { createEmptyProgress } from '@/domain/progress';
import { useAnnotationsStore } from '@/stores/annotations';
import { useProgressStore } from '@/stores/progress';
import { LibraryPage } from './LibraryPage';

const CATEGORIAS =
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-categorias-no-pdv';
const TROCO = 'delivery--configuracoes-gerais-do-delivery--editar-pedido-do-delivery';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
  useAnnotationsStore.setState(createEmptyAnnotations());
});

function renderLibrary() {
  return render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

function search(value: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar aulas' }), {
    target: { value },
  });
}

describe('LibraryPage', () => {
  it('abre com todas as aulas e o limite de 60 resultados', () => {
    const { container } = renderLibrary();

    expect(screen.getByText('170 resultados', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('Mostrando 60 de 170. Refine a busca.')).toBeInTheDocument();
    expect(container.querySelectorAll('a[href^="/aula/"]')).toHaveLength(60);
  });

  it('busca sem acento e destaca o trecho encontrado', async () => {
    const { container } = renderLibrary();
    search('impressao');

    // 7 aulas pelo título/módulo + 7 pelo texto das aulas.
    expect(
      await screen.findByText('14 resultados', { selector: 'b' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        'a[href="/aula/balancas-e-impressoras--impressao--categoria-de-impressao-e-modulo-fichas-pdv"]',
      ),
    ).toBeInTheDocument();

    const marks = screen.getAllByText('impressão').filter((element) => element.tagName === 'MARK');
    expect(marks.length).toBeGreaterThan(0);
  });

  it('filtra por tipo e por grupo', () => {
    renderLibrary();

    fireEvent.click(screen.getByRole('checkbox', { name: /Leitura de apoio/ }));
    expect(screen.getByText('102 resultados', { selector: 'b' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /PDV \(Mesa e balcão\)/ }));
    expect(screen.getByText('29 resultados', { selector: 'b' })).toBeInTheDocument();
  });

  it('esconde aulas já concluídas quando o filtro de status está ativo', async () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      concluidas: { [CATEGORIAS]: true },
    });

    const { container } = renderLibrary();
    search('categoria');

    // 5 aulas pelo título/módulo + 17 pelo texto das aulas.
    await screen.findByText('22 resultados', { selector: 'b' }, { timeout: 10_000 });

    const lessonLink = `a[href="/aula/${CATEGORIAS}"]`;
    expect(container.querySelector(lessonLink)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Só o que ainda não vi' }));

    expect(container.querySelector(lessonLink)).not.toBeInTheDocument();
    expect(screen.getByText('21 resultados', { selector: 'b' })).toBeInTheDocument();
  });

  it('mostra o estado vazio quando nada corresponde', () => {
    renderLibrary();
    search('zzzz');

    expect(screen.getByText('0 resultados', { selector: 'b' })).toBeInTheDocument();
    expect(
      screen.getByText('Nada encontrado. Tente outra palavra ou limpe os filtros.'),
    ).toBeInTheDocument();
  });
});

describe('favoritos e anotações', () => {
  it('filtra só as aulas favoritas', () => {
    useAnnotationsStore.setState({
      favorites: { [CATEGORIAS]: { at: '2026-11-09T10:00:00.000Z' } },
    });

    const { container } = renderLibrary();

    expect(screen.getByText('170 resultados', { selector: 'b' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Só as favoritas/ }));

    expect(screen.getByText('1 resultado', { selector: 'b' })).toBeInTheDocument();
    expect(container.querySelector(`a[href="/aula/${CATEGORIAS}"]`)).toBeInTheDocument();
  });

  it('marca a aula favorita nos resultados', () => {
    useAnnotationsStore.setState({
      favorites: { [CATEGORIAS]: { at: '2026-11-09T10:00:00.000Z' } },
    });

    const { container } = renderLibrary();

    const link = container.querySelector(`a[href="/aula/${CATEGORIAS}"]`);
    expect(link).not.toBeNull();
    expect(within(link as HTMLElement).getByText('Favorita')).toBeInTheDocument();
  });

  it('lista as anotações do analista', () => {
    useAnnotationsStore.setState({
      notes: {
        [CATEGORIAS]: {
          text: 'categoria precisa existir antes do produto',
          at: '2026-11-09T10:00:00.000Z',
          updatedAt: '2026-11-09T10:00:00.000Z',
        },
      },
    });

    renderLibrary();

    expect(screen.getByRole('heading', { name: 'Suas anotações' })).toBeInTheDocument();
    expect(screen.getByText('categoria precisa existir antes do produto')).toBeInTheDocument();

    const section = screen.getByRole('region', { name: 'Suas anotações' });
    expect(
      within(section).getByRole('link', { name: /Cadastro de categorias no PDV/ }),
    ).toHaveAttribute('href', `/aula/${CATEGORIAS}`);
  });

  it('não mostra a seção de anotações quando não há nenhuma', () => {
    renderLibrary();

    expect(screen.queryByRole('heading', { name: 'Suas anotações' })).not.toBeInTheDocument();
  });
});

describe('busca dentro do texto das aulas', () => {
  it('encontra uma aula pelo texto, mesmo sem o termo no título', async () => {
    const { container } = renderLibrary();
    search('troco');

    // "troco" não aparece em nenhum título: só existe no corpo das aulas.
    expect(
      await screen.findByText('1 resultado', { selector: 'b' }, { timeout: 10_000 }),
    ).toBeInTheDocument();

    const link = container.querySelector(`a[href="/aula/${TROCO}"]`);

    expect(link).toBeInTheDocument();
    expect(within(link as HTMLElement).getByText('no texto')).toBeInTheDocument();

    const marks = within(link as HTMLElement)
      .getAllByText(/troco/i)
      .filter((element) => element.tagName === 'MARK');

    expect(marks.length).toBeGreaterThan(0);
  });

  it('avisa quando o texto das aulas ainda está carregando', async () => {
    renderLibrary();
    search('troco');

    expect(
      await screen.findByText(
        /Busca no título e no texto das aulas, com ou sem acento\./,
        undefined,
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
  });

  it('prioriza as aulas com o termo no título', async () => {
    const { container } = renderLibrary();
    search('impressao');

    await screen.findByText(/Busca no título e no texto das aulas/, undefined, { timeout: 10_000 });

    const links = [...container.querySelectorAll('a[href^="/aula/"]')];
    const first = links[0]?.getAttribute('href') ?? '';

    // As primeiras aulas são as que têm "impressão" no título ou no módulo.
    expect(first).toContain('balancas-e-impressoras--impressao');
  });

  it('mantém a busca só no título quando o termo é curto demais', () => {
    renderLibrary();
    search('qr');

    expect(
      screen.getByText('Digite 3 ou mais letras para buscar também dentro do texto das aulas.'),
    ).toBeInTheDocument();
  });

  it('aplica os filtros às aulas encontradas pelo texto', async () => {
    renderLibrary();
    search('troco');

    await screen.findByText('1 resultado', { selector: 'b' }, { timeout: 10_000 });

    fireEvent.click(screen.getByRole('checkbox', { name: /Essencial/ }));

    expect(screen.getByText('0 resultados', { selector: 'b' })).toBeInTheDocument();
  });
});
