import { describe, expect, it } from 'vitest';
import {
  canManageTeam,
  DEMO_ACCOUNTS,
  findDemoAccount,
  initialsOf,
  isValidEmail,
  roleLabel,
} from './auth';

describe('auth do domínio', () => {
  it('valida e-mail', () => {
    expect(isValidEmail('ana@yooga.com.br')).toBe(true);
    expect(isValidEmail('ana@yooga')).toBe(false);
    expect(isValidEmail('sem arroba')).toBe(false);
    expect(isValidEmail('  ana@yooga.com.br  ')).toBe(true);
  });

  it('só o líder administra o time', () => {
    expect(canManageTeam('lider')).toBe(true);
    expect(canManageTeam('analista')).toBe(false);
    expect(roleLabel('lider')).toBe('Líder');
    expect(roleLabel('analista')).toBe('Analista');
  });

  it('encontra a conta de demonstração pelo e-mail', () => {
    const account = findDemoAccount('LIDER@demo.local');

    expect(account?.user.role).toBe('lider');
    expect(account?.password).toBe('demo');
    expect(findDemoAccount('ninguem@demo.local')).toBeUndefined();
  });

  it('mantém duas contas de demonstração, uma por papel', () => {
    expect(DEMO_ACCOUNTS).toHaveLength(2);
    expect(DEMO_ACCOUNTS.map((account) => account.user.role).sort()).toEqual(['analista', 'lider']);
  });

  it('gera iniciais para o avatar', () => {
    expect(initialsOf('Ana Nascimento')).toBe('AN');
    expect(initialsOf('Fábio')).toBe('FÁ');
    expect(initialsOf('  ')).toBe('?');
  });
});
