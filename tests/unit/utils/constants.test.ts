import { describe, it, expect } from 'vitest';
import {
  DEFECT_TYPES, REPAIR_TYPES, SHAFT_DEFECT_TYPES, SHAFT_REPAIR_TYPES, SHIFTS,
} from '@/utils/constants';

describe('production constants', () => {
  it('has the defect types including the foundry NG list', () => {
    expect(DEFECT_TYPES).toHaveLength(22);
    expect(DEFECT_TYPES).toContain('Gas Hole Cope');
    expect(DEFECT_TYPES).toContain('Kandama Rear');
    expect(DEFECT_TYPES).toContain('Yuzakai');
  });

  it('has the repair types including the foundry NG list', () => {
    expect(REPAIR_TYPES).toHaveLength(27);
    expect(REPAIR_TYPES).toContain('Mejashi Bore 1');
    expect(REPAIR_TYPES).toContain('Dakon');
    expect(REPAIR_TYPES).toContain('Yuzakai');
  });

  it('has the Camshaft/Crankshaft defect/repair/NG list', () => {
    expect(SHAFT_DEFECT_TYPES).toHaveLength(14);
    expect(SHAFT_DEFECT_TYPES).toContain('Ireboshi');
    expect(SHAFT_DEFECT_TYPES).toContain('Ihada Area Barcode');
    expect(SHAFT_REPAIR_TYPES).toEqual(SHAFT_DEFECT_TYPES);
  });

  it('has the two fixed shifts', () => {
    expect(SHIFTS).toEqual(['Shift Red', 'Shift White']);
  });
});
