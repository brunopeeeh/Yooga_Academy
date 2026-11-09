import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipTone = 'done' | 'doing' | 'next' | 'todo' | 'neutral' | 'info';

interface ChipProps {
  tone?: ChipTone;
  className?: string;
  children: ReactNode;
}

export function Chip({ tone = 'neutral', className, children }: ChipProps) {
  return (
    <span className={[styles.chip, styles[tone], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
