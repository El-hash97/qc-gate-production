'use client';

import { SHIFTS } from '@/utils/constants';
import styles from './HistoryFilterBar.module.css';

interface HistoryFilterBarProps {
  date: string;
  shift: string;
  onDateChange: (date: string) => void;
  onShiftChange: (shift: string) => void;
}

export function HistoryFilterBar({ date, shift, onDateChange, onShiftChange }: HistoryFilterBarProps) {
  return (
    <div className={styles.bar}>
      <label className={styles.field}>
        <span>Tanggal</span>
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Shift</span>
        <select value={shift} onChange={(event) => onShiftChange(event.target.value)}>
          <option value="">Semua Shift</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
  );
}
