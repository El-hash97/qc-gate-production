'use client';

import styles from './CounterCard.module.css';

interface CounterCardProps {
  label: string;
  variant: 'ok' | 'repair' | 'ng';
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function CounterCard({ label, variant, value, onIncrement, onDecrement }: CounterCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onIncrement} aria-label={`Tambah ${label}`}>+</button>
        <button type="button" className={styles.button} onClick={onDecrement} aria-label={`Kurang ${label}`}>−</button>
      </div>
    </div>
  );
}
