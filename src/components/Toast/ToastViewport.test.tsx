import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, toast, useToastStore } from '@/stores/toast';
import { ToastViewport } from './ToastViewport';

beforeEach(() => {
  useToastStore.getState().clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastViewport', () => {
  it('mostra a mensagem e remove automaticamente', () => {
    vi.useFakeTimers();
    render(<ToastViewport />);

    act(() => {
      toast('Progresso local zerado.', 'success');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Progresso local zerado.');

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('permite fechar manualmente', () => {
    render(<ToastViewport />);

    act(() => {
      toast('Aula concluída');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));

    expect(screen.queryByText('Aula concluída')).not.toBeInTheDocument();
  });

  it('empilha mais de um toast', () => {
    render(<ToastViewport />);

    act(() => {
      toast('Primeiro');
      toast('Segundo');
    });

    expect(screen.getAllByRole('status')).toHaveLength(2);
  });
});
