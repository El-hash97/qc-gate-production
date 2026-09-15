import { describe, it, expect } from 'vitest';
import { sortHourKeys } from '@/utils/hourOrder';

describe('sortHourKeys', () => {
  it('sorts a day shift in plain ascending order', () => {
    const keys = ['12:00', '07:00', '09:00', '08:00'];
    expect(sortHourKeys(keys)).toEqual(['07:00', '08:00', '09:00', '12:00']);
  });

  it('starts a night shift at its production hour and continues through midnight, not wrapping to 00 first', () => {
    // production ran 20:00 -> 02:00; object key order is whatever it happened to be inserted in.
    const keys = ['23:00', '01:00', '20:00', '00:00', '22:00', '21:00'];
    expect(sortHourKeys(keys)).toEqual(['20:00', '21:00', '22:00', '23:00', '00:00', '01:00']);
  });

  it('handles a night shift only partway through (hours after midnight not reached yet)', () => {
    const keys = ['21:00', '20:00', '22:00'];
    expect(sortHourKeys(keys)).toEqual(['20:00', '21:00', '22:00']);
  });

  it('returns an empty array unchanged', () => {
    expect(sortHourKeys([])).toEqual([]);
  });

  it('returns a single hour unchanged', () => {
    expect(sortHourKeys(['23:00'])).toEqual(['23:00']);
  });

  it('is stable when the shift crosses midnight but only just barely (23 and 00)', () => {
    expect(sortHourKeys(['00:00', '23:00'])).toEqual(['23:00', '00:00']);
  });
});
