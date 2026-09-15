import { describe, it, expect } from 'vitest';
import { angleFromPoint, minuteFromAngle, angleForMinute, angleForHour } from '@/utils/clockAngle';

describe('angleFromPoint', () => {
  it('returns 0 for a point directly above the center (12 o\'clock)', () => {
    expect(angleFromPoint(100, 100, 100, 0)).toBe(0);
  });

  it('returns 90 for a point directly right of the center (3 o\'clock)', () => {
    expect(angleFromPoint(100, 100, 200, 100)).toBe(90);
  });

  it('returns 180 for a point directly below the center (6 o\'clock)', () => {
    expect(angleFromPoint(100, 100, 100, 200)).toBe(180);
  });

  it('returns 270 for a point directly left of the center (9 o\'clock)', () => {
    expect(angleFromPoint(100, 100, 0, 100)).toBe(270);
  });
});

describe('minuteFromAngle', () => {
  it('maps 0 degrees to minute 0', () => {
    expect(minuteFromAngle(0)).toBe(0);
  });

  it('maps 90 degrees to minute 15', () => {
    expect(minuteFromAngle(90)).toBe(15);
  });

  it('maps 270 degrees to minute 45', () => {
    expect(minuteFromAngle(270)).toBe(45);
  });

  it('rounds to the nearest whole minute', () => {
    // 91 degrees is 15.17 minutes, rounds to 15.
    expect(minuteFromAngle(91)).toBe(15);
  });
});

describe('angleForMinute / angleForHour (inverse of the point mapping)', () => {
  it('places minute 15 at 90 degrees', () => {
    expect(angleForMinute(15)).toBe(90);
  });

  it('places hour 3 at 90 degrees', () => {
    expect(angleForHour(3)).toBe(90);
  });

  it('places hour 12 and hour 0 both at 0 degrees (top)', () => {
    expect(angleForHour(12)).toBe(0);
    expect(angleForHour(0)).toBe(0);
  });
});
