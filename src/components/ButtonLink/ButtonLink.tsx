import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import styles from '@/components/Button/Button.module.css';

export type { ButtonVariant } from '@/components/Button/Button';

interface ButtonLinkProps extends LinkProps {
  variant?: 'primary' | 'light' | 'dark' | 'ghost';
  children: ReactNode;
}

export function ButtonLink({ variant = 'primary', className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Link>
  );
}
