'use client';

import styles from './EntryModal.module.css';

const DICE = [1, 2, 3, 4] as const;

export type DieNumber = (typeof DICE)[number];

interface Props {
  value: DieNumber | null;
  onChange: (die: DieNumber) => void;
}

/**
 * Die (mould) picker for Mejashi Bore repairs. Same boxed-detail treatment as
 * OverDimensiFields: the "No. Die" label with the four boxes in a row to its
 * right, so the mandatory choice stays visible and editable instead of hiding
 * behind a one-shot popup.
 */
export function DieNumberFields({ value, onChange }: Props) {
  return (
    <div className={styles.overDimensiBox}>
      <div className={styles.dieNumberRow}>
        <span className={styles.fieldLabel}>No. Die</span>
        <div className={styles.dieNumberGrid} role="group" aria-label="Pilih No. Die">
          {DICE.map((die) => (
            <button
              key={die}
              type="button"
              className={value === die ? styles.dieCardActive : styles.dieCard}
              aria-pressed={value === die}
              onClick={() => onChange(die)}
            >
              {die}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
