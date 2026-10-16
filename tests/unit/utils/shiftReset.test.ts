import { describe, it, expect } from 'vitest';
import { latestCutoff } from '@/utils/shiftReset';

// WIB = UTC+7: 07:10 WIB = 00:10 UTC, 19:50 WIB = 12:50 UTC.
const utc = (iso: string) => new Date(iso);

describe('latestCutoff', () => {
  it('is today 07:10 WIB during the day shift', () => {
    expect(latestCutoff(utc('2026-10-16T05:00:00Z')).toISOString()).toBe('2026-10-16T00:10:00.000Z');
  });

  it('switches to 19:50 WIB exactly at the changeover', () => {
    expect(latestCutoff(utc('2026-10-16T12:49:59Z')).toISOString()).toBe('2026-10-16T00:10:00.000Z');
    expect(latestCutoff(utc('2026-10-16T12:50:00Z')).toISOString()).toBe('2026-10-16T12:50:00.000Z');
  });

  it('stays on the previous evening 19:50 WIB through the night until 07:10', () => {
    // 02:00 WIB on the 17th = 19:00 UTC on the 16th
    expect(latestCutoff(utc('2026-10-16T19:00:00Z')).toISOString()).toBe('2026-10-16T12:50:00.000Z');
    // 07:09 WIB on the 17th
    expect(latestCutoff(utc('2026-10-17T00:09:00Z')).toISOString()).toBe('2026-10-16T12:50:00.000Z');
    // 07:10 WIB on the 17th
    expect(latestCutoff(utc('2026-10-17T00:10:00Z')).toISOString()).toBe('2026-10-17T00:10:00.000Z');
  });

  it('reaches back to yesterday 19:50 WIB just after midnight WIB', () => {
    // 00:30 WIB on the 17th = 17:30 UTC on the 16th
    expect(latestCutoff(utc('2026-10-16T17:30:00Z')).toISOString()).toBe('2026-10-16T12:50:00.000Z');
  });
});
