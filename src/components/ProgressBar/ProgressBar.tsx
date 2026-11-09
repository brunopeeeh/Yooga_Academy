import styles from './ProgressBar.module.css';

export type ProgressTone = 'blue' | 'green' | 'sky';
export type ProgressTrackTone = 'default' | 'onDark';

interface ProgressBarProps {
  /** Percentual de 0 a 100. */
  value: number;
  tone?: ProgressTone;
  trackTone?: ProgressTrackTone;
  height?: number;
  label: string;
}

export function ProgressBar({
  value,
  tone = 'blue',
  trackTone = 'default',
  height = 6,
  label,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      className={`${styles.track} ${styles[trackTone]}`}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
    >
      <span className={`${styles.fill} ${styles[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
