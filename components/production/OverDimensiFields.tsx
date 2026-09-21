'use client';

import type { OverDimensiDetail } from '@/lib/types';
import styles from './EntryModal.module.css';

export interface OverDimensiFormState {
  dieMould: string;
  coreCombo: string;
  crankCaseNo: string;
  slubWjNo: string;
  position: string;
}

export const initialOverDimensiState: OverDimensiFormState = {
  dieMould: '',
  coreCombo: '',
  crankCaseNo: '',
  slubWjNo: '',
  position: '',
};

export function isOverDimensiValid(s: OverDimensiFormState): boolean {
  return (
    s.dieMould !== '' &&
    s.coreCombo !== '' &&
    s.crankCaseNo.trim() !== '' &&
    s.slubWjNo.trim() !== '' &&
    (s.position === 'Front' || s.position === 'Rear')
  );
}

export function toOverDimensiDetail(s: OverDimensiFormState): OverDimensiDetail {
  return {
    dieMould: parseInt(s.dieMould, 10) as OverDimensiDetail['dieMould'],
    coreCombo: parseInt(s.coreCombo, 10) as OverDimensiDetail['coreCombo'],
    crankCaseNo: s.crankCaseNo.trim(),
    slubWjNo: s.slubWjNo.trim(),
    position: s.position as 'Front' | 'Rear',
  };
}

const OPTIONS_1_10 = Array.from({ length: 10 }, (_, i) => String(i + 1));

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

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>No. Die Mould</span>
          <select
            className={styles.select}
            value={value.dieMould}
            onChange={(e) => update({ dieMould: e.target.value })}
          >
            <option value="">Pilih 1-10</option>
            {OPTIONS_1_10.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Combinasi Core</span>
          <select
            className={styles.select}
            value={value.coreCombo}
            onChange={(e) => update({ coreCombo: e.target.value })}
          >
            <option value="">Pilih 1-10</option>
            {OPTIONS_1_10.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.fieldRow3}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Crank case No.</span>
          <input
            className={styles.input}
            value={value.crankCaseNo}
            onChange={(e) => update({ crankCaseNo: e.target.value })}
            placeholder="1"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Slub/Wj No.</span>
          <input
            className={styles.input}
            value={value.slubWjNo}
            onChange={(e) => update({ slubWjNo: e.target.value })}
            placeholder="1"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Front / Rear</span>
          <select
            className={styles.select}
            value={value.position}
            onChange={(e) => update({ position: e.target.value })}
          >
            <option value="">Pilih</option>
            <option value="Front">Front</option>
            <option value="Rear">Rear</option>
          </select>
        </label>
      </div>
    </div>
  );
}
