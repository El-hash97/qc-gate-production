import { describe, it, expect } from 'vitest';
import {
  getOkTotal, getRepairTotal, getNgTotal, getGrandTotal,
  getRates, getAchievementPercent, getProgressPercent, isNgAlarmActive,
} from '@/utils/rates';

const base = { ok1: 10, repair1: 2, ng1: 1, ok2: 5, repair2: 1, ng2: 1 };

describe('rates utilities', () => {
  it('sums OK across both products', () => {
    expect(getOkTotal(base)).toBe(15);
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
