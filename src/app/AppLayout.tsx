import { useEffect, useRef, type MouseEvent } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LiveRegion } from '@/components/LiveRegion/LiveRegion';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { ToastViewport } from '@/components/Toast/ToastViewport';
import { UserMenu } from '@/components/UserMenu/UserMenu';
import { canManageTeam } from '@/domain/auth';
import { levelProgress } from '@/domain/rules';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { ProgressSync } from './ProgressSync';
import { RouteEffects } from './RouteEffects';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Onboarding', end: true, leaderOnly: false },
  { to: '/biblioteca', label: 'Biblioteca', end: false, leaderOnly: false },
  { to: '/conquistas', label: 'Conquistas', end: false, leaderOnly: false },
  { to: '/curadoria', label: 'Curadoria', end: false, leaderOnly: false },
  { to: '/lider', label: 'Meu time', end: false, leaderOnly: true },
] as const;

export function AppLayout() {
  const xp = useProgressStore((state) => state.xp);
  const role = useAuthStore((state) => state.user?.role);
  const mainRef = useRef<HTMLElement>(null);
  const level = levelProgress(xp);
  const isLeader = role ? canManageTeam(role) : false;
  const navItems = NAV_ITEMS.filter((item) => !item.leaderOnly || isLeader);

  useEffect(() => {
    void useAuthStore.getState().restore();
  }, []);

  const focusMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content" onClick={focusMain}>
        Pular para o conteúdo
      </a>

      <header className={styles.header}>
        <div className={`wrap ${styles.inner}`}>
          <NavLink to="/" className={styles.logo} aria-label="Yooga Academy, início">
            <span className={styles.logoMark} aria-hidden="true">
              Y
            </span>
            <span className={styles.brand}>Yooga Academy</span>
          </NavLink>

          <nav className={styles.nav} aria-label="Principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.me}>
            <UserMenu />
            <div className={styles.level}>
              <span>
                <b>
                  Nível {level.level + 1} · {level.name}
                </b>{' '}
                · {xp} XP
              </span>
              <ProgressBar value={level.percent} label={`Progresso do nível ${level.level + 1}`} />
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>

      <ProgressSync />
      <RouteEffects mainRef={mainRef} />
      <ToastViewport />
      <LiveRegion />
    </div>
  );
}
