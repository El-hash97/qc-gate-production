import { describe, it, expect } from 'vitest';
import { panelData } from '@/utils/visualPanels';
import type { ProductionState } from '@/lib/types';

const state = {
  date: '2026-10-16', shift: '1', operator: '', target: 0, savedAt: '',
  ok1: 200, repair1: 10, ng1: 5, ok2: 100, repair2: 5, ng2: 0,
  ok3: 50, repair3: 1, ng3: 1, // camshaft: not part of the BC panels
  targetBc: 600, shiftTime: 'day', cycleTimeBc: 50,
  hourlyData: { '07:00': { ok: 150, repair: 8, ng: 2 }, '08:00': { ok: 150, repair: 7, ng: 3 } },
  defectData: { Keropos: 3, Retak: 2 }, repairData: { Burry: 15 },
  entryLogs: [
    { kind: 'defect', group: 'bc', type: 'Keropos', qty: 1, lot: '1', flask: '1' },
    { kind: 'defect', group: 'shaft', type: 'Cam', qty: 1, lot: '2', flask: '2' },
    { kind: 'repair', group: 'bc', type: 'Burry', qty: 2, lot: '3', flask: '3' },
  ],
  lineStops: [{ start: '23:50', end: '00:10', problem: 'x', category: 'AV' }],
} as unknown as ProductionState;

describe('panelData', () => {
  const d = panelData(state, new Date(2026, 9, 16, 9, 0));

  it('counts Block Cylinder only, against the BC target', () => {
    expect([d.ok, d.repair, d.ng, d.total]).toEqual([300, 15, 5, 320]);
    expect(d.remaining).toBe(280);
    expect(d.achievement).toBe(53);
  });

  it('lays out the whole day shift with the plan per hour', () => {
    expect(d.hourly[0]).toEqual({ hour: '07:00', produced: 160, plan: 72 });
    expect(d.hourly.find((h) => h.hour === '12:00')?.produced).toBe(0);
    expect(d.currentHour).toBe('09:00');
  });

  it('estimates the finish from the pace of the hours worked', () => {
    // 320 pcs over 07:00-09:00 (120 min) → 280 left takes 105 min
    expect(d.etaMin).toBe(105);
  });

  it('lists the newest BC entries first and sums stop minutes across midnight', () => {
    expect(d.recent.map((l) => l.type)).toEqual(['Burry', 'Keropos']);
    expect(d.stopMin.AV).toBe(20);
    expect(d.topNg[0]).toEqual({ label: 'Keropos', count: 3 });
  });
});
