import type { ReactNode } from 'react';
import { InlineContent } from './InlineContent';
import type { ContentStep, ContentStepKind } from './types';
import styles from './ContentSteps.module.css';

interface ContentStepsProps {
  steps: readonly ContentStep[];
}

/** Passo sem `kind` é um passo numerado (conteúdo curado à mão). */
function kindOf(step: ContentStep): ContentStepKind {
  return step.kind ?? 'texto';
}

/**
 * Renderiza os passos de um bloco: passos numerados, parágrafos, listas,
 * imagens e caixas de destaque.
 */
export function ContentSteps({ steps }: ContentStepsProps) {
  const nodes: ReactNode[] = [];
  let index = 0;
  let number = 0;

  while (index < steps.length) {
    const step = steps[index];
    const kind = kindOf(step);

    if (kind === 'item') {
      const items: ContentStep[] = [];

      while (index < steps.length && kindOf(steps[index]) === 'item') {
        items.push(steps[index]);
        index += 1;
      }

      nodes.push(
        <ul key={`lista-${index}`} className={styles.list}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineContent tokens={item.tokens} />
            </li>
          ))}
        </ul>,
      );

      continue;
    }

    if (kind === 'texto') {
      number += 1;

      nodes.push(
        <div key={`passo-${index}`} className={styles.step}>
          <span className={styles.stepNumber}>{number}</span>
          <p className={styles.stepText}>
            <InlineContent tokens={step.tokens} />
          </p>
        </div>,
      );
    } else if (kind === 'imagem') {
      nodes.push(
        <figure key={`figura-${index}`} className={styles.figure}>
          <InlineContent tokens={step.tokens} />
        </figure>,
      );
    } else if (kind === 'nota' || kind === 'dica' || kind === 'aviso') {
      nodes.push(
        <div key={`caixa-${index}`} className={`${styles.note} ${styles[kind]}`}>
          <InlineContent tokens={step.tokens} />
        </div>,
      );
    } else {
      nodes.push(
        <p key={`paragrafo-${index}`} className={styles.paragraph}>
          <InlineContent tokens={step.tokens} />
        </p>,
      );
    }

    index += 1;
  }

  return <>{nodes}</>;
}
