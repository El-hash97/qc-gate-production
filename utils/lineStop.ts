import type { LineStop } from '@/lib/types';

// Minutes between two "HH:MM" wall-clock times. An end earlier than the start
// is treated as crossing midnight (night shift), so 23:30 → 00:15 is 45 min.
// Malformed input yields 0.
export function lineStopMinutes(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return 0;
  return e >= s ? e - s : e + 1440 - s;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function totalLineStopMinutes(stops: LineStop[]): number {
  return stops.reduce((sum, s) => sum + lineStopMinutes(s.start, s.end), 0);
}

// "45m" or "1j 05m" (j = jam).
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${String(m).padStart(2, '0')}m` : `${m}m`;
}
