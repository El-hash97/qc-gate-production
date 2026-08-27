import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockReset, mockCheckPassword,
  MockInvalidResetPasswordError, MockResetPasswordNotConfiguredError,
} = vi.hoisted(() => {
  class MockInvalidResetPasswordError extends Error {}
  class MockResetPasswordNotConfiguredError extends Error {}
  return {
    mockReset: vi.fn(),
    mockCheckPassword: vi.fn(),
    MockInvalidResetPasswordError,
    MockResetPasswordNotConfiguredError,
  };
});

vi.mock('@/lib/reset', () => ({
  resetProductionState: (...args: any[]) => mockReset(...args),
  checkResetPassword: (...args: any[]) => mockCheckPassword(...args),
  InvalidResetPasswordError: MockInvalidResetPasswordError,
  ResetPasswordNotConfiguredError: MockResetPasswordNotConfiguredError,
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

  it('returns 401 with a friendly message for a wrong password', async () => {
    mockCheckPassword.mockImplementation(() => { throw new MockInvalidResetPasswordError('Invalid reset password'); });
    const request = new NextRequest('http://localhost/api/reset', {
      method: 'POST', body: JSON.stringify({ password: 'wrong' }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe('Password salah!');
  });

  it('returns 503 when RESET_PASSWORD is not configured', async () => {
    mockCheckPassword.mockImplementation(() => { throw new MockResetPasswordNotConfiguredError(); });
    const request = new NextRequest('http://localhost/api/reset', {
      method: 'POST', body: JSON.stringify({ password: '1234' }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.error).toContain('RESET_PASSWORD');
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
