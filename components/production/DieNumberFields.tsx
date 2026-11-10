'use client';

import styles from './EntryModal.module.css';

const DICE = [1, 2, 3, 4] as const;

export type DieNumber = (typeof DICE)[number];

interface Props {
  value: DieNumber | null;
  onChange: (die: DieNumber | null) => void;
  // Not mandatory: tapping the picked die again clears it (null).
  optional?: boolean;
}

/**
 * Die (mould) picker: Mejashi Bore repairs (mandatory) and every BC 1TR / BC
 * 2TR NG and Repair entry (optional). Same boxed-detail treatment as
 * OverDimensiFields: the "No. Die" label with the four boxes in a row to its
 * right, so the choice stays visible and editable instead of hiding behind a
 * one-shot popup.
 */
export function DieNumberFields({ value, onChange, optional = false }: Props) {
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
              onClick={() => onChange(optional && value === die ? null : die)}
            >
              {die}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
