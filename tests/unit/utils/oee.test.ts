import { describe, it, expect } from 'vitest';
import type { LineStop } from '@/lib/types';
import {
  DEFAULT_CYCLE_TIME_SEC, hourCapacity, peMinutesByHour,
  elapsedMinutesInHour, windowMinutes, workedMinutesInHour,
  hourlyOee, shiftOee, toPercent,
} from '@/utils/oee';

const stop = (start: string, end: string, category: LineStop['category']): LineStop =>
  ({ start, end, problem: 'x', category });

describe('hourCapacity', () => {
  it('turns a 50-second cycle time into 72 pcs per hour', () => {
    expect(hourCapacity(50)).toBe(72);
  });

  it('defaults to the 50-second cycle time', () => {
    expect(hourCapacity(DEFAULT_CYCLE_TIME_SEC)).toBe(72);
  });

  it('is zero for a missing or nonsensical cycle time', () => {
    expect(hourCapacity(0)).toBe(0);
    expect(hourCapacity(-5)).toBe(0);
    expect(hourCapacity(NaN)).toBe(0);
  });
});

describe('peMinutesByHour', () => {
  it('books a PE stop to the hour it happened in', () => {
    expect(peMinutesByHour([stop('07:10', '07:20', 'PE')])).toEqual({ '07:00': 10 });
  });

  it('ignores AV and RQ stops', () => {
    expect(peMinutesByHour([stop('07:10', '07:40', 'AV'), stop('08:00', '08:15', 'RQ')])).toEqual({});
  });

  it('splits a stop that crosses an hour boundary', () => {
    expect(peMinutesByHour([stop('07:50', '08:20', 'PE')])).toEqual({ '07:00': 10, '08:00': 20 });
  });

  it('splits a stop spanning a whole hour', () => {
    expect(peMinutesByHour([stop('07:30', '09:15', 'PE')]))
      .toEqual({ '07:00': 30, '08:00': 60, '09:00': 15 });
  });

  it('wraps past midnight for the night shift', () => {
    expect(peMinutesByHour([stop('23:40', '00:20', 'PE')])).toEqual({ '23:00': 20, '00:00': 20 });
  });

  it('adds up several stops in the same hour', () => {
    expect(peMinutesByHour([stop('07:05', '07:15', 'PE'), stop('07:40', '07:45', 'PE')]))
      .toEqual({ '07:00': 15 });
  });

  it('skips malformed and zero-length stops', () => {
    expect(peMinutesByHour([stop('oops', '07:20', 'PE'), stop('08:00', '08:00', 'PE')])).toEqual({});
  });

  it('handles no stops at all', () => {
    expect(peMinutesByHour()).toEqual({});
    expect(peMinutesByHour([])).toEqual({});
  });
});

describe('elapsedMinutesInHour', () => {
  const at = (h: number, m: number) => new Date(2026, 8, 8, h, m);

  it('counts a finished hour as a full 60 minutes', () => {
    expect(elapsedMinutesInHour('07:00', at(9, 30))).toBe(60);
  });

  it('counts only the minutes gone by in the running hour', () => {
    expect(elapsedMinutesInHour('09:00', at(9, 24))).toBe(24);
  });

  it('never returns zero at the top of the running hour', () => {
    expect(elapsedMinutesInHour('09:00', at(9, 0))).toBe(1);
  });

  it('treats an hour from earlier in a night shift as complete', () => {
    expect(elapsedMinutesInHour('23:00', at(1, 30))).toBe(60);
  });
});

describe('windowMinutes', () => {
  it('is a full 60 when the hour has no window', () => {
    expect(windowMinutes('07:00')).toBe(60);
    expect(windowMinutes('07:00', {})).toBe(60);
  });

  it('is the span of the edited window', () => {
    expect(windowMinutes('12:00', { '12:00': { start: '12:00', end: '12:45' } })).toBe(45);
    expect(windowMinutes('07:00', { '07:00': { start: '07:15', end: '08:00' } })).toBe(45);
  });

  it('caps at 60 for a window wider than its hour', () => {
    expect(windowMinutes('07:00', { '07:00': { start: '07:00', end: '09:00' } })).toBe(60);
  });

  it('falls back to a full hour for an unparseable or non-positive window', () => {
    expect(windowMinutes('07:00', { '07:00': { start: 'oops', end: '07:30' } })).toBe(60);
    expect(windowMinutes('07:00', { '07:00': { start: '07:30', end: '07:00' } })).toBe(60);
    expect(windowMinutes('07:00', { '07:00': { start: '07:00', end: '07:00' } })).toBe(60);
  });
});

describe('workedMinutesInHour', () => {
  const at = (h: number, m: number) => new Date(2026, 8, 8, h, m);

  it('is the window span for a finished hour', () => {
    expect(workedMinutesInHour('07:00', { '07:00': { start: '07:00', end: '07:45' } }, at(9, 0))).toBe(45);
  });

  it('never exceeds the minutes actually elapsed in the running hour', () => {
    expect(workedMinutesInHour('09:00', { '09:00': { start: '09:00', end: '09:40' } }, at(9, 24))).toBe(24);
  });

  it('falls back to the elapsed minutes when there is no window', () => {
    expect(workedMinutesInHour('09:00', {}, at(9, 24))).toBe(24);
    expect(workedMinutesInHour('07:00', {}, at(9, 24))).toBe(60);
  });
});

