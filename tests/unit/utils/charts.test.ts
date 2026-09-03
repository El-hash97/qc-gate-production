import { describe, it, expect } from 'vitest';
import {
  hourlySeries, pareto, flaskTypeMatrix, cavityTypeMatrix, expandCavities, lotDefectData, padLabels,
} from '@/utils/charts';
import type { EntryLog } from '@/lib/types';

describe('padLabels', () => {
  it('pads up to 4 blank, distinct slots and leaves real labels first', () => {
    const out = padLabels(['A', 'B']);
    expect(out.length).toBe(4);
    expect(out.slice(0, 2)).toEqual(['A', 'B']);
    expect(new Set(out).size).toBe(4); // fillers are distinct categories
  });

  it('leaves a list that already meets the minimum untouched', () => {
    expect(padLabels(['A', 'B', 'C', 'D', 'E'])).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('hourlySeries', () => {
  it('sorts hours and accumulates a running total of ok+repair+ng', () => {
    const { hours, cumulative, ng } = hourlySeries({
      '10:00': { ok: 5, repair: 1, ng: 0 },
      '09:00': { ok: 8, repair: 0, ng: 2 },
    });
    expect(hours).toEqual(['09:00', '10:00']);
    expect(ng).toEqual([2, 0]);
    expect(cumulative).toEqual([10, 16]);
  });
});

describe('pareto', () => {
  it('sorts desc and reports running cumulative percentage', () => {
    const { labels, counts, cumulativePct } = pareto({ A: 1, B: 6, C: 3 });
    expect(labels).toEqual(['B', 'C', 'A']);
    expect(counts).toEqual([6, 3, 1]);
    expect(cumulativePct).toEqual([60, 90, 100]);
  });

  it('returns empty arrays for no data', () => {
    expect(pareto({})).toEqual({ labels: [], counts: [], cumulativePct: [] });
  });
});

describe('flaskTypeMatrix', () => {
  const logs: EntryLog[] = [
    { kind: 'defect', type: 'Dross', qty: 2, lot: 'L1', flask: '10' },
    { kind: 'defect', type: 'Dross', qty: 1, lot: 'L2', flask: '10' },
    { kind: 'defect', type: 'Kake', qty: 4, lot: 'L3', flask: '2' },
  ];

  it('sums qty per (flask, type) cell, tracks the max, floors rows at 1..5 sorted numerically', () => {
    const { flasks, types, cells, max } = flaskTypeMatrix(logs);
    expect(flasks).toEqual(['1', '2', '3', '4', '5', '10']);
    expect(types).toEqual(['Dross', 'Kake']);
    expect(max).toBe(4);
    expect(cells).toContainEqual({ x: 'Dross', y: '10', v: 3, lots: ['L1', 'L2'] });
    expect(cells).toContainEqual({ x: 'Kake', y: '2', v: 4, lots: ['L3'] });
    // no empty cells emitted
    expect(cells).toHaveLength(2);
  });

  it('shows flask numbers 1..5 on the left even with no logs', () => {
    expect(flaskTypeMatrix([]).flasks).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('expandCavities', () => {
  it('expands a range, keeps singles, drops out-of-bounds', () => {
    expect(expandCavities('1-6')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(expandCavities('3')).toEqual([3]);
    expect(expandCavities('1,4,7')).toEqual([1, 4, 7]);
    expect(expandCavities('6-9')).toEqual([6, 7, 8]); // 9 is past cavity 8
    expect(expandCavities('')).toEqual([]);
  });
});

describe('cavityTypeMatrix', () => {
  it('always exposes cavities 1..8 and stacks range entries per cavity', () => {
    const logs: EntryLog[] = [
      { kind: 'defect', group: 'shaft', type: 'Dross', qty: 2, lot: 'L1', flask: '1-6' },
      { kind: 'defect', group: 'shaft', type: 'Dross', qty: 3, lot: 'L2', flask: '1-8' },
    ];
    const { flasks, cells } = cavityTypeMatrix(logs);
    expect(flasks).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    // cavity 1 gets both entries (2 + 3), cavity 7 only the 1-8 entry (3)
    expect(cells).toContainEqual({ x: 'Dross', y: '1', v: 5, lots: ['L1', 'L2'] });
    expect(cells).toContainEqual({ x: 'Dross', y: '7', v: 3, lots: ['L2'] });
  });
});

describe('lotDefectData', () => {
  it('groups points by product line, tracks the highest lot, orders by defect then lot', () => {
    const logs: EntryLog[] = [
      { kind: 'defect', line: 1, type: 'Kake', qty: 2, lot: '50', flask: '3' },
      { kind: 'defect', line: 1, type: 'Dross', qty: 1, lot: '65', flask: '4' },
      { kind: 'defect', line: 3, type: 'Dross', qty: 1, lot: '12', flask: '1-6' },
      { kind: 'defect', line: 1, type: 'Kake', qty: 1, lot: 'abc', flask: '9' }, // non-numeric lot dropped
    ];
    const { types, maxLot, series } = lotDefectData(logs);
    expect(types).toEqual(['Kake', 'Dross']);
    expect(maxLot).toBe(65);
    expect(series.map((s) => s.line)).toEqual([1, 3]);
    expect(series[0].points).toEqual([
      { x: 'Kake', y: 50, flask: '3', qty: 2 },
      { x: 'Dross', y: 65, flask: '4', qty: 1 },
    ]);
    expect(series[1].points).toEqual([{ x: 'Dross', y: 12, flask: '1-6', qty: 1 }]);
  });
});
