import { describe, it, expect } from 'vitest';
import { NO_LINE, repairSuspects } from '@/utils/repairSuspect';
import type { DefectLineMapping, EntryLog } from '@/lib/types';

const rep = (type: string, die: 1 | 2 | 3 | 4 | undefined, lot: string, qty = 1, extra: Partial<EntryLog> = {}): EntryLog =>
  ({ kind: 'repair', group: 'bc', line: 2, type, qty, lot, flask: 'F1', die, ...extra });
const mappings = [{ id: 1, line: 'Core Making', defectName: 'Mejashi Bore', product: 'bc' }] as DefectLineMapping[];

describe('repairSuspects', () => {
  it('finds runs of the same die + lot in a row, across repair types, and groups each run by type', () => {
    const logs = [
      rep('Mejashi Bore 1', 1, '80'),                      // 1: run A
      { ...rep('Gas Hole', undefined, '80'), kind: 'defect' } as EntryLog, // 2: NG input, doesn't break
      rep('Mejashi Bore 4', 1, '80', 2),                   // 3: run A, other type
      rep('Mejashi Bore 1', 1, '80'),                      // 4: run A
      rep('Mejashi Bore 1', 2, '80'),                      // 5: other die: alone
      rep('Mejashi Bore 2', 3, '12'),                      // 6: run B
      rep('Mejashi Bore 2', 3, '12'),                      // 7: run B
    ];
    const r = repairSuspects(logs, mappings, 'bc');
    expect(r.runs).toBe(2);
    expect(r.pcs).toBe(6);
    expect(r.lines).toBe(1);
    expect(r.byLine).toEqual({ 'Core Making': 6 });
    expect(r.rows).toEqual([
      { lines: ['Core Making'], product: 'BC 2TR', type: 'Mejashi Bore 1', die: 1, lot: '80', inputs: 2, runInputs: 3, qty: 2, from: 1, to: 4 },
      { lines: ['Core Making'], product: 'BC 2TR', type: 'Mejashi Bore 4', die: 1, lot: '80', inputs: 1, runInputs: 3, qty: 2, from: 1, to: 4 },
      { lines: ['Core Making'], product: 'BC 2TR', type: 'Mejashi Bore 2', die: 3, lot: '12', inputs: 2, runInputs: 2, qty: 2, from: 6, to: 7 },
    ]);
  });

  it('needs the same product line too, and files unmapped repairs under no line', () => {
    const logs = [rep('Retak', 1, '5'), rep('Retak', 1, '5', 1, { line: 1 }), rep('Retak', 1, '5', 1, { line: 1 })];
    const r = repairSuspects(logs, mappings, 'bc');
    expect(r.runs).toBe(1);
    expect(r.rows[0]).toMatchObject({ product: 'BC 1TR', lines: [NO_LINE], from: 2, to: 3 });
    expect(r.lines).toBe(0);
  });

  it('finds nothing when no die repeats', () => {
    expect(repairSuspects([rep('Mejashi Bore 1', 1, '80'), rep('Mejashi Bore 1', 1, '81')], mappings).runs).toBe(0);
  });
});
