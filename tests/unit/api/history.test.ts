import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetHistory = vi.fn();
vi.mock('@/lib/history', () => ({ getHistory: (...args: any[]) => mockGetHistory(...args) }));

import { GET } from '@/app/api/history/route';

describe('GET /api/history', () => {
  beforeEach(() => mockGetHistory.mockReset());

  it('forwards limit/date/shift query params as filters', async () => {
    mockGetHistory.mockResolvedValueOnce([]);
    const request = new NextRequest('http://localhost/api/history?limit=10&date=2026-08-05&shift=Shift+Red');
    await GET(request);
    expect(mockGetHistory).toHaveBeenCalledWith({ limit: 10, date: '2026-08-05', shift: 'Shift Red' });
  });

  it('returns the list wrapped in a success envelope', async () => {
    mockGetHistory.mockResolvedValueOnce([{ id: 1 }]);
    const request = new NextRequest('http://localhost/api/history');
    const res = await GET(request);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: [{ id: 1 }] });
  });
});
