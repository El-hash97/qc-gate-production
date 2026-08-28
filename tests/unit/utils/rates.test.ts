import { describe, it, expect } from 'vitest';
import {
  getOkTotal, getRepairTotal, getNgTotal, getGrandTotal,
  getRates, getAchievementPercent, getProgressPercent, isNgAlarmActive,
  mergeCounts, mergeHourly,
} from '@/utils/rates';

const base = { ok1: 10, repair1: 2, ng1: 1, ok2: 5, repair2: 1, ng2: 1 };

describe('rates utilities', () => {
  it('sums OK across both products', () => {
    expect(getOkTotal(base)).toBe(15);
  });

  it('includes Camshaft/Crankshaft counters in the totals when present', () => {
    const withShafts = { ...base, ok3: 4, repair3: 1, ng3: 0, ok4: 2, repair4: 0, ng4: 1 };
    expect(getOkTotal(withShafts)).toBe(21);
    expect(getRepairTotal(withShafts)).toBe(4);
    expect(getNgTotal(withShafts)).toBe(3);
  });

  it('sums Repair across both products', () => {
    expect(getRepairTotal(base)).toBe(3);
  });

  it('sums NG across both products', () => {
    expect(getNgTotal(base)).toBe(2);
  });

  it('sums the grand total', () => {
    expect(getGrandTotal(base)).toBe(20);
  });

  it('returns 0% rates when total is 0', () => {
    const empty = { ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0 };
    expect(getRates(empty)).toEqual({ okRate: 0, repairRate: 0, ngRate: 0 });
  });

  it('computes rounded percentage rates', () => {
    expect(getRates(base)).toEqual({ okRate: 75, repairRate: 15, ngRate: 10 });
  });

  it('computes achievement percent relative to target', () => {
    expect(getAchievementPercent(base, 40)).toBe(50);
  });

  it('returns 0 achievement when target is 0', () => {
    expect(getAchievementPercent(base, 0)).toBe(0);
  });

  it('caps progress percent at 100', () => {
    expect(getProgressPercent(base, 10)).toBe(100);
  });

  it('flags NG alarm when NG rate exceeds 5%', () => {
    const highNg = { ok1: 10, repair1: 0, ng1: 5, ok2: 0, repair2: 0, ng2: 0 };
    expect(isNgAlarmActive(highNg)).toBe(true);
  });

  it('does not flag NG alarm at or below 5%', () => {
    const okNg = { ok1: 95, repair1: 0, ng1: 5, ok2: 0, repair2: 0, ng2: 0 };
    expect(isNgAlarmActive(okNg)).toBe(false);
  });
});

describe('rates utilities — product group scoping', () => {
  const mixed = {
    ok1: 10, repair1: 2, ng1: 1, ok2: 5, repair2: 1, ng2: 1,
    ok3: 4, repair3: 1, ng3: 0, ok4: 2, repair4: 0, ng4: 3,
  };

  it('sums only Block Cylinder lines for group "bc"', () => {
    expect(getOkTotal(mixed, 'bc')).toBe(15);
    expect(getRepairTotal(mixed, 'bc')).toBe(3);
    expect(getNgTotal(mixed, 'bc')).toBe(2);
    expect(getGrandTotal(mixed, 'bc')).toBe(20);
  });

  it('sums only Camshaft/Crankshaft lines for group "shaft"', () => {
    expect(getOkTotal(mixed, 'shaft')).toBe(6);
    expect(getRepairTotal(mixed, 'shaft')).toBe(1);
    expect(getNgTotal(mixed, 'shaft')).toBe(3);
    expect(getGrandTotal(mixed, 'shaft')).toBe(10);
  });

  it('sums all lines when no group is given', () => {
    expect(getGrandTotal(mixed)).toBe(30);
  });

  it('scopes to a single line by number (3 = Camshaft, 4 = Crankshaft)', () => {
    expect(getGrandTotal(mixed, 3)).toBe(5); // 4 + 1 + 0
    expect(getGrandTotal(mixed, 4)).toBe(5); // 2 + 0 + 3
    expect(getNgTotal(mixed, 4)).toBe(3);
  });

  it('scopes rates and achievement to the group', () => {
    expect(getRates(mixed, 'bc')).toEqual({ okRate: 75, repairRate: 15, ngRate: 10 });
    expect(getAchievementPercent(mixed, 40, 'bc')).toBe(50);
    expect(getProgressPercent(mixed, 5, 'shaft')).toBe(100);
  });

  it('flags the NG alarm per group', () => {
    // Shaft: 3 NG of 10 total = 30% > 5%.
    expect(isNgAlarmActive(mixed, 'shaft')).toBe(true);
    // BC: 2 NG of 20 total = 10% > 5%.
    expect(isNgAlarmActive(mixed, 'bc')).toBe(true);
  });
});

describe('merge helpers', () => {
  it('adds counts across maps', () => {
    expect(mergeCounts({ a: 2, b: 1 }, { b: 3, c: 5 }, undefined)).toEqual({ a: 2, b: 4, c: 5 });
  });

  it('sums hourly snapshots per hour', () => {
    expect(mergeHourly(
      { '07:00': { ok: 10, repair: 1, ng: 0 } },
      { '07:00': { ok: 4, repair: 0, ng: 2 }, '08:00': { ok: 3, repair: 0, ng: 0 } },
    )).toEqual({
      '07:00': { ok: 14, repair: 1, ng: 2 },
      '08:00': { ok: 3, repair: 0, ng: 0 },
    });
  });
});
