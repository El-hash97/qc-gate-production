import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockReset = vi.fn();
vi.mock('@/lib/blockCounter', () => ({ getBlockCounter: () => mockGet(), resetBlockCounter: () => mockReset() }));

import { GET, POST } from '@/app/api/blocks-produced/route';

describe('/api/blocks-produced', () => {
  beforeEach(() => { mockGet.mockReset(); mockReset.mockReset(); });

  it('GET returns the archived total and the baseline in a success envelope', async () => {
    mockGet.mockResolvedValueOnce({ archived: 31250, baseline: 1000 });
    expect(await (await GET()).json()).toEqual({ success: true, data: { archived: 31250, baseline: 1000 } });
  });

  it('POST resets the counter and returns the new baseline', async () => {
    mockReset.mockResolvedValueOnce({ archived: 31250, baseline: 31700 });
    expect(await (await POST()).json()).toEqual({ success: true, data: { archived: 31250, baseline: 31700 } });
  });

  it('reports a failure as a 500', async () => {
    mockGet.mockRejectedValueOnce(new Error('db down'));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'db down' });
  });
});
