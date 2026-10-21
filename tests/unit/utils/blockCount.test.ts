import { describe, it, expect } from 'vitest';
import { withBlockCount, BLOCK_LIMIT, BLOCK_WARN_AT } from '@/utils/blockCount';
import { stationDetail } from '@/utils/stationDetails';

const baritori = stationDetail('baritori')!;

describe('withBlockCount', () => {
  it('adds the produced count to the description without a warning below the threshold', () => {
    const d = withBlockCount(baritori, 12345);
    expect(d.description.at(-1)).toBe('Blocks produced so far: 12,345 pcs (limit 32,400).');
    expect(d.description.slice(0, -1)).toEqual(baritori.description);
    expect(d.notice).toBeUndefined();
    expect(withBlockCount(baritori, BLOCK_WARN_AT - 1).notice).toBeUndefined();
  });

  it('warns from 32,000 with how many blocks are left', () => {
    const d = withBlockCount(baritori, BLOCK_WARN_AT);
    expect(d.notice).toEqual({ level: 'warn', text: expect.stringContaining('400 to go') });
    expect(withBlockCount(baritori, BLOCK_LIMIT - 1).notice?.level).toBe('warn');
  });

  it('turns to a danger notice at 32,400 and beyond', () => {
    expect(withBlockCount(baritori, BLOCK_LIMIT).notice?.level).toBe('danger');
    expect(withBlockCount(baritori, BLOCK_LIMIT + 500).notice?.level).toBe('danger');
  });
});
