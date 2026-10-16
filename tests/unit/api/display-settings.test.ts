import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockSave = vi.fn();
vi.mock('@/lib/displaySettings', () => ({
  getDisplaySettings: (...args: any[]) => mockGet(...args),
  saveDisplaySettings: (...args: any[]) => mockSave(...args),
  isDisplayKey: (value: string) => value === 'overview',
}));

import { GET, PUT } from '@/app/api/display-settings/[key]/route';

const req = (body?: unknown) =>
  new NextRequest('http://localhost/api/display-settings/overview', body === undefined ? {} : { method: 'PUT', body: JSON.stringify(body) });

describe('/api/display-settings/[key]', () => {
  beforeEach(() => { mockGet.mockReset(); mockSave.mockReset(); });

  it('returns the shared layout', async () => {
    mockGet.mockResolvedValueOnce({ modes: { pins: 'hidden' } });
    const json = await (await GET(req(), { params: { key: 'overview' } })).json();
    expect(json).toEqual({ success: true, data: { modes: { pins: 'hidden' } } });
  });

  it('saves a new layout', async () => {
    mockSave.mockResolvedValueOnce({ modes: { labels: 'hidden' } });
    const json = await (await PUT(req({ modes: { labels: 'hidden' } }), { params: { key: 'overview' } })).json();
    expect(mockSave).toHaveBeenCalledWith('overview', { modes: { labels: 'hidden' } });
    expect(json).toEqual({ success: true, data: { modes: { labels: 'hidden' } } });
  });

  it('rejects unknown pages and reports DB errors', async () => {
    expect((await GET(req(), { params: { key: 'nope' } })).status).toBe(404);
    mockGet.mockRejectedValueOnce(new Error('connection refused'));
    expect((await GET(req(), { params: { key: 'overview' } })).status).toBe(500);
  });
});
