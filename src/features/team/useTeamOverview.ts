import { useEffect, useState } from 'react';
import { fetchTeamOverview, type TeamMemberDTO } from '@/api/teamApi';
import { isApiEnabled } from '@/api/config';
import { useAuthStore } from '@/stores/auth';

export type TeamDataSource = 'api' | 'exemplo';

export interface TeamOverviewState {
  readonly members: TeamMemberDTO[] | null;
  readonly source: TeamDataSource;
  readonly isLoading: boolean;
}

type LoadState =
  | { readonly token: string; readonly status: 'carregado'; readonly members: TeamMemberDTO[] }
  | { readonly token: string; readonly status: 'erro' };

/**
 * Carrega a visão de time da API quando há sessão de líder.
 * Sem API habilitada (ou com falha), a tela usa os dados de exemplo do
 * protótipo — o app nunca fica sem a visão de time.
 */
export function useTeamOverview(): TeamOverviewState {
  const status = useAuthStore((state) => state.status);
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.user?.role);
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  const enabled = status === 'autenticado' && !!token && role === 'lider' && isApiEnabled();

  useEffect(() => {
    if (!enabled || !token) return;

    let active = true;

    void fetchTeamOverview(token)
      .then((members) => {
        if (!active) return;
        setLoaded({ token, status: 'carregado', members });
      })
      .catch(() => {
        if (!active) return;
        setLoaded({ token, status: 'erro' });
      });

    return () => {
      active = false;
    };
  }, [enabled, token]);

  const current = loaded && loaded.token === token ? loaded : null;
  const members = current?.status === 'carregado' ? current.members : null;

  return {
    members,
    source: members ? 'api' : 'exemplo',
    isLoading: enabled && !current,
  };
}
