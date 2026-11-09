/**
 * Modelo de sessão e identidade usado pela camada de auth (Fase 8).
 * Fica no domínio para ser consumido por stores, rotas e telas sem React.
 */

export type UserRole = 'analista' | 'lider';

export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly initials: string;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export type SessionStatus = 'desconhecido' | 'carregando' | 'autenticado' | 'anonimo';

export interface DemoAccount {
  readonly email: string;
  readonly password: string;
  readonly user: AuthUser;
}

/** Senha das contas de demonstração usadas quando a API está desligada. */
export const DEMO_PASSWORD = 'demo';

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: 'analista@demo.local',
    password: DEMO_PASSWORD,
    user: {
      id: 'demo-analista',
      name: 'Ana Nascimento',
      email: 'analista@demo.local',
      role: 'analista',
      initials: 'AN',
    },
  },
  {
    email: 'lider@demo.local',
    password: DEMO_PASSWORD,
    user: {
      id: 'demo-lider',
      name: 'Fábio Ribeiro',
      email: 'lider@demo.local',
      role: 'lider',
      initials: 'FR',
    },
  },
];

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Somente o papel de líder enxerga a visão de time. */
export function canManageTeam(role: UserRole): boolean {
  return role === 'lider';
}

export function findDemoAccount(email: string): DemoAccount | undefined {
  const target = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email.toLowerCase() === target);
}

/** Iniciais do nome, para o avatar do cabeçalho. */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();

  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function roleLabel(role: UserRole): string {
  return role === 'lider' ? 'Líder' : 'Analista';
}
