'use client';

import type { OverDimensiDetail } from '@/lib/types';
import styles from './EntryModal.module.css';

export interface OverDimensiFormState {
  dieMould: string;
  crankCaseNo: string;
  slubWjNo: string;
  position: string;
}

export const initialOverDimensiState: OverDimensiFormState = {
  dieMould: '',
  crankCaseNo: '',
  slubWjNo: '',
  position: '',
};

export function isOverDimensiValid(s: OverDimensiFormState): boolean {
  return (
    s.dieMould !== '' &&
    s.crankCaseNo.trim() !== '' &&
    s.slubWjNo.trim() !== '' &&
    s.position.trim() !== ''
  );
}

export function toOverDimensiDetail(s: OverDimensiFormState): OverDimensiDetail {
  return {
    dieMould: parseInt(s.dieMould, 10) as OverDimensiDetail['dieMould'],
    crankCaseNo: s.crankCaseNo.trim(),
    slubWjNo: s.slubWjNo.trim(),
    position: s.position.trim(),
  };
}

const DIE_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1));

interface Props {
  value: OverDimensiFormState;
  onChange: (next: OverDimensiFormState) => void;
}

export function OverDimensiFields({ value, onChange }: Props) {
  function update(patch: Partial<OverDimensiFormState>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className={styles.overDimensiBox}>
      <div className={styles.overDimensiTitle}>Detail Over Dimensi</div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>No. Die Mould</span>
        <div className={styles.dieMouldGrid} role="group" aria-label="Pilih No. Die Mould">
          {DIE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={value.dieMould === n ? styles.dieCardActive : styles.dieCard}
              aria-pressed={value.dieMould === n}
              onClick={() => update({ dieMould: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldRow3}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Crank case No.</span>
          <input
            className={styles.input}
            value={value.crankCaseNo}
            onChange={(e) => update({ crankCaseNo: e.target.value })}
            placeholder="0"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Slub/Wj No.</span>
          <input
            className={styles.input}
            value={value.slubWjNo}
            onChange={(e) => update({ slubWjNo: e.target.value })}
            placeholder="0"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Front / Rear No.</span>
          <input
            className={styles.input}
            value={value.position}
            onChange={(e) => update({ position: e.target.value })}
            placeholder="0"
          />
        </label>
      </div>
    </div>
  );
}
