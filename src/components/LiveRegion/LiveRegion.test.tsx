import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { announce, useLiveRegionStore } from '@/stores/liveRegion';
import { LiveRegion } from './LiveRegion';

beforeEach(() => {
  useLiveRegionStore.getState().clear();
});

describe('LiveRegion', () => {
  it('expõe a mensagem anunciada para leitores de tela', () => {
    render(<LiveRegion />);

    const region = screen.getByTestId('live-region');
    expect(region).toHaveAttribute('aria-live', 'polite');

    act(() => {
      announce('Biblioteca');
    });

    expect(region).toHaveTextContent('Biblioteca');
  });
});
