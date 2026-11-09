import { Link } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import styles from './PlaceholderPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.inner}`}>
        <section className={styles.card}>
          <Chip tone="neutral">404</Chip>
          <h1>Página não encontrada</h1>
          <p className="slab">O endereço não existe ou ainda não foi migrado.</p>
          <Link to="/" className={styles.back}>
            ‹ Voltar para o início
          </Link>
        </section>
      </div>
    </div>
  );
}
