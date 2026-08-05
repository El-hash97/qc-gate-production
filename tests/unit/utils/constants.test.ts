import { describe, it, expect } from 'vitest';
import { DEFECT_TYPES, REPAIR_TYPES, SHIFTS } from '@/utils/constants';

describe('production constants', () => {
  it('has exactly the 10 defect types from the original app', () => {
    expect(DEFECT_TYPES).toHaveLength(10);
    expect(DEFECT_TYPES).toContain('Gas Hole Cope');
    expect(DEFECT_TYPES).toContain('Kandama Rear');
  });

  it('has exactly the 11 repair types from the original app', () => {
    expect(REPAIR_TYPES).toHaveLength(11);
    expect(REPAIR_TYPES).toContain('Mejashi Bore 1');
    expect(REPAIR_TYPES).toContain('Dakon');
  });

  it('has the two fixed shifts', () => {
    expect(SHIFTS).toEqual(['Shift Red', 'Shift White']);
  });
});
