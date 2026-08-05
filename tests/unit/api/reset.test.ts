import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockReset, mockCheckPassword, MockInvalidResetPasswordError } = vi.hoisted(() => {
  class MockInvalidResetPasswordError extends Error {}
  return {
    mockReset: vi.fn(),
    mockCheckPassword: vi.fn(),
    MockInvalidResetPasswordError,
  };
});

vi.mock('@/lib/reset', () => ({
  resetProductionState: (...args: any[]) => mockReset(...args),
  checkResetPassword: (...args: any[]) => mockCheckPassword(...args),
  InvalidResetPasswordError: MockInvalidResetPasswordError,
}));

import { POST } from '@/app/api/reset/route';

describe('POST /api/reset', () => {
  beforeEach(() => {
    mockReset.mockReset();
    mockCheckPassword.mockReset();
  });

  it('returns 401 when the password check throws', async () => {
    mockCheckPassword.mockImplementation(() => { throw new MockInvalidResetPasswordError('Invalid reset password'); });
    const request = new NextRequest('http://localhost/api/reset', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(401);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('resets and returns the fresh state on a correct password', async () => {
    mockCheckPassword.mockImplementation(() => {});
    mockReset.mockResolvedValueOnce({ ok1: 0 });
    const request = new NextRequest('http://localhost/api/reset', {
      method: 'POST',
      body: JSON.stringify({ password: '1234' }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, message: 'Data direset dan diarsipkan', data: { ok1: 0 } });
  });
});
