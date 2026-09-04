import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { getHistory, restoreHistoryToCurrent, HistoryRecordNotFoundError } from '@/lib/history';

describe('getHistory', () => {
  beforeEach(() => mockSql.mockReset());

  it('maps rows to camelCase HistoryRecord and defaults to limit 30', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 7, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
      defect_data: {}, repair_data: {}, hourly_data: {},
      saved_at: '2026-08-04T19:00:00.000Z',
    }]);

    const result = await getHistory();

    expect(result).toEqual([{
      id: 7, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', pic: '', target: 100,
      targetBc: 0, targetCam: 0, targetCrank: 0,
      ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
      ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
      defectData: {}, repairData: {}, hourlyData: {},
      defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
      hourlyDataCam: {}, hourlyDataCrank: {},
      entryLogs: [],
      lineStops: [],
      savedAt: '2026-08-04T19:00:00.000Z',
    }]);
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain(30);
  });

  it('returns an empty array when there is no history yet', async () => {
    mockSql.mockResolvedValueOnce([]);
    const result = await getHistory({ shift: 'Shift White' });
    expect(result).toEqual([]);
  });
});

describe('restoreHistoryToCurrent', () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockSql.transaction.mockReset();
    mockGetProductionState.mockReset();
  });

  it('copies the row into production_state, deletes it from history, and returns the fresh state', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 12, date: '2026-08-03', shift: 'Shift White', operator: 'Sari', target: 90,
      ok1: 30, repair1: 1, ng1: 2, ok2: 20, repair2: 0, ng2: 0,
      defect_data: { Crack: 2 }, repair_data: {}, hourly_data: {},
      entry_logs: [], saved_at: '2026-08-03T19:00:00.000Z',
    }]);
    mockSql.transaction.mockResolvedValueOnce([]);
    const fresh = { date: '2026-08-03', shift: 'Shift White', operator: 'Sari', ok1: 30 };
    mockGetProductionState.mockResolvedValueOnce(fresh);

    const result = await restoreHistoryToCurrent(12);

    expect(mockSql.transaction).toHaveBeenCalledTimes(1);
    expect(mockSql.transaction.mock.calls[0][0]).toHaveLength(2); // UPDATE + DELETE
    expect(result).toBe(fresh);
  });

  it('throws HistoryRecordNotFoundError when the id is not in history', async () => {
    mockSql.mockResolvedValueOnce([]);
    await expect(restoreHistoryToCurrent(999)).rejects.toBeInstanceOf(HistoryRecordNotFoundError);
    expect(mockSql.transaction).not.toHaveBeenCalled();
  });
});
