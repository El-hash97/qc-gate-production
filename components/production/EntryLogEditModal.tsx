'use client';

import { DefectModal } from './DefectModal';
import { RepairModal } from './RepairModal';
import { DEFECT_TYPES, REPAIR_TYPES, SHAFT_DEFECT_TYPES, SHAFT_REPAIR_TYPES } from '@/utils/constants';
import { takenFlasks } from '@/utils/flask';
import type { EntryLogEdit } from '@/utils/entryLogEdit';
import type { EntryLog } from '@/lib/types';
import { lineGroup } from '@/lib/types';

interface Props {
  logs: EntryLog[];
  index: number;
  onSave: (edit: EntryLogEdit) => void;
  onClose: () => void;
}

// Reopens the NG or Repair form an entry was logged with, prefilled from it.
// Same per-product field rules as the Input page (BC flask boxes, Camshaft
// cavity picker, free-text Crankshaft cavity).
export function EntryLogEditModal({ logs, index, onSave, onClose }: Props) {
  const log = logs[index];
  if (!log) return null;
  const line = log.line ?? 1;
  const isShaft = lineGroup(line) === 'shaft';
  const initial: EntryLogEdit = {
    type: log.type, qty: log.qty, lot: log.lot, flask: log.flask,
    ...(log.die ? { die: log.die } : {}),
    ...(log.overDimensi ? { overDimensi: log.overDimensi } : {}),
  };
  // The entry's own flask doesn't block itself.
  const others = logs.filter((_, i) => i !== index);
  const shared = {
    isOpen: true,
    onClose,
    initial,
    flaskLabel: isShaft ? 'Nomor Cavity' : 'Nomor Flask',
    takenFlasks: isShaft ? undefined : (lot: string) => takenFlasks(others, lot, line),
    cavityPicker: line === 3,
  };

  return log.kind === 'defect' ? (
    <DefectModal
      {...shared}
      title="Edit Defect (NG)"
      types={isShaft ? SHAFT_DEFECT_TYPES : DEFECT_TYPES}
      onSave={(type, qty, lot, flask, overDimensi) => onSave({ type, qty, lot, flask, ...(overDimensi ? { overDimensi } : {}) })}
    />
  ) : (
    <RepairModal
      {...shared}
      title="Edit Repair"
      types={isShaft ? SHAFT_REPAIR_TYPES : REPAIR_TYPES}
      onSave={(type, qty, lot, flask, die, overDimensi) =>
        onSave({ type, qty, lot, flask, ...(die ? { die } : {}), ...(overDimensi ? { overDimensi } : {}) })}
    />
  );
}
