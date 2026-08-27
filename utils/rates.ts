import type { HourlySnapshot, ProductGroup } from '@/lib/types';

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

// Which line numbers make up a group. Omitting the group means "all lines",
// which keeps every existing call site (and its tests) unchanged.
function linesFor(group?: ProductGroup): readonly number[] {
  if (group === 'bc') return [1, 2];
  if (group === 'shaft') return [3, 4];
  return [1, 2, 3, 4];
}

function sumField(c: Counters, field: 'ok' | 'repair' | 'ng', group?: ProductGroup): number {
  return linesFor(group).reduce(
    (total, n) => total + ((c[`${field}${n}` as keyof Counters] as number | undefined) ?? 0),
    0,
  );
}

export function getOkTotal(c: Counters, group?: ProductGroup): number {
  return sumField(c, 'ok', group);
}

export function getRepairTotal(c: Counters, group?: ProductGroup): number {
  return sumField(c, 'repair', group);
}

export function getNgTotal(c: Counters, group?: ProductGroup): number {
  return sumField(c, 'ng', group);
}

export function getGrandTotal(c: Counters, group?: ProductGroup): number {
  return getOkTotal(c, group) + getRepairTotal(c, group) + getNgTotal(c, group);
}

export function getRates(
  c: Counters,
  group?: ProductGroup,
): { okRate: number; repairRate: number; ngRate: number } {
  const total = getGrandTotal(c, group);
  if (total === 0) return { okRate: 0, repairRate: 0, ngRate: 0 };
  return {
    okRate: Math.round((getOkTotal(c, group) / total) * 100),
    repairRate: Math.round((getRepairTotal(c, group) / total) * 100),
    ngRate: Math.round((getNgTotal(c, group) / total) * 100),
  };
}

export function getAchievementPercent(c: Counters, target: number, group?: ProductGroup): number {
  if (target <= 0) return 0;
  return Math.round((getGrandTotal(c, group) / target) * 100);
}

export function getProgressPercent(c: Counters, target: number, group?: ProductGroup): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((getGrandTotal(c, group) / target) * 100), 100);
}

export function isNgAlarmActive(c: Counters, group?: ProductGroup): boolean {
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
