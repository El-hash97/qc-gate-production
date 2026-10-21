import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...a: unknown[]) => mockSql(...a) }));
const mockBlocks = vi.fn();
vi.mock('@/lib/history', () => ({ getBlocksProduced: () => mockBlocks() }));
const mockState = vi.fn();
vi.mock('@/lib/productionState', () => ({ getProductionState: () => mockState() }));

import { getBlockCounter, resetBlockCounter } from '@/lib/blockCounter';

describe('blockCounter', () => {
  beforeEach(() => { mockSql.mockReset(); mockBlocks.mockReset(); mockState.mockReset(); });

  it('reads the archived total and the stored baseline', async () => {
    mockBlocks.mockResolvedValue(31250);
    mockSql.mockResolvedValueOnce([{ value: 1000 }]);
    expect(await getBlockCounter()).toEqual({ archived: 31250, baseline: 1000 });
  });

  it('counts from the start when nothing was reset yet or the table is missing', async () => {
    mockBlocks.mockResolvedValue(500);
    mockSql.mockResolvedValueOnce([]);
    expect((await getBlockCounter()).baseline).toBe(0);
    mockSql.mockRejectedValueOnce(Object.assign(new Error('no table'), { code: '42P01' }));
    expect((await getBlockCounter()).baseline).toBe(0);
  });

  it('resets to everything produced so far: archived shifts plus the running one (BC only)', async () => {
    mockBlocks.mockResolvedValue(31000);
    mockState.mockResolvedValue({ ok1: 100, repair1: 10, ng1: 5, ok2: 200, repair2: 0, ng2: 5, ok3: 999, ok4: 999 });
    mockSql.mockResolvedValueOnce([]);
    expect(await resetBlockCounter()).toEqual({ archived: 31000, baseline: 31320 });
    expect(mockSql.mock.calls[0].slice(1)).toContain(31320);
  });
});
