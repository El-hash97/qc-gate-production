import type { HourlySnapshot, HourWindow, LineStop } from '@/lib/types';
import { toMinutes } from '@/utils/lineStop';

// Seconds per piece when nothing is set. Block Cylinder runs at 50 s, which is
// the 72 pcs/hour the shift is measured against.
export const DEFAULT_CYCLE_TIME_SEC = 50;

// The three OEE factors and their product, each a 0-1 ratio. Round for display
// with toPercent().
export interface OeeBreakdown {
  av: number;
  pe: number;
  rq: number;
  oee: number;
}

const ZERO: OeeBreakdown = { av: 0, pe: 0, rq: 0, oee: 0 };

export function toPercent(ratio: number): number {
  return Math.round(ratio * 100);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

// Pieces an uninterrupted hour yields at this cycle time: 3600 s / 50 s = 72.
// A missing or nonsensical cycle time yields 0, which every caller reads as
// "capacity unknown" and reports 0% availability rather than dividing by zero.
export function hourCapacity(cycleTimeSec: number): number {
  if (!Number.isFinite(cycleTimeSec) || cycleTimeSec <= 0) return 0;
  return 3600 / cycleTimeSec;
}

// Minutes lost to PE line stops, split into the hours they actually fell in and
// keyed like the hourly snapshots ("07:00"). A stop from 07:50 to 08:20 books
// 10 minutes to 07:00 and 20 to 08:00; one that runs past midnight wraps around
// to 00:00. AV and RQ stops are not performance losses, so they're skipped.
export function peMinutesByHour(stops: LineStop[] = []): Record<string, number> {
  const out: Record<string, number> = {};
  for (const stop of stops) {
    if (stop.category !== 'PE') continue;
    const start = toMinutes(stop.start);
    const rawEnd = toMinutes(stop.end);
    if (start === null || rawEnd === null) continue;
    const end = rawEnd >= start ? rawEnd : rawEnd + 1440;
    for (let hour = Math.floor(start / 60); hour * 60 < end; hour++) {
      const overlap = Math.min(end, (hour + 1) * 60) - Math.max(start, hour * 60);
      if (overlap <= 0) continue;
      const key = `${String(hour % 24).padStart(2, '0')}:00`;
      out[key] = (out[key] ?? 0) + overlap;
    }
  }
  return out;
}

function currentHourKey(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}

// How much of an hour has actually been available to produce in. The hour the
// clock is in right now is only as long as the minutes gone by — measuring a
// 20-minute-old hour against a full 72 pcs would show a healthy line at 33%
// availability. Every other recorded hour counts as complete, which also keeps
// a night shift's pre-midnight hours full. Never 0, so capacity stays divisible.
export function elapsedMinutesInHour(hour: string, now: Date = new Date()): number {
  if (hour !== currentHourKey(now)) return 60;
  return Math.max(1, now.getMinutes());
}

// Minutes of an hour that were actually worked, per the operator-edited window
// ({start,end} as "HH:MM"). No window, or an unparseable / non-positive one,
// means the full 60. A break at the start, end, or middle of the hour is
// recorded by narrowing the range, so the span itself is the worked time.
// Capped at 60 — a window wider than its hour doesn't add capacity.
export function windowMinutes(hour: string, windows: Record<string, HourWindow> = {}): number {
  const w = windows[hour];
  if (!w) return 60;
  const start = toMinutes(w.start);
  const end = toMinutes(w.end);
  if (start === null || end === null || end <= start) return 60;
  return Math.min(60, end - start);
}

// How many minutes of an hour count toward OEE capacity: the worked window,
// but never more than the minutes that have actually elapsed (so the running
// hour still shortens as the clock moves). Never 0, so capacity stays
// divisible.
export function workedMinutesInHour(
  hour: string,
  windows: Record<string, HourWindow> = {},
  now: Date = new Date(),
): number {
  return Math.max(1, Math.min(elapsedMinutesInHour(hour, now), windowMinutes(hour, windows)));
}

/**
 * The three factors for a single hour.
 *
 * - AV: what the hour produced against what its cycle time allows (capped at
 *   100%, since beating the cycle time isn't extra availability).
 * - PE: the share of the hour not lost to PE line stops.
 * - RQ: OK pieces over everything produced — repair counts as a quality loss
 *   alongside NG, because a repaired piece needed a second pass.
 *
 * `elapsedMin` shortens the hour for the one currently running.
 */
export function hourlyOee(
  snapshot: HourlySnapshot,
  peMinutes: number,
  cycleTimeSec: number,
  elapsedMin: number = 60,
): OeeBreakdown {
  const produced = snapshot.ok + snapshot.repair + snapshot.ng;
  const minutes = Math.max(0, elapsedMin);
  const capacity = hourCapacity(cycleTimeSec) * (minutes / 60);

  const av = capacity > 0 ? clamp01(produced / capacity) : 0;
  const pe = minutes > 0 ? clamp01((minutes - Math.max(0, peMinutes)) / minutes) : 0;
  const rq = produced > 0 ? snapshot.ok / produced : 0;

  return { av, pe, rq, oee: av * pe * rq };
}

/**
 * The shift's OEE, built from the totals of every recorded hour rather than by
 * averaging the hourly percentages — an hour with two pieces in it would
 * otherwise weigh as much as a full one.
 *
 * Only hours present in `hourlyData` count, so PE stops logged outside the
 * running shift's hours are ignored, and a stop longer than an hour can't
 * subtract more than that hour holds.
 *
 * `windows` shortens any hour the operator marked as partly break time, so a
 * shift with a 45-minute lunch inside the 12:00 hour is measured against 15
 * minutes of capacity there, not 60.
 */
export function shiftOee(
  hourlyData: Record<string, HourlySnapshot>,
  stops: LineStop[] = [],
  cycleTimeSec: number = DEFAULT_CYCLE_TIME_SEC,
  now: Date = new Date(),
  windows: Record<string, HourWindow> = {},
): OeeBreakdown {
  const hours = Object.keys(hourlyData);
  if (hours.length === 0) return ZERO;

  const peByHour = peMinutesByHour(stops);
  const perHourCapacity = hourCapacity(cycleTimeSec);

  let produced = 0;
  let ok = 0;
  let capacity = 0;
  let minutes = 0;
  let peLost = 0;

  for (const hour of hours) {
    const snapshot = hourlyData[hour];
    const elapsed = workedMinutesInHour(hour, windows, now);
    produced += snapshot.ok + snapshot.repair + snapshot.ng;
    ok += snapshot.ok;
    capacity += perHourCapacity * (elapsed / 60);
    minutes += elapsed;
    peLost += Math.min(peByHour[hour] ?? 0, elapsed);
  }

  const av = capacity > 0 ? clamp01(produced / capacity) : 0;
  const pe = minutes > 0 ? clamp01((minutes - peLost) / minutes) : 0;
  const rq = produced > 0 ? ok / produced : 0;

  return { av, pe, rq, oee: av * pe * rq };
}
