import { describe, it, expect } from 'vitest';
import { lineStopMinutes, totalLineStopMinutes, formatDuration } from '@/utils/lineStop';

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
