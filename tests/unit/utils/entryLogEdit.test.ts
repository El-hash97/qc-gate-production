import { describe, it, expect } from 'vitest';
import { editEntryLog } from '@/utils/entryLogEdit';
import type { ProductionState } from '@/lib/types';

const base = {
  date: '', shift: '', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 3, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 2, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: { 'Gas Hole': 2, Crack: 1 }, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: { Bari: 2 },
  entryLogs: [
    { kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole', qty: 2, lot: 'L1', flask: '1' },
    { kind: 'defect', group: 'bc', line: 1, type: 'Crack', qty: 1, lot: 'L2', flask: '2' },
    { kind: 'repair', group: 'shaft', line: 3, type: 'Bari', qty: 2, lot: 'L3', flask: '1-1' },
  ],
  savedAt: '',
} as unknown as ProductionState;

describe('editEntryLog', () => {
  it('moves the tally to the new type and adjusts the counter by the qty change', () => {
    const patch = editEntryLog(base, 0, { type: 'Crack', qty: 1, lot: 'L9', flask: '4' });
    expect(patch.ng1).toBe(2);
    expect(patch.defectData).toEqual({ Crack: 2 });
    expect(patch.entryLogs![0]).toEqual({ kind: 'defect', group: 'bc', line: 1, type: 'Crack', qty: 1, lot: 'L9', flask: '4' });
    expect(patch.entryLogs![1]).toBe(base.entryLogs[1]);
  });

  it('edits a shaft repair against the shaft tally and its own line counter', () => {
    const patch = editEntryLog(base, 2, { type: 'Bari', qty: 5, lot: 'L3', flask: '1-2' });
    expect(patch.repair3).toBe(5);
    expect(patch.repairDataShaft).toEqual({ Bari: 5 });
    expect(patch.defectData).toBeUndefined();
  });

  it('drops a die / Over Dimensi detail the edit no longer carries', () => {
    const withDie = {
      ...base,
      entryLogs: [{ kind: 'repair', group: 'bc', line: 1, type: 'Mejashi Bore 1', qty: 1, lot: 'L1', flask: '1', die: 2 }],
      repairData: { 'Mejashi Bore 1': 1 },
    } as unknown as ProductionState;
    const patch = editEntryLog(withDie, 0, { type: 'Gomi', qty: 1, lot: 'L1', flask: '1' });
    expect(patch.entryLogs![0]).not.toHaveProperty('die');
    expect(patch.repairData).toEqual({ Gomi: 1 });
  });

  it('re-derives the Camshaft die when the cavity is edited', () => {
    const cam = {
      ...base,
      entryLogs: [{ kind: 'defect', group: 'shaft', line: 3, type: 'Dross', qty: 1, lot: 'L1', flask: '1-2', die: 1 }],
      defectDataShaft: { Dross: 1 },
      ng3: 1,
    } as unknown as ProductionState;
    const patch = editEntryLog(cam, 0, { type: 'Dross', qty: 1, lot: 'L1', flask: '2-7' });
    expect(patch.entryLogs![0]).toMatchObject({ flask: '2-7', die: 2 });
  });

  it('returns no change for a missing index', () => {
    expect(editEntryLog(base, 9, { type: 'Crack', qty: 1, lot: 'L', flask: '1' })).toEqual({});
  });
});