describe('hourlyOee', () => {
  const ct = 50;

  it('is 100% across the board when the hour hits capacity with no losses', () => {
    const r = hourlyOee({ ok: 72, repair: 0, ng: 0 }, 0, ct);
    expect(toPercent(r.av)).toBe(100);
    expect(toPercent(r.pe)).toBe(100);
    expect(toPercent(r.rq)).toBe(100);
    expect(toPercent(r.oee)).toBe(100);
  });

  it('drops availability when the hour falls short of 72 pcs', () => {
    expect(toPercent(hourlyOee({ ok: 36, repair: 0, ng: 0 }, 0, ct).av)).toBe(50);
  });

  it('caps availability at 100% when the hour overproduces', () => {
    expect(toPercent(hourlyOee({ ok: 80, repair: 0, ng: 0 }, 0, ct).av)).toBe(100);
  });

  it('drops performance by the share of the hour lost to PE stops', () => {
    expect(toPercent(hourlyOee({ ok: 72, repair: 0, ng: 0 }, 10, ct).pe)).toBe(83);
  });

  it('counts repair as a quality loss alongside NG', () => {
    expect(toPercent(hourlyOee({ ok: 60, repair: 8, ng: 4 }, 0, ct).rq)).toBe(83);
  });

  it('multiplies the three factors into OEE', () => {
    const r = hourlyOee({ ok: 60, repair: 8, ng: 4 }, 10, ct);
    expect(r.oee).toBeCloseTo(r.av * r.pe * r.rq, 10);
    expect(toPercent(r.oee)).toBe(69);
  });

  it('prorates capacity for the part of the hour that has elapsed', () => {
    // 36 pcs after 30 minutes is exactly on pace, so availability is 100%.
    expect(toPercent(hourlyOee({ ok: 36, repair: 0, ng: 0 }, 0, ct, 30).av)).toBe(100);
  });

  it('measures a PE stop against the elapsed minutes too', () => {
    expect(toPercent(hourlyOee({ ok: 36, repair: 0, ng: 0 }, 15, ct, 30).pe)).toBe(50);
  });

  it('never lets a PE stop longer than the hour push performance negative', () => {
    expect(hourlyOee({ ok: 10, repair: 0, ng: 0 }, 90, ct).pe).toBe(0);
  });

  it('is idle-safe: no production means no availability, quality or OEE', () => {
    expect(hourlyOee({ ok: 0, repair: 0, ng: 0 }, 0, ct)).toEqual({ av: 0, pe: 1, rq: 0, oee: 0 });
  });

  it('is zero when the cycle time is unusable', () => {
    expect(hourlyOee({ ok: 40, repair: 0, ng: 0 }, 0, 0).av).toBe(0);
  });
});

describe('shiftOee', () => {
  const now = new Date(2026, 8, 8, 12, 0);
  const ct = 50;

  it('aggregates from shift totals, not by averaging the hourly percentages', () => {
    const hourly = {
      '07:00': { ok: 72, repair: 0, ng: 0 },
      '08:00': { ok: 36, repair: 0, ng: 0 },
    };
    // 108 produced against 144 of capacity.
    expect(toPercent(shiftOee(hourly, [], ct, now).av)).toBe(75);
  });

  it('spreads PE minutes over the whole span of recorded hours', () => {
    const hourly = {
      '07:00': { ok: 72, repair: 0, ng: 0 },
      '08:00': { ok: 72, repair: 0, ng: 0 },
    };
    // 12 minutes lost out of 120.
    expect(toPercent(shiftOee(hourly, [stop('07:50', '08:02', 'PE')], ct, now).pe)).toBe(90);
  });

  it('ignores PE minutes from hours the shift never recorded', () => {
    const hourly = { '07:00': { ok: 72, repair: 0, ng: 0 } };
    expect(toPercent(shiftOee(hourly, [stop('14:00', '14:30', 'PE')], ct, now).pe)).toBe(100);
  });

  it('caps PE minutes at the length of the hour they fall in', () => {
    const hourly = { '07:00': { ok: 36, repair: 0, ng: 0 } };
    expect(shiftOee(hourly, [stop('06:00', '09:00', 'PE')], ct, now).pe).toBe(0);
  });

  it('takes quality from the shift totals', () => {
    const hourly = {
      '07:00': { ok: 60, repair: 8, ng: 4 },
      '08:00': { ok: 60, repair: 4, ng: 8 },
    };
    expect(toPercent(shiftOee(hourly, [], ct, now).rq)).toBe(83);
  });

  it('prorates the running hour', () => {
    const hourly = {
      '07:00': { ok: 72, repair: 0, ng: 0 },
      '12:00': { ok: 24, repair: 0, ng: 0 },
    };
    // At 12:20, capacity is 72 for 07:00 plus a third of 72 for the running hour.
    expect(toPercent(shiftOee(hourly, [], ct, new Date(2026, 8, 8, 12, 20)).av)).toBe(100);
  });

  it('is all zeros before the shift has recorded anything', () => {
    expect(shiftOee({}, [], ct, now)).toEqual({ av: 0, pe: 0, rq: 0, oee: 0 });
  });

  it('measures a part-break hour against its worked window, not a full 60', () => {
    const hourly = { '07:00': { ok: 36, repair: 0, ng: 0 } };
    // Full hour: 36 / 72 = 50% availability.
    expect(toPercent(shiftOee(hourly, [], ct, now).av)).toBe(50);
    // Half the hour was a break: 36 pcs against 36 of capacity = 100%.
    const windows = { '07:00': { start: '07:00', end: '07:30' } };
    expect(toPercent(shiftOee(hourly, [], ct, now, windows).av)).toBe(100);
  });
});

describe('toPercent', () => {
  it('rounds a 0-1 ratio to a whole percentage', () => {
    expect(toPercent(0.8333)).toBe(83);
    expect(toPercent(1)).toBe(100);
    expect(toPercent(0)).toBe(0);
  });
});
