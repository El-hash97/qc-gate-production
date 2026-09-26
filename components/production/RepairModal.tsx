'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DieNumberFields } from './DieNumberFields';
import type { DieNumber } from './DieNumberFields';
import { TypeSelect, OTHER_TYPE } from './TypeSelect';
import { OverDimensiFields, initialOverDimensiState, isOverDimensiValid, toOverDimensiDetail } from './OverDimensiFields';
import { needsDieNumber, needsOverDimensiDetail } from '@/utils/constants';
import type { OverDimensiDetail } from '@/lib/types';
import styles from './EntryModal.module.css';

interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repairType: string, qty: number, lot: string, flask: string, die?: 1 | 2 | 3 | 4, overDimensi?: OverDimensiDetail) => void;
  types: readonly string[];
  flaskLabel?: string;
}

export function RepairModal({ isOpen, onClose, onSave, types, flaskLabel = 'Nomor Flask' }: RepairModalProps) {
  const [repairType, setRepairType] = useState<string>(types[0]);
  const [customType, setCustomType] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const lotRef = useRef<HTMLInputElement>(null);
  // 'Other' is never in `types` but is a valid choice, so exempt it from the
  // "reset to first option when the product's list changes" guard.
  useEffect(() => {
    if (repairType !== OTHER_TYPE && !types.includes(repairType)) setRepairType(types[0]);
  }, [types]);
  useEffect(() => {
    if (!isOpen || isSearching) return;
    if (needsOverDimensiDetail(repairType === OTHER_TYPE ? customType.trim() : repairType)) return;
    if (needsDieNumber(repairType)) return;
    if (repairType !== OTHER_TYPE) lotRef.current?.focus();
  }, [repairType, isOpen, isSearching, customType]);
  const [qtyInput, setQtyInput] = useState('1');
  const [lot, setLot] = useState('');
  const [flask, setFlask] = useState('');
  // Which die (mould) the piece came from — only meaningful for Mejashi Bore
  // repairs. Deliberately NOT reset after a save (mirrors repairType, which
  // also carries over) so logging several consecutive Mejashi Bore repairs
  // from the same die doesn't force re-picking it each time.
  const [dieNumber, setDieNumber] = useState<DieNumber | null>(null);
  const [overDimensi, setOverDimensi] = useState(initialOverDimensiState);

  function handleTypeChange(value: string) {
    setRepairType(value);
    // Drop a stale pick when moving to a type that has no die field, so it
    // can't leak into the saved record.
    if (!needsDieNumber(value)) setDieNumber(null);
  }

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    const type = repairType === OTHER_TYPE ? customType.trim() : repairType;
    if (!type || !qty || qty < 1 || !lot.trim() || !flask.trim()) return;
    if (needsOverDimensiDetail(type) && !isOverDimensiValid(overDimensi)) return;
    const overDetail = needsOverDimensiDetail(type) ? toOverDimensiDetail(overDimensi) : undefined;
    // A die number is mandatory for Mejashi Bore repairs. The inline No. Die
    // boxes are right there on the form, so an unselected one just blocks the
    // save like a missing lot or flask does.
    const die = needsDieNumber(type) ? dieNumber : null;
    if (needsDieNumber(type) && die === null) return;
    if (die !== null && overDetail) {
      onSave(type, qty, lot.trim(), flask.trim(), die, overDetail);
    } else if (die !== null) {
      onSave(type, qty, lot.trim(), flask.trim(), die);
    } else if (overDetail) {
      onSave(type, qty, lot.trim(), flask.trim(), undefined, overDetail);
    } else {
      onSave(type, qty, lot.trim(), flask.trim());
    }
    setQtyInput('1');
    setLot('');
    setFlask('');
    setCustomType('');
    setOverDimensi(initialOverDimensiState);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Repair" wide>
      <TypeSelect
        label="Jenis Repair"
        types={types}
        value={repairType}
        onChange={handleTypeChange}
        isOpen={isOpen}
        searchPlaceholder="Cari jenis repair…"
        onSearch={(q) => setIsSearching(q.trim().length > 0)}
      />
      {repairType === OTHER_TYPE && (
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
      {!isSearching && needsDieNumber(repairType) && (
        <DieNumberFields value={dieNumber} onChange={setDieNumber} />
      )}
      {!isSearching && needsOverDimensiDetail(repairType === OTHER_TYPE ? customType.trim() : repairType) && (
        <OverDimensiFields value={overDimensi} onChange={setOverDimensi} />
      )}
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nomor Lot</span>
          <input
            ref={lotRef}
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
