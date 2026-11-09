import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { isApiEnabled } from '@/api/config';
import { DEMO_ACCOUNTS, roleLabel } from '@/domain/auth';
import { useAuthStore } from '@/stores/auth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const clearError = useAuthStore((state) => state.clearError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const redirect = params.get('redirect') ?? '/';
  const apiEnabled = isApiEnabled();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await login({ email, password });

    if (ok) navigate(redirect, { replace: true });
  };

  const loginAsDemo = async (accountEmail: string, accountPassword: string) => {
    const ok = await login({ email: accountEmail, password: accountPassword });

    if (ok) navigate(redirect, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.wrap}`}>
        <section className={styles.card}>
          <span className="cap">Yooga Academy</span>
          <h1>Entrar no Academy</h1>
          <p className="slab">
            Use o mesmo acesso do time de suporte para sincronizar seu onboarding e ver a visão de
            time.
          </p>

          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              E-mail
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearError();
                }}
                placeholder="voce@yooga.com.br"
              />
            </label>

            <label className={styles.field}>
              Senha
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError();
                }}
              />
            </label>

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {!apiEnabled ? (
            <div className={styles.demo}>
              <Chip tone="info">Modo local</Chip>
              <p>
                A API está desligada neste ambiente. Use uma conta de demonstração para exercitar a
                visão de líder.
              </p>
              <div className={styles.demoButtons}>
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.user.id}
                    type="button"
                    variant="ghost"
                    onClick={() => void loginAsDemo(account.email, account.password)}
                  >
                    Entrar como {account.user.name} · {roleLabel(account.user.role)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <Link to="/" className={styles.back}>
            ‹ Continuar sem entrar
          </Link>
        </section>
      </div>
    </div>
  );
}
