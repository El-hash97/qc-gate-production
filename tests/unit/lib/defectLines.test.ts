import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { isDefectLineName, listDefectLines, addDefectLine, deleteDefectLine } from '@/lib/defectLines';

describe('isDefectLineName', () => {
  it('accepts only the four fixed line names', () => {
    expect(isDefectLineName('Melting')).toBe(true);
    expect(isDefectLineName('Moulding')).toBe(true);
    expect(isDefectLineName('Core Making')).toBe(true);
    expect(isDefectLineName('Finishing')).toBe(true);
    expect(isDefectLineName('Casting')).toBe(false);
  });
});

describe('listDefectLines', () => {
  beforeEach(() => mockSql.mockReset());

  it('maps rows to camelCase mappings', async () => {
    mockSql.mockResolvedValueOnce([
      { id: 1, line: 'Melting', defect_name: 'Kandama' },
      { id: 2, line: 'Moulding', defect_name: 'Gomi' },
    ]);
    const result = await listDefectLines();
    expect(result).toEqual([
      { id: 1, line: 'Melting', defectName: 'Kandama' },
      { id: 2, line: 'Moulding', defectName: 'Gomi' },
    ]);
  });

  it('returns an empty array when the table is empty', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await listDefectLines()).toEqual([]);
  });
});

describe('addDefectLine', () => {
  beforeEach(() => mockSql.mockReset());

  it('rejects an empty defect name without touching the database', async () => {
    await expect(addDefectLine('Melting', '   ')).rejects.toThrow('wajib diisi');
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('inserts a trimmed defect name under the given line', async () => {
    mockSql.mockResolvedValueOnce([]);
    await addDefectLine('Melting', '  Yuzakai  ');
    expect(mockSql).toHaveBeenCalledTimes(1);
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain('Melting');
    expect(values).toContain('Yuzakai');
  });

  it('propagates a duplicate-key error from the database', async () => {
    mockSql.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));
    await expect(addDefectLine('Melting', 'Kandama')).rejects.toThrow('duplicate key');
  });
});

describe('deleteDefectLine', () => {
  beforeEach(() => mockSql.mockReset());

  it('deletes by id', async () => {
    mockSql.mockResolvedValueOnce([]);
    await deleteDefectLine(7);
    expect(mockSql).toHaveBeenCalledTimes(1);
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain(7);
  });
});
