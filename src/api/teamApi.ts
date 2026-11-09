import { apiRequest } from './http';
import { teamOverviewSchema } from './schemas';

export interface TeamMemberDTO {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly since: string;
  readonly seals: number;
  readonly current: number;
  readonly essentials: number;
  readonly quizzesApproved: number;
  readonly lastActivity: string;
  readonly stalled?: boolean;
}

/** `GET /team/overview` — visão de time do líder. */
export async function fetchTeamOverview(token: string): Promise<TeamMemberDTO[]> {
  const payload = await apiRequest<unknown>('/team/overview', { token });
  return teamOverviewSchema.parse(payload).members;
}
