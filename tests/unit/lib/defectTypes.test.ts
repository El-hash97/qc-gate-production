import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { addDefectType, listDefectTypes } from '@/lib/defectTypes';

describe('defectTypes', () => {
  beforeEach(() => mockSql.mockReset());

  it('lists stored rows and drops any with an unknown product or kind', async () => {
    mockSql.mockResolvedValueOnce([
      { id: 1, product: 'camshaft', kind: 'defect', name: 'Retak' },
      { id: 2, product: 'all', kind: 'defect', name: 'X' },
    ]);
    expect(await listDefectTypes()).toEqual([{ id: 1, product: 'camshaft', kind: 'defect', name: 'Retak' }]);
  });

  it('inserts a new, tidied name', async () => {
    mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await addDefectType('bc', 'repair', '  Gerinda   Ulang ');
    expect(mockSql).toHaveBeenCalledTimes(2);
    expect(mockSql.mock.calls[1]).toContain('Gerinda Ulang');
  });

  it('rejects a name already in the built-in list, ignoring case', async () => {
    mockSql.mockResolvedValueOnce([]);
    await expect(addDefectType('bc', 'defect', 'gas hole cope')).rejects.toThrow('sudah ada');
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('rejects a name already added to the same list', async () => {
    mockSql.mockResolvedValueOnce([{ id: 3, product: 'bc', kind: 'defect', name: 'Retak Halus' }]);
    await expect(addDefectType('bc', 'defect', 'RETAK HALUS')).rejects.toThrow('sudah ada');
  });

  it('allows the same name in a different product or kind', async () => {
    mockSql.mockResolvedValueOnce([{ id: 3, product: 'bc', kind: 'defect', name: 'Retak Halus' }]).mockResolvedValueOnce([]);
    await addDefectType('bc', 'repair', 'Retak Halus');
    expect(mockSql).toHaveBeenCalledTimes(2);
  });
});
