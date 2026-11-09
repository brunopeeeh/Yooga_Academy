import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalog } from '@/data/catalog';
import { createEmptyAnnotations } from '@/domain/annotations';
import { createEmptyProgress } from '@/domain/progress';
import { useAnnotationsStore } from '@/stores/annotations';
import { useProgressStore } from '@/stores/progress';
import { HomePage } from './HomePage';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.setState(createEmptyProgress());
  useAnnotationsStore.setState(createEmptyAnnotations());
});

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

function stat(text: string) {
  return screen.getByText(
    (_, element) => element?.tagName === 'DD' && element.textContent === text,
  );
}

describe('HomePage', () => {
  it('abre no item de continuidade e mostra o resumo do onboarding', () => {
    renderHome();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Acesso do sistema · App e painel' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Primeiros passos › Acesso ao sistema · aula 1 de 3'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar aula' })).toHaveAttribute(
      'href',
      '/aula/primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel',
    );

    expect(stat('0 / 102')).toBeInTheDocument();
    expect(stat('0 / 32')).toBeInTheDocument();
    expect(stat('0 / 8')).toBeInTheDocument();
    expect(screen.getByText('Nível 1 · Aprendiz · 0 XP')).toBeInTheDocument();
  });

  it('monta a grade com os 8 grupos e o quiz final bloqueado', () => {
    renderHome();

    expect(screen.getByRole('heading', { name: 'Grupos do onboarding' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(8);

    expect(screen.getByRole('link', { name: /Primeiros passos/ })).toHaveAttribute(
      'href',
      '/grupo/primeiros-passos',
    );
    expect(screen.getByRole('link', { name: /PDV \(Mesa e balcão\)/ })).toHaveAttribute(
      'href',
      '/grupo/pdv-mesa-e-balcao',
    );

    expect(screen.getByText('Quiz final de revisão')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
  });

  it('reage ao progresso: próximo item, XP e contadores', () => {
    renderHome();

    act(() => {
      useProgressStore.getState().completeLesson({
        id: 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel',
        titulo: 'Acesso',
      });
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Como baixar o app Yooga' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nível 1 · Aprendiz · 10 XP')).toBeInTheDocument();
    expect(stat('1 / 102')).toBeInTheDocument();
  });

  it('libera o quiz final quando os 8 grupos têm selo', () => {
    useProgressStore.setState({
      ...createEmptyProgress(),
      selos: Object.fromEntries(catalog.grupos.map((group) => [group.id, true as const])),
    });

    renderHome();

    expect(screen.getByText('Liberado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fazer o quiz final' })).toHaveAttribute(
      'href',
      '/quiz/final',
    );
  });

  it('apaga favoritos e anotações com o botão da home', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    useAnnotationsStore.setState({
      favorites: { 'aula-1': { at: '2026-11-09T10:00:00.000Z' } },
      notes: {
        'aula-1': {
          text: 'lembrete',
          at: '2026-11-09T10:00:00.000Z',
          updatedAt: '2026-11-09T10:00:00.000Z',
        },
      },
    });

    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Apagar favoritos e anotações' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(useAnnotationsStore.getState().favorites).toEqual({});
    expect(useAnnotationsStore.getState().notes).toEqual({});
  });
});
