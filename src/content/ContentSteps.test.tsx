import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentSteps } from './ContentSteps';
import type { ContentStep } from './types';

const STEPS: readonly ContentStep[] = [
  { kind: 'paragrafo', tokens: [{ type: 'text', value: 'Primeiro parágrafo do artigo.' }] },
  { kind: 'item', tokens: [{ type: 'text', value: 'Item um' }] },
  { kind: 'item', tokens: [{ type: 'text', value: 'Item dois' }] },
  { kind: 'nota', tokens: [{ type: 'strong', value: 'Atenção:' }] },
  { kind: 'imagem', tokens: [{ type: 'image', value: 'https://exemplo.com/a.png', alt: 'Print' }] },
  { tokens: [{ type: 'text', value: 'Passo curado numerado.' }] },
];

describe('ContentSteps', () => {
  it('renderiza parágrafos, listas agrupadas, caixas e imagens', () => {
    render(<ContentSteps steps={STEPS} />);

    expect(screen.getByText('Primeiro parágrafo do artigo.')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Item um');
    expect(items[1]).toHaveTextContent('Item dois');
    expect(screen.getByText('Atenção:').tagName).toBe('STRONG');
    expect(screen.getByRole('img', { name: 'Print' })).toHaveAttribute(
      'src',
      'https://exemplo.com/a.png',
    );
  });

  it('numera apenas os passos curados (sem `kind`)', () => {
    render(<ContentSteps steps={STEPS} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Passo curado numerado.')).toBeInTheDocument();
  });

  it('abre links externos em nova aba', () => {
    render(
      <ContentSteps
        steps={[
          {
            kind: 'paragrafo',
            tokens: [{ type: 'link', value: 'app.yooga.com.br', href: 'https://app.yooga.com.br' }],
          },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'app.yooga.com.br' });
    expect(link).toHaveAttribute('href', 'https://app.yooga.com.br');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
