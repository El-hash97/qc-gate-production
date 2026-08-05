'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { REPAIR_TYPES } from '@/utils/constants';
import styles from './EntryModal.module.css';

interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repairType: string, qty: number) => void;
}

export function RepairModal({ isOpen, onClose, onSave }: RepairModalProps) {
  const [repairType, setRepairType] = useState<string>(REPAIR_TYPES[0]);
  const [qtyInput, setQtyInput] = useState('1');

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty < 1) return;
    onSave(repairType, qty);
    setQtyInput('1');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Repair">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jenis Repair</span>
        <select
          className={styles.select}
          value={repairType}
          onChange={(event) => setRepairType(event.target.value)}
        >
          {REPAIR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
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
        <button type="button" className={styles.saveButtonRepair} onClick={handleSave}>Simpan</button>
      </div>
    </Modal>
  );
}
