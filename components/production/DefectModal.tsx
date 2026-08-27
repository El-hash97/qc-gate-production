'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './EntryModal.module.css';

interface DefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (defectType: string, qty: number, lot: string, flask: string) => void;
  types: readonly string[];
}

export function DefectModal({ isOpen, onClose, onSave, types }: DefectModalProps) {
  const [defectType, setDefectType] = useState<string>(types[0]);
  // Products have different defect lists — when the target product changes
  // (e.g. BC 1TR's list to Camshaft's), fall back to that list's first
  // option instead of keeping a selection that no longer exists in it.
  useEffect(() => {
    if (!types.includes(defectType)) setDefectType(types[0]);
  }, [types]);
  // Held as a string (not a coerced number) so the field can actually go
  // empty while the user is clearing/retyping it — a live `parseInt(...) ||
  // 1` fallback would snap an emptied field straight back to "1" and turn
  // every keystroke into an append rather than a replace.
  const [qtyInput, setQtyInput] = useState('1');
  const [lot, setLot] = useState('');
  const [flask, setFlask] = useState('');

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty < 1 || !lot.trim() || !flask.trim()) return;
    onSave(defectType, qty, lot.trim(), flask.trim());
    setQtyInput('1');
    setLot('');
    setFlask('');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Defect (NG)">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jenis Defect</span>
        <select
          className={styles.select}
          size={6}
          value={defectType}
          onChange={(event) => setDefectType(event.target.value)}
        >
          {types.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nomor Lot</span>
          <input
            className={styles.input}
            value={lot}
            onChange={(event) => setLot(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nomor Flask</span>
          <input
            className={styles.input}
            value={flask}
            onChange={(event) => setFlask(event.target.value)}
          />
        </label>
      </div>
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
