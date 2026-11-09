import { useState } from 'react';
import { Link } from 'react-router-dom';
import { roleLabel } from '@/domain/auth';
import { useAuthStore } from '@/stores/auth';
import styles from './UserMenu.module.css';

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const [isOpen, setIsOpen] = useState(false);

  if (status === 'desconhecido' || status === 'carregando') {
    return <span className={styles.pending}>Verificando sessão…</span>;
  }

  if (!user) {
    return (
      <Link to="/entrar" className={styles.signIn}>
        Entrar
      </Link>
    );
  }

  return (
    <div className={styles.menu}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {user.initials}
        </span>
        <span className={styles.identity}>
          <b>{user.name}</b>
          <span>{roleLabel(user.role)}</span>
        </span>
      </button>

      {isOpen ? (
        <div className={styles.popover} role="group" aria-label="Sessão">
          <span className={styles.email}>{user.email}</span>
          <button type="button" className={styles.logout} onClick={() => void logout()}>
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
