import { Chip, type ChipTone } from '@/components/Chip/Chip';
import { CHECKS_BADGE_LABEL, type ChecksBadge } from '@/domain/curation';
import styles from './ChecksBadge.module.css';

/**
 * Tom do selo por estado:
 * - `curado` e `aprovado` = conteúdo confiável (verde);
 * - `rascunho` e `ia` = ainda pedem revisão (laranja);
 * - `ajuste` = revisado, mas ainda pede correção (cinza).
 */
const TONE: Record<ChecksBadge, ChipTone> = {
  curado: 'done',
  rascunho: 'next',
  ia: 'next',
  aprovado: 'done',
  ajuste: 'todo',
};

interface ChecksBadgeProps {
  readonly badge: ChecksBadge;
}

/** Selo que mostra a origem das perguntas de conferência de uma aula. */
export function ChecksBadge({ badge }: ChecksBadgeProps) {
  return (
    <Chip tone={TONE[badge]} className={styles.badge}>
      {CHECKS_BADGE_LABEL[badge]}
    </Chip>
  );
}
