import { isFavorite } from '@/domain/annotations';
import { useAnnotationsStore } from '@/stores/annotations';
import { toast } from '@/stores/toast';
import styles from './LessonPage.module.css';

interface FavoriteButtonProps {
  readonly lessonId: string;
  readonly lessonTitle: string;
}

function StarIcon({ filled }: { readonly filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}

/**
 * Botão que marca a aula como favorita.
 *
 * Fica sempre com o mesmo nome acessível ("Favoritar") e usa `aria-pressed`
 * para dizer se a aula já está marcada — o estado aparece na estrela e na
 * cor, mas a leitura por leitor de tela não depende disso.
 */
export function FavoriteButton({ lessonId, lessonTitle }: FavoriteButtonProps) {
  const favorite = useAnnotationsStore((state) => isFavorite(state.favorites, lessonId));
  const toggleFavorite = useAnnotationsStore((state) => state.toggleFavorite);

  const handleClick = () => {
    toggleFavorite(lessonId);
    toast(
      favorite ? `Removida dos favoritos: ${lessonTitle}.` : `Favoritada: ${lessonTitle}.`,
      'default',
    );
  };

  return (
    <button
      type="button"
      className={`${styles.favoriteButton} ${favorite ? styles.favoriteButtonOn : ''}`}
      aria-pressed={favorite}
      onClick={handleClick}
    >
      <StarIcon filled={favorite} />
      Favoritar
    </button>
  );
}
