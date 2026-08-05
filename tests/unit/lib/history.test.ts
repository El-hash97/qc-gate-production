import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { getHistory } from '@/lib/history';

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
      id: 7, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
      defectData: {}, repairData: {}, hourlyData: {},
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
