import type { AuthUser, Credentials } from '@/domain/auth';
import { apiRequest } from './http';
import { meSchema, sessionSchema, toAuthUser } from './schemas';

export interface AuthSession {
  readonly token: string;
  readonly user: AuthUser;
}

/** `POST /auth/login` — devolve token e usuário. */
export async function loginWithApi(credentials: Credentials): Promise<AuthSession> {
  const payload = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    body: { email: credentials.email.trim(), password: credentials.password },
  });

  const parsed = sessionSchema.parse(payload);
  return { token: parsed.token, user: toAuthUser(parsed.user) };
}

/** `GET /auth/me` — valida o token guardado. */
export async function fetchSession(token: string): Promise<AuthUser> {
  const payload = await apiRequest<unknown>('/auth/me', { token });
  const parsed = meSchema.parse(payload);
  return toAuthUser(parsed.user);
}

/** `POST /auth/logout` — revoga o token no servidor (best effort). */
export async function logoutWithApi(token: string): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST', token });
}
