// Day: 07:00–19:00, Night: 20:00–08:00 — 1-hour rows, "HH:00" keys.
// Inclusive of both ends per spec: Day 7–19 = 13 rows (07..19), Night 20–08 = 13 rows (20..08).
export type ShiftTime = 'day' | 'night';
export type ShiftTimeValue = ShiftTime | '';

function rangeHours(start: number, end: number, wrap: boolean): string[] {
  const out: string[] = [];
  if (!wrap) {
    for (let h = start; h <= end; h++) out.push(`${String(h).padStart(2, '0')}:00`);
    return out;
  }
  // wrap past midnight: e.g. 20 -> 08 wraps through 23 -> 00
  let h = start;
  while (true) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h === end) break;
    h = (h + 1) % 24;
  }
  return out;
}

export function hoursForShiftTime(period: string | undefined | null): string[] {
  if (period === 'day') return rangeHours(7, 19, false);
  if (period === 'night') return rangeHours(20, 8, true);
  return [];
}

export function isShiftTime(value: string): value is ShiftTime {
  return value === 'day' || value === 'night';
}

// Fill every hour of the selected period with a zero snapshot if missing.
// Keeps existing non-zero snapshots intact — so production already booked isn't overwritten.
// Covers all four hourly maps (bc / shaft / cam / crank) with the same keys.
import type { HourlySnapshot, ProductionState } from '@/lib/types';

function ensureMapFilled(
  existing: Record<string, HourlySnapshot> | undefined,
  hours: string[],
): Record<string, HourlySnapshot> {
  const out: Record<string, HourlySnapshot> = { ...(existing ?? {}) };
  for (const h of hours) {
    if (!out[h]) out[h] = { ok: 0, repair: 0, ng: 0 };
  }
  return out;
}

export function withShiftHours(
  state: ProductionState,
  period: ShiftTime,
): ProductionState {
  const hours = hoursForShiftTime(period);
  if (hours.length === 0) return state;
  return {
    ...state,
    shiftTime: period,
    hourlyData: ensureMapFilled(state.hourlyData, hours),
    hourlyDataShaft: ensureMapFilled(state.hourlyDataShaft, hours),
    hourlyDataCam: ensureMapFilled(state.hourlyDataCam, hours),
    hourlyDataCrank: ensureMapFilled(state.hourlyDataCrank, hours),
    hourlyDataBc1: ensureMapFilled((state as any).hourlyDataBc1, hours),
    hourlyDataBc2: ensureMapFilled((state as any).hourlyDataBc2, hours),
  };
}

// UI helper: union existing keys with period hours, for display even before DB is written.
export function displayHours(
  hourlyData: Record<string, HourlySnapshot> | undefined,
  shiftTime: string | undefined | null,
): string[] {
  const keys = new Set(Object.keys(hourlyData ?? {}));
  for (const h of hoursForShiftTime(shiftTime)) keys.add(h);
  return [...keys];
}
