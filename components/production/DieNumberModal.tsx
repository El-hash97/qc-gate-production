'use client';

import styles from './DieNumberModal.module.css';

interface DieNumberModalProps {
  isOpen: boolean;
  onSelect: (die: 1 | 2 | 3 | 4) => void;
}

const DICE = [1, 2, 3, 4] as const;

/**
 * Mandatory die (mould) picker shown when a Mejashi Bore repair type is
 * selected — traceability needs to know which of the four dies the piece
 * came from. Deliberately has no Batal/close affordance and no backdrop
 * click-to-dismiss: the only way past it is picking a card.
 *
 * Its own overlay rather than the shared `Modal` component — Modal wires a
 * document-level Escape listener and backdrop-click-to-close, both of which
 * this popup must not have, and a second such listener would also fire the
 * *parent* RepairModal's onClose since both listen on `document` regardless
 * of nesting.
 */
export function DieNumberModal({ isOpen, onSelect }: DieNumberModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.title}>Pilih Nomor Die</div>
        <div className={styles.grid}>
          {DICE.map((die) => (
            <button
              key={die}
              type="button"
              className={styles.card}
              onClick={() => onSelect(die)}
            >
              {die}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
