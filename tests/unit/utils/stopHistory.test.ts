import { describe, it, expect } from 'vitest';
import {
  dailyCounts, lastDays, stationCounts, stopLevel, stopsInRange, withLiveStops, type DatedStop,
} from '@/utils/stopHistory';

const today = new Date(2026, 9, 20, 10, 0); // 20 Oct 2026
const stop = (date: string, station?: DatedStop['station'], extra: Partial<DatedStop> = {}): DatedStop =>
  ({ date, start: '08:00', end: '08:30', problem: 'x', category: 'AV', station, ...extra });

describe('stopLevel', () => {
  it('is orange from 3 stops and red from 10', () => {
    expect([0, 2, 3, 9, 10, 25].map(stopLevel)).toEqual(['ok', 'ok', 'orange', 'orange', 'red', 'red']);
  });
});

describe('lastDays', () => {
  it('lists the last N dates ending today, oldest first, across a month edge', () => {
    expect(lastDays(3, today)).toEqual(['2026-10-18', '2026-10-19', '2026-10-20']);
    expect(lastDays(3, new Date(2026, 10, 1))).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(lastDays(30, today)[0]).toBe('2026-09-21');
  });
});

describe('stationCounts', () => {
  it('counts only the last 30 days and only stops that have a station', () => {
    const stops = [
      stop('2026-10-20', 'qc1'), stop('2026-10-01', 'qc1'), stop('2026-09-21', 'qc1'),
      stop('2026-09-20', 'qc1'), // day 31: out
      stop('2026-10-10', 'hsb05'), stop('2026-10-10'), // no station: nobody's
    ];
    expect(stationCounts(stops, today)).toEqual({ qc1: 3, hsb05: 1 });
  });
});

describe('withLiveStops / stopsInRange', () => {
  it('dates the running shift by its date, or today when it has none', () => {
    const live = [{ start: '08:00', end: '09:00', problem: 'y', category: 'AV' as const, station: 'qc1' as const }];
    expect(withLiveStops([], live, '2026-10-19', today)[0].date).toBe('2026-10-19');
    expect(withLiveStops([], live, '', today)[0].date).toBe('2026-10-20');
    expect(withLiveStops([stop('2026-10-01')], undefined, '', today)).toHaveLength(1);
  });

  it('keeps the stops inside the last N days', () => {
    const stops = [stop('2026-10-20'), stop('2026-10-14'), stop('2026-10-13')];
    expect(stopsInRange(stops, 7, today)).toHaveLength(2);
    expect(stopsInRange(stops, 30, today)).toHaveLength(3);
  });
});

describe('dailyCounts', () => {
  it('gives one entry per day with its stop count and minutes, empty days included', () => {
    const stops = [
      stop('2026-10-20', 'qc1'), stop('2026-10-20', 'qc1', { start: '10:00', end: '10:45' }), stop('2026-10-18', 'qc1'),
    ];
    const days = dailyCounts(stops, 3, today, today);
    expect(days).toEqual([
      { date: '2026-10-18', count: 1, minutes: 30 },
      { date: '2026-10-19', count: 0, minutes: 0 },
      { date: '2026-10-20', count: 2, minutes: 75 },
    ]);
  });
});
