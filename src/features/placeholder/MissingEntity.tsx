import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import { Chip } from '@/components/Chip/Chip';
import styles from './MissingEntity.module.css';

interface MissingEntityProps {
  title: string;
  description: string;
}

export function MissingEntity({ title, description }: MissingEntityProps) {
  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.narrow}`}>
        <section className={styles.card}>
          <Chip tone="neutral">404</Chip>
          <h1>{title}</h1>
          <p className="slab">{description}</p>
          <ButtonLink to="/">Voltar para o início</ButtonLink>
        </section>
      </div>
    </div>
  );
}
