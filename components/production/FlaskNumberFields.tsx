'use client';

import { FLASK_NUMBERS } from '@/utils/flask';
import styles from './EntryModal.module.css';

interface Props {
  label: string;
  value: string;
  onChange: (flask: string) => void;
  // Flasks already logged under the current lot — shown grey and unclickable
  // so the same piece can't be entered twice.
  taken: readonly string[];
}

/**
 * Block Cylinder flask picker: boxes 1-5 sized to the flask column, in place
 * of a free-text field. A <div>, not a <label>: a <label> wrapping several
 * buttons makes the browser re-click the first one on every other click
 * (the same trap ClockTimeInput hit in LineStopSection).
 */
export function FlaskNumberFields({ label, value, onChange, taken }: Props) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.flaskGrid} role="group" aria-label={label}>
        {FLASK_NUMBERS.map((flask) => {
          const isTaken = taken.includes(flask);
          return (
            <button
              key={flask}
              type="button"
              className={value === flask ? styles.flaskBoxActive : styles.flaskBox}
              aria-label={`Flask ${flask}`}
              aria-pressed={value === flask}
              disabled={isTaken}
              title={isTaken ? 'Sudah diinput di lot ini' : undefined}
              onClick={() => onChange(flask)}
            >
              {flask}
            </button>
          );
        })}
      </div>
    </div>
  );
}
