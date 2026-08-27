import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSql } = vi.hoisted(() => {
  const fn = vi.fn() as any;
  fn.transaction = vi.fn();
  return { mockSql: fn };
});
vi.mock('@/lib/db', () => ({ sql: mockSql }));

const mockGetProductionState = vi.fn();
vi.mock('@/lib/productionState', () => ({
  getProductionState: (...args: any[]) => mockGetProductionState(...args),
}));

import {
  checkResetPassword, resetProductionState,
  InvalidResetPasswordError, ResetPasswordNotConfiguredError,
} from '@/lib/reset';

describe('checkResetPassword', () => {
  const originalPassword = process.env.RESET_PASSWORD;
  beforeEach(() => { process.env.RESET_PASSWORD = '1234'; });
  afterEach(() => { process.env.RESET_PASSWORD = originalPassword; });

  it('does not throw for the correct password', () => {
    expect(() => checkResetPassword('1234')).not.toThrow();
  });

  it('throws InvalidResetPasswordError for the wrong password', () => {
    expect(() => checkResetPassword('0000')).toThrow(InvalidResetPasswordError);
  });

  it('ignores surrounding whitespace on both sides', () => {
    process.env.RESET_PASSWORD = '1234\n';
    expect(() => checkResetPassword('  1234 ')).not.toThrow();
  });

  it('throws ResetPasswordNotConfiguredError when the env var is unset or blank', () => {
    delete process.env.RESET_PASSWORD;
    expect(() => checkResetPassword('1234')).toThrow(ResetPasswordNotConfiguredError);
    process.env.RESET_PASSWORD = '   ';
    expect(() => checkResetPassword('1234')).toThrow(ResetPasswordNotConfiguredError);
  });
});

describe('resetProductionState', () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockSql.transaction.mockReset();
    mockGetProductionState.mockReset();
  });

  it('archives to history in a transaction when there is production data', async () => {
    mockGetProductionState
      .mockResolvedValueOnce({
        date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
        ok1: 10, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:00.000Z',
      })
      .mockResolvedValueOnce({
        date: '', shift: 'Shift Red', operator: '', target: 0,
        ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T19:00:00.000Z',
      });
    mockSql.transaction.mockResolvedValueOnce([]);

    const result = await resetProductionState();

    expect(mockSql.transaction).toHaveBeenCalledTimes(1);
    expect(result.ok1).toBe(0);
  });

  it('skips the archive when there is no production data yet', async () => {
    mockGetProductionState
      .mockResolvedValueOnce({
        date: '', shift: 'Shift Red', operator: '', target: 0,
        ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:00.000Z',
      })
      .mockResolvedValueOnce({
        date: '', shift: 'Shift Red', operator: '', target: 0,
        ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:01.000Z',
      });
    mockSql.mockResolvedValueOnce([]);

    await resetProductionState();

    expect(mockSql.transaction).not.toHaveBeenCalled();
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
