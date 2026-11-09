import { Fragment } from 'react';
import type { InlineToken } from './types';
import styles from './InlineContent.module.css';

interface InlineContentProps {
  tokens: readonly InlineToken[];
}

/** Renderiza os tokens sem `dangerouslySetInnerHTML`. */
export function InlineContent({ tokens }: InlineContentProps) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === 'key') return <kbd key={index}>{token.value}</kbd>;
        if (token.type === 'strong') return <strong key={index}>{token.value}</strong>;

        if (token.type === 'link') {
          return (
            <a
              key={index}
              className={styles.link}
              href={token.href}
              target="_blank"
              rel="noreferrer"
            >
              {token.value}
            </a>
          );
        }

        if (token.type === 'image') {
          return (
            <img
              key={index}
              className={styles.image}
              src={token.value}
              alt={token.alt}
              loading="lazy"
              decoding="async"
            />
          );
        }

        return <Fragment key={index}>{token.value}</Fragment>;
      })}
    </>
  );
}
