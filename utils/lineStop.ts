import type { LineStop } from '@/lib/types';

// Minutes between two "HH:MM" wall-clock times. An end earlier than the start
// is treated as crossing midnight (night shift), so 23:30 → 00:15 is 45 min.
// Malformed or missing input yields 0.
export function lineStopMinutes(start: string, end?: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return 0;
  return e >= s ? e - s : e + 1440 - s;
}

// "HH:MM" (24h) as minutes since midnight, or null when malformed. Exported
// so the OEE helpers can bucket a stop by the hours it spans.
export function toMinutes(hhmm?: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Line stops logged at `station` (oldest first).
export function stopsAt<T extends LineStop>(stops: readonly T[] = [], station: string): T[] {
  return stops.filter((s) => s.station === station);
}

// Minutes a stop lasted: from start to end for a closed stop, or from start to
// the minute of `now` while it is still going on (end missing/empty), so stop
// minutes and OEE bite as it happens rather than only after Selesai.
export function stopDuration(stop: LineStop, now: Date): number {
  if (stop.end) return lineStopMinutes(stop.start, stop.end);
  const a = toMinutes(stop.start);
  if (a === null) return 0;
  const t = now.getHours() * 60 + now.getMinutes();
  return (t - a + 1440) % 1440;
}

export function totalLineStopMinutes(stops: LineStop[], now: Date = new Date()): number {
  return stops.reduce((sum, s) => sum + stopDuration(s, now), 0);
}

// "07:10–08:25" for a closed stop, "07:10–…" while one is still going on.
export function stopLabel(stop: LineStop): string {
  return `${stop.start}–${stop.end || '…'}`;
}

// "45m" or "1j 05m" (j = jam).
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${String(m).padStart(2, '0')}m` : `${m}m`;
}

// The AV stop with a station that is going on at `now` (start inclusive, end
// exclusive, past midnight allowed), or null. The latest logged one wins. A
// stop without an end time is ongoing by definition: active from its start
// until the operator closes it with Selesai.
export function activeStationStop(stops: LineStop[] = [], now: Date): LineStop | null {
  const t = now.getHours() * 60 + now.getMinutes();
  for (let i = stops.length - 1; i >= 0; i--) {
    const s = stops[i];
    const a = toMinutes(s.start);
    if (s.category !== 'AV' || !s.station || a === null) continue;
    if (!s.end) return s;
    const len = lineStopMinutes(s.start, s.end);
    if ((t - a + 1440) % 1440 < len) return s;
  }
  return null;
}

// "07:10" for the steady flag: stamping the current "HH:MM" (Selesai sets this
// as a stop's end).
export function hhmmNow(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
