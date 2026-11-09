import { useEffect } from 'react';
import { TOAST_DURATION_MS, useToastStore, type ToastMessage } from '@/stores/toast';
import styles from './ToastViewport.module.css';

function ToastItem({ item }: { item: ToastMessage }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id]);

  return (
    <div className={`${styles.toast} ${styles[item.tone]}`} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.message}>{item.message}</span>
      <button
        type="button"
        className={styles.close}
        onClick={() => dismiss(item.id)}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className={styles.viewport}>
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>
  );
}
