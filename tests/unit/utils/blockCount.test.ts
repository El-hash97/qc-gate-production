import { describe, it, expect } from 'vitest';
import { withBlockCount, BLOCK_LIMIT, BLOCK_WARN_AT } from '@/utils/blockCount';
import { stationDetail } from '@/utils/stationDetails';

describe('withBlockCount', () => {
  const baritori = stationDetail('baritori')!;

  it('puts the produced count on a bar scaled to 32,400 with the warning at 32,000', () => {
    const d = withBlockCount(baritori, 12345);
    expect(d.meter).toEqual({ label: 'Blocks produced', value: 12345, max: BLOCK_LIMIT, warnAt: BLOCK_WARN_AT, unit: 'pcs' });
    expect([BLOCK_WARN_AT, BLOCK_LIMIT]).toEqual([32000, 32400]);
    expect(d.description).toEqual(baritori.description);
  });
});
