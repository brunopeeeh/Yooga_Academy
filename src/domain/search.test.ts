import { describe, expect, it } from 'vitest';
import { countMatches, searchContent, type ContentIndex } from './search';
import { excerptText } from './text';

function makeIndex(entries: Record<string, string>): ContentIndex {
  return new Map(
    Object.entries(entries).map(([lessonId, text]) => [
      lessonId,
      {
        text,
        normalized: text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase(),
      },
    ]),
  );
}

describe('countMatches', () => {
  it('conta todas as ocorrências', () => {
    expect(countMatches('um dois um tres um', 'um')).toBe(3);
  });

  it('devolve zero quando o termo não aparece ou é vazio', () => {
    expect(countMatches('um dois', 'tres')).toBe(0);
    expect(countMatches('um dois', '')).toBe(0);
  });

  it('não conta sobreposição parcial como ocorrência separate', () => {
    expect(countMatches('aaa', 'aa')).toBe(1);
  });
});

describe('searchContent', () => {
  const index = makeIndex({
    'aula-impressao': 'Configure a impressão de recibos no balcão.',
    'aula-sangria': 'A sangria registra a retirada de dinheiro do caixa.',
    'aula-sangria-2': 'A sangria aparece duas vezes: sangria de novo.',
    'aula-vazia': 'Nada a ver aqui.',
  });

  it('encontra as aulas cujo texto cita o termo, ignorando acento', () => {
    const matches = searchContent(index, 'impressao');

    expect(matches.map((match) => match.lessonId)).toEqual(['aula-impressao']);
  });

  it('ordena pela quantidade de ocorrências', () => {
    const matches = searchContent(index, 'sangria');

    expect(matches.map((match) => match.lessonId)).toEqual(['aula-sangria-2', 'aula-sangria']);
    expect(matches[0]?.occurrences).toBe(2);
  });

  it('devolve o trecho destacado de cada acerto', () => {
    const matches = searchContent(index, 'sangria');
    const first = matches[0];

    expect(first?.segments.length).toBeGreaterThan(0);
    expect(first?.segments.some((segment) => segment.match && segment.text === 'sangria')).toBe(
      true,
    );
  });

  it('não retorna nada para consulta vazia', () => {
    expect(searchContent(index, '   ')).toEqual([]);
  });
});

describe('excerptText', () => {
  const text =
    'Clique em Ajustes e selecione Configurações. Depois, habilite a opção de sangria no caixa do balcão para registrar a retirada.';

  it('marca o termo encontrado', () => {
    const segments = excerptText(text, 'sangria');

    expect(segments.map((segment) => segment.text).join('')).toContain('sangria');
    expect(segments.filter((segment) => segment.match)).toHaveLength(1);
  });

  it('encontra o termo sem acento no texto acentuado', () => {
    const segments = excerptText('Configuração de impressão', 'impressao');

    expect(segments.filter((segment) => segment.match)).toHaveLength(1);
  });

  it('devolve vazio quando o termo não está no texto', () => {
    expect(excerptText(text, 'webhook')).toEqual([]);
  });

  it('começa na frase anterior quando ela está perto', () => {
    const segments = excerptText(text, 'habilite');
    const joined = segments.map((segment) => segment.text).join('');

    expect(joined).toContain('Depois, habilite');
  });

  it('não corta palavras pela metade', () => {
    const segments = excerptText(text, 'Configurações');
    const matchIndex = segments.findIndex((segment) => segment.match);
    const before = segments[matchIndex - 1]?.text ?? '';

    // O trecho anterior termina em espaço: a palavra não foi partida.
    expect(before.endsWith(' ') || before === '').toBe(true);
    expect(segments[matchIndex]?.text).toBe('Configurações');
  });
});
