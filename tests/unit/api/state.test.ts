import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetState = vi.fn();
const mockSaveState = vi.fn();
vi.mock('@/lib/productionState', () => ({
  getProductionState: (...args: any[]) => mockGetState(...args),
  saveProductionState: (...args: any[]) => mockSaveState(...args),
}));

import { GET, POST } from '@/app/api/state/route';

describe('GET /api/state', () => {
  beforeEach(() => { mockGetState.mockReset(); mockSaveState.mockReset(); });

  it('returns the current state wrapped in a success envelope', async () => {
    mockGetState.mockResolvedValueOnce({ operator: 'Budi' });
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { operator: 'Budi' } });
  });

  it('returns a 500 error envelope when the DB call throws', async () => {
    mockGetState.mockRejectedValueOnce(new Error('connection refused'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'connection refused' });
  });
});

describe('POST /api/state', () => {
  beforeEach(() => { mockGetState.mockReset(); mockSaveState.mockReset(); });

  it('saves the posted state and returns success', async () => {
    mockSaveState.mockResolvedValueOnce(undefined);
    const request = new NextRequest('http://localhost/api/state', {
      method: 'POST',
      body: JSON.stringify({ operator: 'Siti', ok1: 5 }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSaveState).toHaveBeenCalledWith({ operator: 'Siti', ok1: 5 });
  });
});
