'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './EntryModal.module.css';

interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repairType: string, qty: number, lot: string, flask: string) => void;
  types: readonly string[];
  flaskLabel?: string;
}

const OTHER = 'Other';

export function RepairModal({ isOpen, onClose, onSave, types, flaskLabel = 'Nomor Flask' }: RepairModalProps) {
  const [repairType, setRepairType] = useState<string>(types[0]);
  const [customType, setCustomType] = useState('');
  // 'Other' is never in `types` but is a valid choice, so exempt it from the
  // "reset to first option when the product's list changes" guard.
  useEffect(() => {
    if (repairType !== OTHER && !types.includes(repairType)) setRepairType(types[0]);
  }, [types]);
  const [qtyInput, setQtyInput] = useState('1');
  const [lot, setLot] = useState('');
  const [flask, setFlask] = useState('');

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    const type = repairType === OTHER ? customType.trim() : repairType;
    if (!type || !qty || qty < 1 || !lot.trim() || !flask.trim()) return;
    onSave(type, qty, lot.trim(), flask.trim());
    setQtyInput('1');
    setLot('');
    setFlask('');
    setCustomType('');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Repair">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jenis Repair</span>
        <select
          className={styles.select}
          size={6}
          value={repairType}
          onChange={(event) => setRepairType(event.target.value)}
        >
          {types.map((type) => <option key={type} value={type}>{type}</option>)}
          <option value={OTHER}>{OTHER}</option>
        </select>
      </label>
      {repairType === OTHER && (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Repair Lainnya</span>
          <input
            className={styles.input}
            value={customType}
            onChange={(event) => setCustomType(event.target.value)}
            placeholder="Ketik jenis repair"
          />
        </label>
      )}
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
          <span className={styles.fieldLabel}>{flaskLabel}</span>
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
        <button type="button" className={styles.saveButtonRepair} onClick={handleSave}>Simpan</button>
      </div>
    </Modal>
  );
}
