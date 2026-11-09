import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canManageTeam } from '@/domain/auth';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';

interface RequireLeaderProps {
  children: ReactNode;
}

function SessionLoading() {
  return (
    <div className="wrap" style={{ padding: '48px 0' }}>
      <p role="status">Verificando sua sessão…</p>
    </div>
  );
}

function ForbiddenRedirect() {
  useEffect(() => {
    toast('Essa visão é só para líderes de time.', 'danger');
  }, []);

  return <Navigate to="/" replace />;
}

/**
 * Guarda de `/lider` (Fase 8): exige sessão autenticada com papel de líder.
 * Sem sessão, redireciona para a tela de entrada guardando o destino.
 */
export function RequireLeader({ children }: RequireLeaderProps) {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const { pathname } = useLocation();

  if (status === 'desconhecido' || status === 'carregando') {
    return <SessionLoading />;
  }

  if (status !== 'autenticado' || !role) {
    return <Navigate to={`/entrar?redirect=${encodeURIComponent(pathname)}`} replace />;
  }

  if (!canManageTeam(role)) {
    return <ForbiddenRedirect />;
  }

  return <>{children}</>;
}
