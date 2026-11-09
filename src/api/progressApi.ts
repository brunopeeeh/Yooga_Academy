import type { ProgressData } from '@/domain/types';
import { apiRequest } from './http';
import { progressEnvelopeSchema, toProgressData } from './schemas';

/** `GET /progress` — progresso do usuário autenticado. */
export async function fetchRemoteProgress(token: string): Promise<ProgressData> {
  const payload = await apiRequest<unknown>('/progress', { token });
  return toProgressData(progressEnvelopeSchema.parse(payload).progress);
}

/** `PUT /progress` — envia o progresso local para o servidor. */
export async function pushRemoteProgress(token: string, progress: ProgressData): Promise<void> {
  await apiRequest<unknown>('/progress', {
    method: 'PUT',
    token,
    body: { progress },
  });
}
