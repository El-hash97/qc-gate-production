'use client';

import { useState } from 'react';
import styles from './EntryModal.module.css';

const TRS = [
  { id: 1, label: 'TR KAI 1 - IN' },
  { id: 2, label: 'TR KAI 2 - EX' },
] as const;
const DIES = [1, 2] as const;

interface Props {
  label: string;
  value: string;
  onChange: (cavity: string) => void;
}

/**
 * Camshaft cavity picker. TR KAI (1 IN / 2 EX) and No. Die (1 / 2) are
 * single-choice toggles; together they generate the four cavity boxes, e.g.
 * TR KAI 1 + Die 2 -> 1-5..1-8. The saved value is the same "1-6" string the
 * free-text field used to hold. Divs, not labels, around the buttons (see
 * FlaskNumberFields).
 */
export function CavityFields({ label, value, onChange }: Props) {
  const [tr, setTr] = useState<1 | 2>(1);
  const [die, setDie] = useState<1 | 2>(1);

  // Changing TR/Die changes the option set, so a pick from the old set is stale.
  function pick(nextTr: 1 | 2, nextDie: 1 | 2) {
    setTr(nextTr);
    setDie(nextDie);
    onChange('');
  }

  const cavities = [1, 2, 3, 4].map((n) => `${tr}-${(die - 1) * 4 + n}`);

  return (
    <>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>TR KAI</span>
        <div className={styles.cavityGrid2} role="group" aria-label="Pilih TR KAI">
          {TRS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tr === t.id ? styles.flaskBoxActive : styles.flaskBox}
              aria-pressed={tr === t.id}
              onClick={() => pick(t.id, die)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>No. Die</span>
        <div className={styles.cavityGrid2} role="group" aria-label="Pilih No. Die">
          {DIES.map((d) => (
            <button
              key={d}
              type="button"
              className={die === d ? styles.flaskBoxActive : styles.flaskBox}
              aria-pressed={die === d}
              onClick={() => pick(tr, d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>
        <div className={styles.cavityGrid4} role="group" aria-label={label}>
          {cavities.map((c) => (
            <button
              key={c}
              type="button"
              className={value === c ? styles.flaskBoxActive : styles.flaskBox}
              aria-label={`Cavity ${c}`}
              aria-pressed={value === c}
              onClick={() => onChange(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
