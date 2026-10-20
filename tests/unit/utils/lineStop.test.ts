import { describe, it, expect } from 'vitest';
import {
  lineStopMinutes, totalLineStopMinutes, formatDuration, activeStationStop, stopsAt,
  stopDuration, stopLabel, hhmmNow,
} from '@/utils/lineStop';

const at = (hhmm: string) => new Date(`2026-10-19T${hhmm}:00`);

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
    ], at('15:00'))).toBe(105);
  });

  it('an ongoing stop counts up to `now`', () => {
    expect(totalLineStopMinutes([
      { start: '10:00', problem: 'still going', category: 'AV' },
    ], at('10:40'))).toBe(40);
  });
});

describe('stopDuration', () => {
  it('uses the recorded end for a closed stop', () => {
    expect(stopDuration({ start: '08:00', end: '08:30', problem: 'a', category: 'AV' }, at('10:00'))).toBe(30);
  });

  it('an ongoing stop counts from its start to `now`, wrapping past midnight', () => {
    expect(stopDuration({ start: '10:00', problem: 'a', category: 'PE' }, at('11:45'))).toBe(105);
    // night shift: started 23:30, the clock reads 00:15 the next morning
    expect(stopDuration({ start: '23:30', problem: 'a', category: 'PE' }, at('00:15'))).toBe(45);
    expect(stopDuration({ start: 'oops', problem: 'a', category: 'PE' }, at('10:00'))).toBe(0);
  });
});

describe('stopLabel', () => {
  it('closes with the end time when there is one, and stays open with … while ongoing', () => {
    expect(stopLabel({ start: '08:00', end: '08:30', problem: 'a', category: 'AV' })).toBe('08:00–08:30');
    expect(stopLabel({ start: '08:00', problem: 'a', category: 'AV' })).toBe('08:00–…');
  });
});

describe('hhmmNow', () => {
  it('formats the clock as HH:MM, zero-padded', () => {
    expect(hhmmNow(at('07:05'))).toBe('07:05');
    expect(hhmmNow(at('23:59'))).toBe('23:59');
  });
});

describe('formatDuration', () => {
  it('shows minutes only under an hour, hours+minutes above', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(65)).toBe('1j 05m');
  });
});

describe('activeStationStop', () => {
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

  it('an ongoing stop (no end yet) stays active from its start until Selesai', () => {
    const s = { start: '10:00', problem: 'x', category: 'AV' as const, station: 'qc1' as const };
    expect(activeStationStop([s], at('10:00'))).toBe(s);
    expect(activeStationStop([s], at('11:30'))).toBe(s);
    // and, wrapped into a night shift, after midnight too
    expect(activeStationStop([{ ...s, start: '23:30' }], at('00:15'))).toBeTruthy();
    const done = stop('10:00', '10:30');
    expect(activeStationStop([done], at('11:30'))).toBeNull();
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
