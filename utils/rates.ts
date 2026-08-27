export interface Counters {
  ok1: number;
  repair1: number;
  ng1: number;
  ok2: number;
  repair2: number;
  ng2: number;
  ok3?: number;
  repair3?: number;
  ng3?: number;
  ok4?: number;
  repair4?: number;
  ng4?: number;
}

export function getOkTotal(c: Counters): number {
  return c.ok1 + c.ok2 + (c.ok3 ?? 0) + (c.ok4 ?? 0);
}

export function getRepairTotal(c: Counters): number {
  return c.repair1 + c.repair2 + (c.repair3 ?? 0) + (c.repair4 ?? 0);
}

export function getNgTotal(c: Counters): number {
  return c.ng1 + c.ng2 + (c.ng3 ?? 0) + (c.ng4 ?? 0);
}

export function getGrandTotal(c: Counters): number {
  return getOkTotal(c) + getRepairTotal(c) + getNgTotal(c);
}

export function getRates(c: Counters): { okRate: number; repairRate: number; ngRate: number } {
  const total = getGrandTotal(c);
  if (total === 0) return { okRate: 0, repairRate: 0, ngRate: 0 };
  return {
    okRate: Math.round((getOkTotal(c) / total) * 100),
    repairRate: Math.round((getRepairTotal(c) / total) * 100),
    ngRate: Math.round((getNgTotal(c) / total) * 100),
  };
}

export function getAchievementPercent(c: Counters, target: number): number {
  if (target <= 0) return 0;
  return Math.round((getGrandTotal(c) / target) * 100);
}

export function getProgressPercent(c: Counters, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((getGrandTotal(c) / target) * 100), 100);
}

export function isNgAlarmActive(c: Counters): boolean {
  const total = getGrandTotal(c);
  if (total === 0) return false;
  return (getNgTotal(c) / total) * 100 > 5;
}
