import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockReset = vi.fn();
vi.mock('@/lib/reset', () => ({ resetProductionState: (...args: any[]) => mockReset(...args) }));

import { GET } from '@/app/api/cron/shift-reset/route';

describe('GET /api/cron/shift-reset', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockReset.mockReset();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('rejects requests without the correct bearer token', async () => {
    const request = new NextRequest('http://localhost/api/cron/shift-reset');
    const res = await GET(request);
    expect(res.status).toBe(401);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('runs the reset when the bearer token matches CRON_SECRET', async () => {
    mockReset.mockResolvedValueOnce({ ok1: 0 });
    const request = new NextRequest('http://localhost/api/cron/shift-reset', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(request);
    expect(res.status).toBe(200);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
