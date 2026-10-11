import { describe, it, expect } from 'vitest';
import { activeRange } from '@/utils/animRange';

const track = (times: number[], values: number[], size = 1) => ({ times, values, size });

describe('activeRange', () => {
  it('spans from the first to the last keyframe where anything moves', () => {
    // holds 0..2 s, moves 2..4 s, holds after
    const t = track([0, 1, 2, 3, 4, 5, 6], [0, 0, 0, 5, 9, 9, 9]);
    expect(activeRange([t])).toEqual([2, 4]);
  });

  it('takes the union over tracks and vector components', () => {
    const a = track([0, 1, 2, 3], [0, 0, 0, 0, 1, 0, 1, 0], 2); // y moves 1..2
    const b = track([0, 1, 2, 3], [0, 0, 0, 7]); // moves 2..3
    expect(activeRange([a, b])).toEqual([1, 3]);
  });

  it('returns null when nothing moves', () => {
    expect(activeRange([track([0, 1, 2], [3, 3, 3])])).toBeNull();
  });
});
