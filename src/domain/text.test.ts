import { describe, expect, it } from 'vitest';
import { highlightText, normalizeText } from './text';

describe('normalizeText', () => {
  it('remove acentos e caixa alta', () => {
    expect(normalizeText('Impressão')).toBe('impressao');
    expect(normalizeText('Configurações · PDV')).toBe('configuracoes · pdv');
  });
});

describe('highlightText', () => {
  it('destaca a primeira ocorrência sem perder os acentos originais', () => {
    expect(highlightText('Categoria de impressão e módulo fichas', 'impressao')).toEqual([
      { text: 'Categoria de ', match: false },
      { text: 'impressão', match: true },
      { text: ' e módulo fichas', match: false },
    ]);
  });

  it('funciona com uma substring', () => {
    expect(highlightText('Cadastro de categorias no PDV', 'categoria')).toEqual([
      { text: 'Cadastro de ', match: false },
      { text: 'categoria', match: true },
      { text: 's no PDV', match: false },
    ]);
  });

  it('devolve o texto inteiro quando não encontra ou a busca está vazia', () => {
    expect(highlightText('Cadastro de produtos', 'ifood')).toEqual([
      { text: 'Cadastro de produtos', match: false },
    ]);
    expect(highlightText('Cadastro de produtos', '  ')).toEqual([
      { text: 'Cadastro de produtos', match: false },
    ]);
  });
});
