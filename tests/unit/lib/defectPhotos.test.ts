import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import {
  isPhotoGroup, isPhotoChartType,
  listDefectPhotoFlags, getDefectPhoto, saveDefectPhoto, deleteDefectPhoto, deleteAllDefectPhotos,
} from '@/lib/defectPhotos';

describe('isPhotoGroup / isPhotoChartType', () => {
  it('accepts only the known enum values', () => {
    expect(isPhotoGroup('bc')).toBe(true);
    expect(isPhotoGroup('camshaft')).toBe(true);
    expect(isPhotoGroup('all')).toBe(false);
    expect(isPhotoChartType('ng')).toBe(true);
    expect(isPhotoChartType('repair')).toBe(true);
    expect(isPhotoChartType('bogus')).toBe(false);
  });
});

describe('listDefectPhotoFlags', () => {
  beforeEach(() => mockSql.mockReset());

  it('maps rows to camelCase flags without image data', async () => {
    mockSql.mockResolvedValueOnce([
      { group_key: 'bc', chart_type: 'ng', updated_at: '2026-09-05T04:00:00.000Z' },
    ]);
    const result = await listDefectPhotoFlags();
    expect(result).toEqual([{ group: 'bc', chartType: 'ng', updatedAt: '2026-09-05T04:00:00.000Z' }]);
  });
});

describe('getDefectPhoto', () => {
  beforeEach(() => mockSql.mockReset());

  it('returns null when the slot is empty', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getDefectPhoto('bc', 'ng')).toBeNull();
  });

  it('returns the image data when the slot is filled', async () => {
    mockSql.mockResolvedValueOnce([{
      group_key: 'bc', chart_type: 'ng', image_data: 'data:image/jpeg;base64,abc', updated_at: '2026-09-05T04:00:00.000Z',
    }]);
    expect(await getDefectPhoto('bc', 'ng')).toEqual({
      group: 'bc', chartType: 'ng', imageData: 'data:image/jpeg;base64,abc', updatedAt: '2026-09-05T04:00:00.000Z',
    });
  });
});

describe('saveDefectPhoto', () => {
  beforeEach(() => mockSql.mockReset());

  it('rejects a value that is not an image data URL', async () => {
    await expect(saveDefectPhoto('bc', 'ng', 'not-a-data-url')).rejects.toThrow('data URL');
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects an oversized payload', async () => {
    const huge = 'data:image/jpeg;base64,' + 'a'.repeat(7_000_000);
    await expect(saveDefectPhoto('bc', 'ng', huge)).rejects.toThrow('terlalu besar');
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('upserts a valid image', async () => {
    mockSql.mockResolvedValueOnce([]);
    await saveDefectPhoto('bc', 'ng', 'data:image/jpeg;base64,abc');
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});

describe('deleteDefectPhoto / deleteAllDefectPhotos', () => {
  beforeEach(() => mockSql.mockReset());

  it('deletes one slot', async () => {
    mockSql.mockResolvedValueOnce([]);
    await deleteDefectPhoto('bc', 'ng');
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('deletes every slot', async () => {
    mockSql.mockResolvedValueOnce([]);
    await deleteAllDefectPhotos();
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
