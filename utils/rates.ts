import type { HourlySnapshot, ProductGroup, ProductLine } from '@/lib/types';

// A rate query can be scoped to a group ('bc' / 'shaft'), a single line
// (3 = Camshaft, 4 = Crankshaft), or left undefined for all four lines.
export type RateScope = ProductGroup | ProductLine;

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

// Which line numbers a scope covers. Omitting it means "all lines", which
// keeps every existing call site (and its tests) unchanged.
function linesFor(scope?: RateScope): readonly number[] {
  if (scope === 'bc') return [1, 2];
  if (scope === 'shaft') return [3, 4];
  if (typeof scope === 'number') return [scope];
  return [1, 2, 3, 4];
}

function sumField(c: Counters, field: 'ok' | 'repair' | 'ng', group?: RateScope): number {
  return linesFor(group).reduce(
    (total, n) => total + ((c[`${field}${n}` as keyof Counters] as number | undefined) ?? 0),
    0,
  );
}

export function getOkTotal(c: Counters, group?: RateScope): number {
  return sumField(c, 'ok', group);
}

export function getRepairTotal(c: Counters, group?: RateScope): number {
  return sumField(c, 'repair', group);
}

export function getNgTotal(c: Counters, group?: RateScope): number {
  return sumField(c, 'ng', group);
}

export function getGrandTotal(c: Counters, group?: RateScope): number {
  return getOkTotal(c, group) + getRepairTotal(c, group) + getNgTotal(c, group);
}

export function getRates(
  c: Counters,
  group?: RateScope,
): { okRate: number; repairRate: number; ngRate: number } {
  const total = getGrandTotal(c, group);
  if (total === 0) return { okRate: 0, repairRate: 0, ngRate: 0 };
  return {
    okRate: Math.round((getOkTotal(c, group) / total) * 100),
    repairRate: Math.round((getRepairTotal(c, group) / total) * 100),
    ngRate: Math.round((getNgTotal(c, group) / total) * 100),
  };
}

export function getAchievementPercent(c: Counters, target: number, group?: RateScope): number {
  if (target <= 0) return 0;
  return Math.round((getGrandTotal(c, group) / target) * 100);
}

export function getProgressPercent(c: Counters, target: number, group?: RateScope): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((getGrandTotal(c, group) / target) * 100), 100);
}

export function isNgAlarmActive(c: Counters, group?: RateScope): boolean {
  const total = getGrandTotal(c, group);
  if (total === 0) return false;
  return (getNgTotal(c, group) / total) * 100 > 5;
}

// --- Merging the per-group breakdown maps for the combined ("Semua") view ---

export function mergeCounts(
  ...maps: (Record<string, number> | undefined)[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const map of maps) {
    for (const [name, count] of Object.entries(map ?? {})) {
      out[name] = (out[name] ?? 0) + count;
    }
  }
  return out;
}

export function mergeHourly(
  ...maps: (Record<string, HourlySnapshot> | undefined)[]
): Record<string, HourlySnapshot> {
  const out: Record<string, HourlySnapshot> = {};
  for (const map of maps) {
    for (const [hour, snap] of Object.entries(map ?? {})) {
      const prev = out[hour] ?? { ok: 0, repair: 0, ng: 0 };
      out[hour] = {
        ok: prev.ok + snap.ok,
        repair: prev.repair + snap.repair,
        ng: prev.ng + snap.ng,
      };
    }
  }
  return out;
}
