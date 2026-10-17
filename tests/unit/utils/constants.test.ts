import { describe, it, expect } from 'vitest';
import {
  DEFECT_TYPES, REPAIR_TYPES, SHAFT_DEFECT_TYPES, SHAFT_REPAIR_TYPES, SHIFTS,
} from '@/utils/constants';

describe('production constants', () => {
  it('has the defect types including the foundry NG list', () => {
    expect(DEFECT_TYPES).toContain('Gas Hole Cope');
    expect(DEFECT_TYPES).toContain('Kandama Rear');
    expect(DEFECT_TYPES).toContain('Gomi Oil Pan');
    expect(DEFECT_TYPES).toContain('Yuzakai');
    expect(DEFECT_TYPES).toContain('Over Dimensi');
  });

  it('has the repair types including the foundry NG list', () => {
    expect(REPAIR_TYPES).toContain('Over Dimensi');
    expect(REPAIR_TYPES).toContain('Mejashi Bore 1');
    expect(REPAIR_TYPES).toContain('Dakon');
    expect(REPAIR_TYPES).toContain('Gomi Oil Pan');
    expect(REPAIR_TYPES).toContain('Yuzakai');
  });

  it('has the Camshaft/Crankshaft defect/repair/NG list', () => {
    expect(SHAFT_DEFECT_TYPES).toHaveLength(16);
    expect(SHAFT_DEFECT_TYPES).toContain('Ireboshi');
    expect(SHAFT_DEFECT_TYPES).toContain('Ihada Area Barcode');
    expect(SHAFT_DEFECT_TYPES).toContain('Yuzakai Cope');
    expect(SHAFT_DEFECT_TYPES).toContain('Dross Cope');
    expect(SHAFT_REPAIR_TYPES).toEqual(SHAFT_DEFECT_TYPES);
  });

  it('has the two fixed shifts', () => {
    expect(SHIFTS).toEqual(['Shift Red', 'Shift White']);
  });
});

describe('typesFor', () => {
  it('appends types added for that product and kind only', async () => {
    const { typesFor, DEFECT_TYPES } = await import('@/utils/constants');
    const custom = [
      { id: 1, product: 'bc' as const, kind: 'defect' as const, name: 'Retak Halus' },
      { id: 2, product: 'bc' as const, kind: 'repair' as const, name: 'Gerinda Ulang' },
      { id: 3, product: 'camshaft' as const, kind: 'defect' as const, name: 'Bari Cam' },
    ];
    const list = typesFor('bc', 'defect', custom);
    expect(list.slice(0, DEFECT_TYPES.length)).toEqual([...DEFECT_TYPES]);
    expect(list.slice(DEFECT_TYPES.length)).toEqual(['Retak Halus']);
    expect(typesFor('crankshaft', 'defect', custom)).not.toContain('Bari Cam');
  });
});
