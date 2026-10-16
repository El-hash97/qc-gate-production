import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));
const mockReset = vi.fn();
vi.mock('@/lib/reset', () => ({ resetProductionState: (...args: any[]) => mockReset(...args) }));

import { autoResetIfDue } from '@/lib/autoReset';

const NOW = new Date('2026-10-16T12:55:00Z'); // 19:55 WIB

describe('autoResetIfDue', () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockReset.mockReset();
  });

  it('claims the changeover against the latest cutoff and resets', async () => {
    mockSql.mockResolvedValueOnce([{ id: 1 }]);
    mockReset.mockResolvedValueOnce({ ok1: 0 });
    const result = await autoResetIfDue(NOW);
    expect(result).toEqual({ reset: true, state: { ok1: 0 } });
    // The claim compares last_reset_at against 19:50 WIB (12:50 UTC).
    expect(mockSql.mock.calls[0]).toContain('2026-10-16T12:50:00.000Z');
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('does nothing when this changeover was already reset', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await autoResetIfDue(NOW)).toEqual({ reset: false });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('releases the claim when the reset fails so the next caller retries', async () => {
    mockSql.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
    mockReset.mockRejectedValueOnce(new Error('db down'));
    await expect(autoResetIfDue(NOW)).rejects.toThrow('db down');
    expect(mockSql).toHaveBeenCalledTimes(2);
    expect(mockSql.mock.calls[1]).toContain('2026-10-16T12:49:59.000Z');
  });
});
