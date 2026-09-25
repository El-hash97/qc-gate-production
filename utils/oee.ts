import type { HourlySnapshot, HourWindow, LineStop } from '@/lib/types';
import { toMinutes } from '@/utils/lineStop';

// Seconds per piece when nothing is set. Block Cylinder runs at 50 s, which is
// the 72 pcs/hour the shift is measured against.
export const DEFAULT_CYCLE_TIME_SEC = 50;

// Each product with an OEE of its own. 'all' (the mixed dashboard view) has
// none — three cycle times can't be blended into one.
export type OeeProduct = 'bc' | 'camshaft' | 'crankshaft';

// Pieces cast per Block Cylinder mould cycle: one BC, six camshafts, three
// crankshafts. Camshaft and Crankshaft have no cycle time of their own — the
// B/C cycle time drives all three, so an hour good for 72 BC is good for 432
// camshaft and 216 crankshaft.
export const PIECES_PER_BC: Record<OeeProduct, number> = { bc: 1, camshaft: 6, crankshaft: 3 };

// Seconds per piece for a product, from the B/C cycle time and its mould
// ratio: 50 s / 6 = 8.33 s per camshaft. Feeds hourCapacity() unchanged.
export function productCycleTime(product: OeeProduct, cycleTimeBcSec: number): number {
  return cycleTimeBcSec / PIECES_PER_BC[product];
}

// "50", "8,3", "16,7" — whole seconds stay whole, fractions get one decimal,
// in the id-ID comma style the rest of the UI uses.
export function formatCycleTime(cycleTimeSec: number): string {
  return cycleTimeSec.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

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

// Hours (and minutes) a single stop's [start,end) overlaps, split at hour
// boundaries and wrapped past midnight (a stop from 23:50 to 00:20 books 10
// minutes to 23:00 and 20 to 00:00). Shared by lineStopMinutesByHour (sums
// minutes, filtered by category) and lineStopsByHour (collects the stop
// itself, every category) so both split a stop the same way. Empty array for
// an unparseable start/end.
function hourOverlaps(stop: LineStop): { hour: string; minutes: number }[] {
  const start = toMinutes(stop.start);
  const rawEnd = toMinutes(stop.end);
  if (start === null || rawEnd === null) return [];
  const end = rawEnd >= start ? rawEnd : rawEnd + 1440;
  const out: { hour: string; minutes: number }[] = [];
  for (let hour = Math.floor(start / 60); hour * 60 < end; hour++) {
    const overlap = Math.min(end, (hour + 1) * 60) - Math.max(start, hour * 60);
    if (overlap <= 0) continue;
    out.push({ hour: `${String(hour % 24).padStart(2, '0')}:00`, minutes: overlap });
  }
  return out;
}

// Minutes lost to line stops of one category, split into the hours they
// actually fell in and keyed like the hourly snapshots ("07:00").
function lineStopMinutesByHour(
  stops: LineStop[],
  category: LineStop['category'],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const stop of stops) {
    if (stop.category !== category) continue;
    for (const { hour, minutes } of hourOverlaps(stop)) {
      out[hour] = (out[hour] ?? 0) + minutes;
    }
  }
  return out;
}

// Which line stops (any category) overlap each hour, keyed like the hourly
// snapshots ("07:00"). A stop from 07:50 to 08:20 appears under both 07:00
// and 08:00 — for the Hourly table's Item Problem / Countermeasure columns.
export function lineStopsByHour(stops: LineStop[] = []): Record<string, LineStop[]> {
  const out: Record<string, LineStop[]> = {};
  for (const stop of stops) {
    for (const { hour } of hourOverlaps(stop)) {
      (out[hour] ??= []).push(stop);
    }
  }
  return out;
}

// Minutes lost to AV line stops, per hour. AV is triggered purely by these
// stops now — not by production falling short of Plan — mirroring PE exactly.
export function avMinutesByHour(stops: LineStop[] = []): Record<string, number> {
  return lineStopMinutesByHour(stops, 'AV');
}

// Minutes lost to PE line stops, per hour.
export function peMinutesByHour(stops: LineStop[] = []): Record<string, number> {
  return lineStopMinutesByHour(stops, 'PE');
}

function currentHourKey(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}

