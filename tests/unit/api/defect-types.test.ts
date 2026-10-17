import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockList = vi.fn();
const mockAdd = vi.fn();
vi.mock('@/lib/defectTypes', () => ({
  listDefectTypes: (...args: any[]) => mockList(...args),
  addDefectType: (...args: any[]) => mockAdd(...args),
  isDefectTypeKind: (value: string) => value === 'defect' || value === 'repair',
}));

import { GET, POST } from '@/app/api/defect-types/route';

function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/defect-types', { method: 'POST', body: JSON.stringify(body) }));
}

describe('/api/defect-types', () => {
  beforeEach(() => { mockList.mockReset(); mockAdd.mockReset(); });

  it('GET returns the added types', async () => {
    mockList.mockResolvedValueOnce([{ id: 1, product: 'bc', kind: 'defect', name: 'Retak' }]);
    expect(await (await GET()).json()).toEqual({ success: true, data: [{ id: 1, product: 'bc', kind: 'defect', name: 'Retak' }] });
  });

  it('POST adds a type', async () => {
    mockAdd.mockResolvedValueOnce(undefined);
    const res = await post({ product: 'camshaft', kind: 'repair', name: 'Gerinda' });
    expect(await res.json()).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledWith('camshaft', 'repair', 'Gerinda');
  });

  it('POST rejects an unknown product, kind or empty name', async () => {
    expect((await post({ product: 'all', kind: 'defect', name: 'X' })).status).toBe(400);
    expect((await post({ product: 'bc', kind: 'ng', name: 'X' })).status).toBe(400);
    expect((await post({ product: 'bc', kind: 'defect', name: ' ' })).status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('POST returns 400 with the message when the name is a duplicate', async () => {
    mockAdd.mockRejectedValueOnce(new Error('"Crack" sudah ada di daftar ini'));
    const res = await post({ product: 'bc', kind: 'defect', name: 'crack' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('sudah ada');
  });
});
