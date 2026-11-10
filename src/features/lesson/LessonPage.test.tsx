import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyAnnotations } from '@/domain/annotations';
import { createEmptyCuration } from '@/domain/curation';
import { createEmptyProgress } from '@/domain/progress';
import { useAnnotationsStore } from '@/stores/annotations';
import { useCurationStore } from '@/stores/curation';
import { useProgressStore } from '@/stores/progress';
import { LessonPage } from './LessonPage';

const PRODUCTS =
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-produtos-no-pdv';
const COMPLEMENTS =
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-complementos-pdv';
const FIRST_LESSON = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';
const SUPPORT_LESSON =
  'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--reordenar-cardapio-do-pdv';

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
  useCurationStore.setState(createEmptyCuration());
  useAnnotationsStore.setState(createEmptyAnnotations());
});

function renderLesson(lessonId: string) {
  render(
    <MemoryRouter initialEntries={[`/aula/${lessonId}`]}>
      <Routes>
        <Route
          path="/aula/:lessonId"
          element={
            <>
              <LessonPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function answerCorrectly() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Só Administrador ou Gerente criam produtos' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Pesável, com o preço do quilo no valor de venda' }),
  );
}

describe('LessonPage', () => {
  it('renderiza o conteúdo migrado com passos, teclas e aviso de atendimento', () => {
    renderLesson(PRODUCTS);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro de produtos no PDV' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Produto é o que o cliente vende/)).toBeInTheDocument();
    expect(screen.getByText('Essencial · 8 min · aula 2 de 7')).toBeInTheDocument();
    expect(screen.getByText('1. Criar o produto')).toBeInTheDocument();
    expect(screen.getByText('Ajustes').tagName).toBe('KBD');
    expect(screen.getByText('Salvar').tagName).toBe('KBD');
    expect(screen.getByText('Pesável').tagName).toBe('STRONG');
    expect(screen.getByText(/Na hora do atendimento:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir na Central' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('heading', { name: 'Confere rápido' })).toBeInTheDocument();
  });

  it('só conclui a aula depois de acertar as perguntas de conferência', () => {
    renderLesson(PRODUCTS);

    const complete = screen.getByRole('button', { name: /Concluir aula/ });
    expect(complete).toBeDisabled();
    expect(screen.getByText('Responda as perguntas para concluir')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'O plano dele não tem cadastro de produtos' }),
    );

    expect(screen.getByText(/Ainda não. Releia os passos acima/)).toBeInTheDocument();
    expect(complete).toBeDisabled();

    answerCorrectly();

    expect(screen.getByText('Isso. É permissão do usuário, não do plano.')).toBeInTheDocument();
    expect(
      screen.getByText('Isso. Com Pesável ativo, o valor de venda vira o preço do kg.'),
    ).toBeInTheDocument();
    expect(complete).toBeEnabled();
  });

  it('conclui, soma XP e avança para a próxima aula essencial', () => {
    renderLesson(PRODUCTS);
    answerCorrectly();

    fireEvent.click(screen.getByRole('button', { name: /Concluir aula/ }));

    expect(useProgressStore.getState().concluidas[PRODUCTS]).toBe(true);
    expect(useProgressStore.getState().xp).toBe(10);
    expect(screen.getByTestId('location')).toHaveTextContent(`/aula/${COMPLEMENTS}`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro de complementos · PDV' }),
    ).toBeInTheDocument();
  });

  it('mostra o conteúdo extraído da Central com texto, links e imagens', () => {
    renderLesson(FIRST_LESSON);

    expect(screen.getAllByText(/Para acessar o aplicativo de vendas/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'app.yooga.com.br' })).toHaveAttribute(
      'href',
      'http://app.yooga.com.br/',
    );
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
    expect(screen.getByText(/Texto e imagens extraídos de/)).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo desta aula')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/As perguntas de conferência desta aula ainda não foram migradas/),
    ).not.toBeInTheDocument();
  });

  it('mostra as perguntas reformuladas com IA e exige a resposta', () => {
    renderLesson(FIRST_LESSON);

    expect(screen.getByRole('heading', { name: 'Confere rápido' })).toBeInTheDocument();
    expect(screen.getByText('reformuladas com IA · aguardando revisão')).toBeInTheDocument();

    const complete = screen.getByRole('button', { name: /Concluir aula/ });
    expect(complete).toBeDisabled();
    expect(screen.getByText('Responda as perguntas para concluir')).toBeInTheDocument();

    const [recognition, sequence] = screen.getAllByRole('group');

    // Resposta errada: mantém a aula bloqueada.
    fireEvent.click(within(recognition).getByRole('button', { name: /Disponível na Google Play/ }));

    expect(screen.getByText(/Ainda não. Releia os passos acima/)).toBeInTheDocument();
    expect(complete).toBeDisabled();

    fireEvent.click(
      within(recognition).getByRole('button', { name: /E para acessar o painel de relatórios/ }),
    );

    expect(screen.getByText(/Os relatórios ficam em painel\.yooga\.com\.br/)).toBeInTheDocument();
    expect(complete).toBeDisabled();

    fireEvent.click(
      within(sequence).getByRole('button', { name: /Para acessar o aplicativo de vendas/ }),
    );

    expect(complete).toBeEnabled();

    fireEvent.click(complete);

    expect(useProgressStore.getState().concluidas[FIRST_LESSON]).toBe(true);
  });

  it('mostra o selo das perguntas curadas à mão', () => {
    renderLesson(PRODUCTS);

    expect(screen.getByText('curadas à mão')).toBeInTheDocument();
    expect(screen.queryByText('reformuladas com IA · aguardando revisão')).not.toBeInTheDocument();
  });

  it('troca o selo quando o time de conteúdo aprova as perguntas reescritas', () => {
    useCurationStore.setState({
      approvals: { [FIRST_LESSON]: { decision: 'aprovado', at: '2026-11-09' } },
    });

    renderLesson(FIRST_LESSON);

    expect(screen.getByText('revisadas pelo time de conteúdo')).toBeInTheDocument();
    expect(screen.queryByText('reformuladas com IA · aguardando revisão')).not.toBeInTheDocument();
  });

  it('mostra o selo de ajuste quando o time pede correção', () => {
    useCurationStore.setState({
      approvals: { [FIRST_LESSON]: { decision: 'ajuste', at: '2026-11-09' } },
    });

    renderLesson(FIRST_LESSON);

    expect(screen.getByText('precisam de ajuste')).toBeInTheDocument();
  });

  it('marca a aula como favorita e desfaz a marca', () => {
    renderLesson(FIRST_LESSON);

    const favorite = screen.getByRole('button', { name: 'Favoritar' });
    expect(favorite).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(favorite);

    expect(useAnnotationsStore.getState().favorites[FIRST_LESSON]).toBeDefined();
    expect(screen.getByRole('button', { name: 'Favoritar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Favoritar' }));

    expect(useAnnotationsStore.getState().favorites[FIRST_LESSON]).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Favoritar' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('salva a nota da aula só quando o analista pede', () => {
    renderLesson(FIRST_LESSON);

    const field = screen.getByRole('textbox', { name: /Sua nota sobre/ });
    const save = screen.getByRole('button', { name: 'Salvar nota' });

    expect(save).toBeDisabled();

    fireEvent.change(field, { target: { value: 'cliente pediu PIX' } });

    // O rascunho ainda não foi salvo.
    expect(useAnnotationsStore.getState().notes[FIRST_LESSON]).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Salvar nota' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar nota' }));

    expect(useAnnotationsStore.getState().notes[FIRST_LESSON]?.text).toBe('cliente pediu PIX');
    expect(screen.getByText(/Salva em/)).toBeInTheDocument();
  });

  it('mostra a nota salva e permite apagá-la', () => {
    useAnnotationsStore.setState({
      notes: {
        [FIRST_LESSON]: {
          text: 'cliente pediu PIX',
          at: '2026-11-09T10:00:00.000Z',
          updatedAt: '2026-11-09T10:00:00.000Z',
        },
      },
    });

    renderLesson(FIRST_LESSON);

    expect(screen.getByRole('textbox', { name: /Sua nota sobre/ })).toHaveValue(
      'cliente pediu PIX',
    );
    expect(screen.getByRole('button', { name: 'Apagar nota' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apagar nota' }));

    expect(useAnnotationsStore.getState().notes[FIRST_LESSON]).toBeUndefined();
    expect(screen.getByRole('textbox', { name: /Sua nota sobre/ })).toHaveValue('');
  });

  it('mostra o CTA de próxima aula quando a aula já foi concluída', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      concluidas: { [PRODUCTS]: true },
    });

    renderLesson(PRODUCTS);

    expect(screen.getByText('Aula concluída')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Próxima aula' })).toHaveAttribute(
      'href',
      `/aula/${COMPLEMENTS}`,
    );
    expect(screen.queryByRole('button', { name: /Concluir aula/ })).not.toBeInTheDocument();
  });

  it('não mostra rodapé de conclusão em leitura de apoio', () => {
    renderLesson(SUPPORT_LESSON);

    expect(screen.getByText(/Leitura de apoio/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir aula/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Aula concluída')).not.toBeInTheDocument();
  });

  it('leva o quiz bloqueado de volta ao módulo', () => {
    renderLesson(SUPPORT_LESSON);

    expect(screen.getByRole('link', { name: /Quiz do módulo/ })).toHaveAttribute(
      'href',
      '/grupo/pdv-mesa-e-balcao/pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio',
    );
  });

  it('explica quando a aula não existe', () => {
    renderLesson('aula-inexistente');

    expect(screen.getByRole('heading', { name: 'Aula não encontrada' })).toBeInTheDocument();
  });
});