// How much of an hour has actually been available to produce in. The hour the
// clock is in right now is only as long as the minutes gone by — measuring a
// 20-minute-old hour against a full 72 pcs would show a healthy line at 33%
// availability. Every other recorded hour counts as complete, which also keeps
// a night shift's pre-midnight hours full. Never 0, so capacity stays divisible.
//
// `now: null` means the shift is finished (e.g. an archived history record,
// not the live running shift) — every hour counts as a full 60 minutes, since
// there's no "current" clock hour to prorate against.
export function elapsedMinutesInHour(hour: string, now: Date | null = new Date()): number {
  if (now === null || hour !== currentHourKey(now)) return 60;
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
  now: Date | null = new Date(),
): number {
  return Math.max(1, Math.min(elapsedMinutesInHour(hour, now), windowMinutes(hour, windows)));
}

/**
 * The three factors for a single hour.
 *
 * - AV: the share of the hour not lost to AV line stops. Deliberately NOT a
 *   function of production vs. Plan any more — an hour that simply fell
 *   short of Plan (no machine down, just fewer pieces) no longer drags AV
 *   down; only an actual AV-category line stop does. A shortfall against
 *   Plan is instead surfaced in the Hourly table's Actual column (see
 *   HourlyTable.tsx), not folded into this score.
 * - PE: the share of the hour not lost to PE line stops. Same shape as AV,
 *   just keyed to the PE category.
 * - RQ: OK pieces over everything produced — repair counts as a quality loss
 *   alongside NG, because a repaired piece needed a second pass.
 *
 * `elapsedMin` shortens the hour for the one currently running, for both AV
 * and PE (a stop can't lose more of the hour than has actually elapsed).
 */
export function hourlyOee(
  snapshot: HourlySnapshot,
  avMinutes: number,
  peMinutes: number,
  elapsedMin: number = 60,
): OeeBreakdown {
  const produced = snapshot.ok + snapshot.repair + snapshot.ng;
  const minutes = Math.max(0, elapsedMin);

  const av = minutes > 0 ? clamp01((minutes - Math.max(0, avMinutes)) / minutes) : 0;
  const pe = minutes > 0 ? clamp01((minutes - Math.max(0, peMinutes)) / minutes) : 0;
  const rq = produced > 0 ? snapshot.ok / produced : 0;

  return { av, pe, rq, oee: av * pe * rq };
}

/**
 * The shift's OEE, built from the totals of every recorded hour rather than by
 * averaging the hourly percentages — an hour with two pieces in it would
 * otherwise weigh as much as a full one.
 *
 * Only hours present in `hourlyData` count, so AV/PE stops logged outside the
 * running shift's hours are ignored, and a stop longer than an hour can't
 * subtract more than that hour holds.
 *
 * `windows` shortens any hour the operator marked as partly break time, so a
 * shift with a 45-minute lunch inside the 12:00 hour is measured against 15
 * minutes of AV/PE denominator there, not 60.
 */
export function shiftOee(
  hourlyData: Record<string, HourlySnapshot>,
  stops: LineStop[] = [],
  now: Date | null = new Date(),
  windows: Record<string, HourWindow> = {},
): OeeBreakdown {
  const hours = Object.keys(hourlyData);
  if (hours.length === 0) return ZERO;

  const avByHour = avMinutesByHour(stops);
  const peByHour = peMinutesByHour(stops);

  let produced = 0;
  let ok = 0;
  let minutes = 0;
  let avLost = 0;
  let peLost = 0;

  for (const hour of hours) {
    const snapshot = hourlyData[hour];
    const elapsed = workedMinutesInHour(hour, windows, now);
    produced += snapshot.ok + snapshot.repair + snapshot.ng;
    ok += snapshot.ok;
    minutes += elapsed;
    avLost += Math.min(avByHour[hour] ?? 0, elapsed);
    peLost += Math.min(peByHour[hour] ?? 0, elapsed);
  }

  const av = minutes > 0 ? clamp01((minutes - avLost) / minutes) : 0;
  const pe = minutes > 0 ? clamp01((minutes - peLost) / minutes) : 0;
  const rq = produced > 0 ? ok / produced : 0;

  return { av, pe, rq, oee: av * pe * rq };
}
