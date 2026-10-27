import type { LineStop } from '@/lib/types';
import { stopDuration } from '@/utils/lineStop';

// A line stop with the date of the shift it was logged in ("YYYY-MM-DD", the
// shift's own date: a night-shift stop after midnight stays on that date).
export interface DatedStop extends LineStop {
  date: string;
  // from the shift running now (not archived yet)
  live?: boolean;
}

// A machine turns orange / red from this many line stops in the shift running
// now; a shift change clears it (the archived stops stay in the history).
export const ORANGE_AT = 3;
export const RED_AT = 10;
export const WINDOW_DAYS = 30;
// the pop-up's filter
export const RANGES = [7, 14, 30] as const;

export type StopLevel = 'ok' | 'orange' | 'red';

export function stopLevel(count: number): StopLevel {
  return count >= RED_AT ? 'red' : count >= ORANGE_AT ? 'orange' : 'ok';
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The last `days` calendar dates ending today, oldest first.
export function lastDays(days: number, today: Date): string[] {
  return Array.from({ length: days }, (_, i) =>
    ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i))));
}

// Archived stops plus the shift running now (its date, else today's).
export function withLiveStops(
  archived: readonly DatedStop[], live: readonly LineStop[] | undefined, liveDate: string | undefined, today: Date,
): DatedStop[] {
  const date = liveDate || ymd(today);
  return [...archived, ...(live ?? []).map((s) => ({ ...s, date, live: true }))];
}

export function stopsInRange(stops: readonly DatedStop[], days: number, today: Date): DatedStop[] {
  const dates = new Set(lastDays(days, today));
  return stops.filter((s) => dates.has(s.date));
}

// Stops per machine in the shift running now (`live`). A stop without a
// station belongs to no machine and is not counted.
export function stationCounts(stops: readonly DatedStop[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of stops) {
    if (s.live && s.station) counts[s.station] = (counts[s.station] ?? 0) + 1;
  }
  return counts;
}

// One bar per day of the last `days`, empty days included.
export function dailyCounts(
  stops: readonly DatedStop[], days: number, today: Date, now: Date,
): { date: string; count: number; minutes: number }[] {
  const byDate = new Map(lastDays(days, today).map((d) => [d, { date: d, count: 0, minutes: 0 }]));
  for (const s of stops) {
    const day = byDate.get(s.date);
    if (!day) continue;
    day.count += 1;
    day.minutes += stopDuration(s, now);
  }
  return [...byDate.values()];
}
