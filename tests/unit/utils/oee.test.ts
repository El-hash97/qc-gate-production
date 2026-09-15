import { describe, it, expect } from 'vitest';
import type { LineStop } from '@/lib/types';
import {
  DEFAULT_CYCLE_TIME_SEC, PIECES_PER_BC, productCycleTime, hourCapacity,
  avMinutesByHour, peMinutesByHour,
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

describe('productCycleTime', () => {
  it('leaves Block Cylinder at its own cycle time', () => {
    expect(productCycleTime('bc', 50)).toBe(50);
  });

  it('derives Camshaft and Crankshaft from the B/C cycle time by their mould ratio', () => {
    // 1 BC = 6 camshaft = 3 crankshaft, so an hour that casts 72 BC yields
    // 432 camshaft and 216 crankshaft.
    expect(hourCapacity(productCycleTime('camshaft', 50))).toBeCloseTo(432, 9);
    expect(hourCapacity(productCycleTime('crankshaft', 50))).toBeCloseTo(216, 9);
    expect(productCycleTime('camshaft', 50)).toBeCloseTo(50 / 6, 9);
    expect(productCycleTime('crankshaft', 50)).toBeCloseTo(50 / 3, 9);
  });

  it('follows a changed B/C cycle time', () => {
    expect(hourCapacity(productCycleTime('camshaft', 60))).toBeCloseTo(360, 9);
  });

  it('exposes the ratios themselves', () => {
    expect(PIECES_PER_BC).toEqual({ bc: 1, camshaft: 6, crankshaft: 3 });
  });

  it('passes an unusable B/C cycle time through as unusable', () => {
    expect(hourCapacity(productCycleTime('camshaft', 0))).toBe(0);
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

describe('avMinutesByHour', () => {
  // Same hour-splitting/wrapping mechanics as peMinutesByHour (covered
  // exhaustively above) — just filtered to the AV category instead of PE.
  it('books an AV stop to the hour it happened in, and ignores PE/RQ stops', () => {
    expect(avMinutesByHour([stop('07:10', '07:20', 'AV')])).toEqual({ '07:00': 10 });
    expect(avMinutesByHour([stop('07:10', '07:40', 'PE'), stop('08:00', '08:15', 'RQ')])).toEqual({});
  });

  it('splits an AV stop that crosses an hour boundary', () => {
    expect(avMinutesByHour([stop('07:50', '08:20', 'AV')])).toEqual({ '07:00': 10, '08:00': 20 });
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

  it('treats every hour as a full 60 minutes for a finished shift (now: null)', () => {
    expect(elapsedMinutesInHour('09:00', null)).toBe(60);
    expect(elapsedMinutesInHour('23:00', null)).toBe(60);
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

  it('is the full window span for a finished shift (now: null), even for the hour "now" would be running', () => {
    expect(workedMinutesInHour('09:00', { '09:00': { start: '09:00', end: '09:40' } }, null)).toBe(40);
    expect(workedMinutesInHour('09:00', {}, null)).toBe(60);
  });
});

describe('hourlyOee', () => {
  it('is 100% across the board with no AV/PE stops and no quality loss', () => {
    const r = hourlyOee({ ok: 72, repair: 0, ng: 0 }, 0, 0);
    expect(toPercent(r.av)).toBe(100);
    expect(toPercent(r.pe)).toBe(100);
    expect(toPercent(r.rq)).toBe(100);
    expect(toPercent(r.oee)).toBe(100);
  });

  it('drops availability by the share of the hour lost to AV stops', () => {
    expect(toPercent(hourlyOee({ ok: 36, repair: 0, ng: 0 }, 30, 0).av)).toBe(50);
  });

  it('is NOT affected by production falling short of Plan when no AV stop is logged', () => {
    // Revision: AV used to drop from production vs. capacity; it no longer
    // does — only an actual AV-category line stop lowers it, mirroring PE.
    // A missed Plan is instead shown as a percentage in the Actual column
    // (see HourlyTable.tsx), not folded into this score.
    expect(toPercent(hourlyOee({ ok: 5, repair: 0, ng: 0 }, 0, 0).av)).toBe(100);
    expect(toPercent(hourlyOee({ ok: 0, repair: 0, ng: 0 }, 0, 0).av)).toBe(100);
  });

  it('drops performance by the share of the hour lost to PE stops', () => {
    expect(toPercent(hourlyOee({ ok: 72, repair: 0, ng: 0 }, 0, 10).pe)).toBe(83);
  });

  it('counts repair as a quality loss alongside NG', () => {
    expect(toPercent(hourlyOee({ ok: 60, repair: 8, ng: 4 }, 0, 0).rq)).toBe(83);
  });

  it('multiplies the three factors into OEE', () => {
    const r = hourlyOee({ ok: 60, repair: 8, ng: 4 }, 0, 10);
    expect(r.oee).toBeCloseTo(r.av * r.pe * r.rq, 10);
    expect(toPercent(r.oee)).toBe(69);
  });

  it('measures an AV stop against the elapsed minutes for the running hour', () => {
    // A 15-minute AV stop within a 30-minute-old running hour: (30-15)/30 = 50%.
    expect(toPercent(hourlyOee({ ok: 10, repair: 0, ng: 0 }, 15, 0, 30).av)).toBe(50);
  });

  it('measures a PE stop against the elapsed minutes too', () => {
    expect(toPercent(hourlyOee({ ok: 36, repair: 0, ng: 0 }, 0, 15, 30).pe)).toBe(50);
  });

  it('never lets an AV stop longer than the hour push availability negative', () => {
    expect(hourlyOee({ ok: 10, repair: 0, ng: 0 }, 90, 0).av).toBe(0);
  });

  it('never lets a PE stop longer than the hour push performance negative', () => {
    expect(hourlyOee({ ok: 10, repair: 0, ng: 0 }, 0, 90).pe).toBe(0);
  });

  it('is idle-safe: no production still shows full AV/PE absent stops, but zero quality and OEE', () => {
    expect(hourlyOee({ ok: 0, repair: 0, ng: 0 }, 0, 0)).toEqual({ av: 1, pe: 1, rq: 0, oee: 0 });
  });
});

describe('shiftOee', () => {
  const now = new Date(2026, 8, 8, 12, 0);

  it('aggregates AV loss from total minutes across hours, not by averaging their percentages', () => {
    const hourly = {
      '07:00': { ok: 72, repair: 0, ng: 0 }, // a full, finished hour — no AV stop
      '12:00': { ok: 5, repair: 0, ng: 0 }, // the running hour, 5 minutes old
    };
    const running = new Date(2026, 8, 8, 12, 5);
    // 07:00 contributes 60 unaffected minutes; 12:00 contributes 5 minutes,
    // all of them lost to the AV stop. Totals: (65-5)/65 ≈ 92%. Averaging the
    // two hours' own percentages instead (100% and 0%) would wrongly give
    // 50% — letting a 5-minute-old hour outweigh a finished one.
    expect(toPercent(shiftOee(hourly, [stop('12:00', '12:05', 'AV')], running).av)).toBe(92);
  });

  it('spreads AV minutes over the whole span of recorded hours', () => {
    const hourly = {
      '07:00': { ok: 72, repair: 0, ng: 0 },
      '08:00': { ok: 72, repair: 0, ng: 0 },
    };
    // 12 minutes lost out of 120.
    expect(toPercent(shiftOee(hourly, [stop('07:50', '08:02', 'AV')], now).av)).toBe(90);
  });

  it('spreads PE minutes over the whole span of recorded hours', () => {
    const hourly = {
      '07:00': { ok: 72, repair: 0, ng: 0 },
      '08:00': { ok: 72, repair: 0, ng: 0 },
    };
    // 12 minutes lost out of 120.
    expect(toPercent(shiftOee(hourly, [stop('07:50', '08:02', 'PE')], now).pe)).toBe(90);
  });

  it('is NOT affected by production falling short of Plan when no AV stop is logged', () => {
    // Revision: a shift that undershot its hourly Plan every hour, with no
    // AV-category line stop ever logged, still reads 100% availability.
    const hourly = {
      '07:00': { ok: 10, repair: 0, ng: 0 },
      '08:00': { ok: 0, repair: 0, ng: 0 },
    };
    expect(toPercent(shiftOee(hourly, []).av)).toBe(100);
  });

  it('ignores AV minutes from hours the shift never recorded', () => {
    const hourly = { '07:00': { ok: 72, repair: 0, ng: 0 } };
    expect(toPercent(shiftOee(hourly, [stop('14:00', '14:30', 'AV')], now).av)).toBe(100);
  });

  it('ignores PE minutes from hours the shift never recorded', () => {
    const hourly = { '07:00': { ok: 72, repair: 0, ng: 0 } };
    expect(toPercent(shiftOee(hourly, [stop('14:00', '14:30', 'PE')], now).pe)).toBe(100);
  });

  it('caps AV minutes at the length of the hour they fall in', () => {
    const hourly = { '07:00': { ok: 36, repair: 0, ng: 0 } };
    expect(shiftOee(hourly, [stop('06:00', '09:00', 'AV')], now).av).toBe(0);
  });

  it('caps PE minutes at the length of the hour they fall in', () => {
    const hourly = { '07:00': { ok: 36, repair: 0, ng: 0 } };
    expect(shiftOee(hourly, [stop('06:00', '09:00', 'PE')], now).pe).toBe(0);
  });

  it('takes quality from the shift totals', () => {
    const hourly = {
      '07:00': { ok: 60, repair: 8, ng: 4 },
      '08:00': { ok: 60, repair: 4, ng: 8 },
    };
    expect(toPercent(shiftOee(hourly, []).rq)).toBe(83);
  });

  it('prorates AV/PE loss for the currently running hour', () => {
    const hourly = { '12:00': { ok: 10, repair: 0, ng: 0 } };
    const running = new Date(2026, 8, 8, 12, 20); // 20 minutes into the hour
    // A 10-minute AV stop within those 20 elapsed minutes: (20-10)/20 = 50%.
    expect(toPercent(shiftOee(hourly, [stop('12:05', '12:15', 'AV')], running).av)).toBe(50);
  });

  it('is all zeros before the shift has recorded anything', () => {
    expect(shiftOee({}, [], now)).toEqual({ av: 0, pe: 0, rq: 0, oee: 0 });
  });

  it('treats every hour as fully worked for a finished shift (now: null), not prorated', () => {
    const hourly = { '12:00': { ok: 10, repair: 0, ng: 0 } };
    // Same 10-minute AV stop as the "prorates" test above, but the shift is
    // finished: the hour counts its full 60 minutes, not just 20 elapsed —
    // (60-10)/60 = 83%, not the 50% a still-running hour would show.
    expect(toPercent(shiftOee(hourly, [stop('12:05', '12:15', 'AV')], null).av)).toBe(83);
  });

  it('caps an AV stop at the worked window, not the full hour', () => {
    const hourly = { '07:00': { ok: 36, repair: 0, ng: 0 } };
    const windows = { '07:00': { start: '07:00', end: '07:30' } }; // 30 min worked
    // A 20-minute AV stop within a 30-minute worked window: (30-20)/30 = 33%.
    expect(toPercent(shiftOee(hourly, [stop('07:05', '07:25', 'AV')], now, windows).av)).toBe(33);
    // Absent any AV stop, narrowing the window doesn't move AV at all — it's
    // no longer a function of production vs. capacity, so there's nothing
    // for a smaller denominator to inflate.
    expect(toPercent(shiftOee(hourly, [], now, windows).av)).toBe(100);
  });
});

describe('toPercent', () => {
  it('rounds a 0-1 ratio to a whole percentage', () => {
    expect(toPercent(0.8333)).toBe(83);
    expect(toPercent(1)).toBe(100);
    expect(toPercent(0)).toBe(0);
  });
});
