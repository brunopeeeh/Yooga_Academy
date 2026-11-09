import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fetchSession, loginWithApi, logoutWithApi } from '@/api/authApi';
import { ApiError } from '@/api/http';
import { isApiEnabled } from '@/api/config';
import {
  findDemoAccount,
  isValidEmail,
  type AuthUser,
  type Credentials,
  type SessionStatus,
} from '@/domain/auth';

export const AUTH_STORAGE_KEY = 'yooga.academy.auth';

interface AuthState {
  status: SessionStatus;
  user: AuthUser | null;
  token: string | null;
  error: string | null;
  isSubmitting: boolean;
  login(credentials: Credentials): Promise<boolean>;
  logout(): Promise<void>;
  restore(): Promise<void>;
  clearError(): void;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'nao_autorizado') return 'E-mail ou senha inválidos.';
    if (error.kind === 'rede') return 'A API está fora do ar. Tente de novo em instantes.';
    return 'Não foi possível concluir o login agora.';
  }

  return 'Não foi possível concluir o login agora.';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'desconhecido',
      user: null,
      token: null,
      error: null,
      isSubmitting: false,

      login: async ({ email, password }) => {
        set({ error: null, isSubmitting: true });

        if (!email.trim() || !password) {
          set({ error: 'Informe e-mail e senha.', isSubmitting: false });
          return false;
        }

        if (!isValidEmail(email)) {
          set({ error: 'E-mail inválido.', isSubmitting: false });
          return false;
        }

        try {
          if (isApiEnabled()) {
            const session = await loginWithApi({ email, password });
            set({
              status: 'autenticado',
              user: session.user,
              token: session.token,
              error: null,
              isSubmitting: false,
            });
            return true;
          }

          const account = findDemoAccount(email);

          if (!account || account.password !== password) {
            set({ error: 'E-mail ou senha inválidos.', isSubmitting: false });
            return false;
          }

          set({
            status: 'autenticado',
            user: account.user,
            token: `demo:${account.user.id}`,
            error: null,
            isSubmitting: false,
          });
          return true;
        } catch (error) {
          set({ error: messageFor(error), isSubmitting: false });
          return false;
        }
      },

      logout: async () => {
        const { token } = get();

        if (token && isApiEnabled() && !token.startsWith('demo:')) {
          try {
            await logoutWithApi(token);
          } catch {
            // O logout local acontece de qualquer forma.
          }
        }

        set({ status: 'anonimo', user: null, token: null, error: null, isSubmitting: false });
      },

      restore: async () => {
        const { token, user } = get();

        if (!token || !user) {
          set({ status: 'anonimo' });
          return;
        }

        if (!isApiEnabled()) {
          set({ status: 'autenticado' });
          return;
        }

        set({ status: 'carregando' });

        try {
          const current = await fetchSession(token);
          set({ status: 'autenticado', user: current, error: null });
        } catch (error) {
          if (error instanceof ApiError && error.kind === 'nao_autorizado') {
            set({ status: 'anonimo', user: null, token: null });
            return;
          }

          // API fora do ar: mantém a sessão em cache para o app seguir local-first.
          set({ status: 'autenticado' });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
