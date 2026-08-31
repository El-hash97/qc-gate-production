import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { getProductionState, saveProductionState } from '@/lib/productionState';

describe('getProductionState', () => {
  beforeEach(() => mockSql.mockReset());

  it('returns null when no row exists', async () => {
    mockSql.mockResolvedValueOnce([]);
    const result = await getProductionState();
    expect(result).toBeNull();
  });

  it('maps a DB row to camelCase ProductionState', async () => {
    mockSql.mockResolvedValueOnce([{
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
      defect_data: { 'Gas Hole Cope': 1 }, repair_data: {}, hourly_data: {},
      saved_at: '2026-08-05T07:00:00.000Z',
    }]);
    const result = await getProductionState();
    expect(result).toEqual({
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', pic: '', target: 100,
      ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
      ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {},
      defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
      hourlyDataCam: {}, hourlyDataCrank: {},
      entryLogs: [],
      lineStops: [],
      savedAt: '2026-08-05T07:00:00.000Z',
    });
  });
});

describe('saveProductionState', () => {
  beforeEach(() => mockSql.mockReset());

  it('calls sql with defaults for missing fields', async () => {
    mockSql.mockResolvedValueOnce([]);
    await saveProductionState({ operator: 'Siti' });
    expect(mockSql).toHaveBeenCalledTimes(1);
    const [strings, ...values] = mockSql.mock.calls[0];
    expect(strings.join('?')).toContain('UPDATE production_state');
    expect(values).toContain('Siti');
  });

  it('rejects a negative counter value instead of writing it', async () => {
    await expect(saveProductionState({ ok1: -1 })).rejects.toThrow(
      'Counter values cannot be negative',
    );
    expect(mockSql).not.toHaveBeenCalled();
  });
});
