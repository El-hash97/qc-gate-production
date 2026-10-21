import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBlocksProduced = vi.fn();
vi.mock('@/lib/history', () => ({ getBlocksProduced: () => mockGetBlocksProduced() }));

import { GET } from '@/app/api/blocks-produced/route';

describe('GET /api/blocks-produced', () => {
  beforeEach(() => mockGetBlocksProduced.mockReset());

  it('returns the total in a success envelope', async () => {
    mockGetBlocksProduced.mockResolvedValueOnce(31250);
    expect(await (await GET()).json()).toEqual({ success: true, data: 31250 });
  });

  it('reports a failure as a 500', async () => {
    mockGetBlocksProduced.mockRejectedValueOnce(new Error('db down'));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'db down' });
  });
});
