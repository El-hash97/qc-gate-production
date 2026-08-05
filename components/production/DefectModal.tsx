'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEFECT_TYPES } from '@/utils/constants';
import styles from './EntryModal.module.css';

interface DefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (defectType: string, qty: number) => void;
}

export function DefectModal({ isOpen, onClose, onSave }: DefectModalProps) {
  const [defectType, setDefectType] = useState<string>(DEFECT_TYPES[0]);
  // Held as a string (not a coerced number) so the field can actually go
  // empty while the user is clearing/retyping it — a live `parseInt(...) ||
  // 1` fallback would snap an emptied field straight back to "1" and turn
  // every keystroke into an append rather than a replace.
  const [qtyInput, setQtyInput] = useState('1');

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty < 1) return;
    onSave(defectType, qty);
    setQtyInput('1');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Defect (NG)">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jenis Defect</span>
        <select
          className={styles.select}
          value={defectType}
          onChange={(event) => setDefectType(event.target.value)}
        >
          {DEFECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jumlah</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={999}
          value={qtyInput}
          onChange={(event) => setQtyInput(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>Batal</button>
        <button type="button" className={styles.saveButtonNg} onClick={handleSave}>Simpan</button>
      </div>
    </Modal>
  );
}
