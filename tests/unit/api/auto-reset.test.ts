import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAutoReset = vi.fn();
vi.mock('@/lib/autoReset', () => ({ autoResetIfDue: (...args: any[]) => mockAutoReset(...args) }));

import { POST } from '@/app/api/auto-reset/route';

describe('POST /api/auto-reset', () => {
  beforeEach(() => mockAutoReset.mockReset());

  it('returns the fresh state when a reset was due', async () => {
    mockAutoReset.mockResolvedValueOnce({ reset: true, state: { ok1: 0 } });
    const json = await (await POST()).json();
    expect(json).toEqual({ success: true, reset: true, state: { ok1: 0 } });
  });

  it('reports reset: false when this changeover was already handled', async () => {
    mockAutoReset.mockResolvedValueOnce({ reset: false });
    const json = await (await POST()).json();
    expect(json).toEqual({ success: true, reset: false });
  });

  it('returns a 500 error envelope when the reset throws', async () => {
    mockAutoReset.mockRejectedValueOnce(new Error('db down'));
    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBe(false);
  });
});
