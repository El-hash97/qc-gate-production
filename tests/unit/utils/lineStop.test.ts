import { describe, it, expect } from 'vitest';
import { lineStopMinutes, totalLineStopMinutes, formatDuration, activeStationStop, stopsAt, stopRange, toMinutes } from '@/utils/lineStop';
import { lineStopsByHour, avMinutesByHour } from '@/utils/oee';
import type { LineStop } from '@/lib/types';

describe('lineStopMinutes', () => {
  it('returns the gap in minutes for a same-day stop', () => {
    expect(lineStopMinutes('08:15', '09:00')).toBe(45);
  });

  it('wraps past midnight when end is before start', () => {
    expect(lineStopMinutes('23:30', '00:15')).toBe(45);
  });

  it('is 0 for equal times and for malformed input', () => {
    expect(lineStopMinutes('10:00', '10:00')).toBe(0);
    expect(lineStopMinutes('', '10:00')).toBe(0);
    expect(lineStopMinutes('25:00', '10:00')).toBe(0);
  });
});

describe('totalLineStopMinutes', () => {
  it('sums every stop', () => {
    expect(totalLineStopMinutes([
      { start: '08:00', end: '08:30', problem: 'a', category: 'AV' },
      { start: '13:00', end: '14:15', problem: 'b', category: 'PE' },
    ])).toBe(105);
  });
});

describe('formatDuration', () => {
  it('shows minutes only under an hour, hours+minutes above', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(65)).toBe('1j 05m');
  });
});

describe('activeStationStop', () => {
  const at = (hhmm: string) => new Date(`2026-10-19T${hhmm}:00`);
  const stop = (start: string, end: string, extra: object = {}) =>
    ({ start, end, problem: 'x', category: 'AV' as const, station: 'qc1' as const, ...extra });

  it('finds the AV station stop running now, end exclusive', () => {
    const s = stop('10:00', '10:30');
    expect(activeStationStop([s], at('10:00'))).toBe(s);
    expect(activeStationStop([s], at('10:29'))).toBe(s);
    expect(activeStationStop([s], at('10:30'))).toBeNull();
    expect(activeStationStop([s], at('09:59'))).toBeNull();
  });

  it('wraps past midnight', () => {
    const s = stop('23:50', '00:10');
    expect(activeStationStop([s], at('00:05'))).toBe(s);
    expect(activeStationStop([s], at('00:10'))).toBeNull();
  });

  it('ignores stops without a station or not AV, latest wins', () => {
    const a = stop('10:00', '11:00');
    const b = stop('10:10', '10:40', { station: 'hsb05' });
    expect(activeStationStop([stop('10:00', '11:00', { station: undefined }), stop('10:00', '11:00', { category: 'PE' })], at('10:15'))).toBeNull();
    expect(activeStationStop([a, b], at('10:15'))).toBe(b);
  });
});

describe('stopsAt', () => {
  it('keeps only the stops logged at that station, in order', () => {
    const a = { start: '08:00', end: '08:10', problem: 'a', category: 'AV' as const, station: 'qc1' as const };
    const b = { ...a, station: 'hsb05' as const };
    const c = { ...a, start: '09:00' };
    expect(stopsAt([a, b, c], 'qc1')).toEqual([a, c]);
    expect(stopsAt(undefined, 'qc1')).toEqual([]);
  });
});

describe('a line stop with no end time yet', () => {
  // Written by a still-running stop (e.g. a build that logs open-ended stops):
  // must not crash the Dashboard, just count as 0 minutes.
  const open = { start: '10:30', problem: 'tes', category: 'AV' } as unknown as LineStop;

  it('reads a missing time as null instead of throwing', () => {
    expect(toMinutes(undefined)).toBeNull();
    expect(lineStopMinutes(open.start, open.end)).toBe(0);
  });

  it('is skipped by the per-hour OEE buckets', () => {
    expect(lineStopsByHour([open])).toEqual({});
    expect(avMinutesByHour([open])).toEqual({});
  });

  it('shows an ellipsis for the missing end', () => {
    expect(stopRange(open)).toBe('10:30–…');
    expect(stopRange({ start: '07:10', end: '07:40' })).toBe('07:10–07:40');
  });
});
