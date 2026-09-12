import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockList = vi.fn();
const mockAdd = vi.fn();
vi.mock('@/lib/defectLines', () => ({
  listDefectLines: (...args: any[]) => mockList(...args),
  addDefectLine: (...args: any[]) => mockAdd(...args),
  isDefectLineName: (value: string) => ['Melting', 'Moulding', 'Core Making', 'Finishing'].includes(value),
}));

import { GET, POST } from '@/app/api/defect-lines/route';

describe('GET /api/defect-lines', () => {
  beforeEach(() => { mockList.mockReset(); mockAdd.mockReset(); });

  it('returns the list wrapped in a success envelope', async () => {
    mockList.mockResolvedValueOnce([{ id: 1, line: 'Melting', defectName: 'Kandama' }]);
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ success: true, data: [{ id: 1, line: 'Melting', defectName: 'Kandama' }] });
  });

  it('returns a 500 error envelope when the DB call throws', async () => {
    mockList.mockRejectedValueOnce(new Error('connection refused'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'connection refused' });
  });
});

describe('POST /api/defect-lines', () => {
  beforeEach(() => { mockList.mockReset(); mockAdd.mockReset(); });

  it('adds a defect line and returns success', async () => {
    mockAdd.mockResolvedValueOnce(undefined);
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Melting', defectName: 'Yuzakai' }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(json).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledWith('Melting', 'Yuzakai');
  });

  it('rejects a line that is not one of the four fixed names', async () => {
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Casting', defectName: 'Yuzakai' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('rejects a missing defectName', async () => {
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Melting', defectName: '' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('returns a 400 error envelope when addDefectLine throws (e.g. duplicate)', async () => {
    mockAdd.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Melting', defectName: 'Kandama' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
