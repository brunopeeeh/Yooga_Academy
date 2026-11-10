import { describe, expect, it } from 'vitest';
import { internalsEnabled, withInternals } from './internals';

describe('modo interno', () => {
  it('só liga com ?internals=1', () => {
    expect(internalsEnabled('?internals=1')).toBe(true);
    expect(internalsEnabled('')).toBe(false);
    expect(internalsEnabled('?internals=0')).toBe(false);
    expect(internalsEnabled('?internals=true')).toBe(false);
    expect(internalsEnabled('?outro=1')).toBe(false);
  });

  it('funciona com outros parâmetros na URL', () => {
    expect(internalsEnabled('?aula=1&internals=1')).toBe(true);
    expect(internalsEnabled('?aula=1&internals=1&b=2')).toBe(true);
  });

  it('mantém o modo interno na navegação interna', () => {
    expect(withInternals('/aula/abc', true)).toBe('/aula/abc?internals=1');
    expect(withInternals('/aula/abc?x=1', true)).toBe('/aula/abc?x=1&internals=1');
    expect(withInternals('/aula/abc', false)).toBe('/aula/abc');
  });

  it('não duplica o parâmetro', () => {
    expect(withInternals('/aula/abc?internals=1', true)).toBe('/aula/abc?internals=1');
  });
});
