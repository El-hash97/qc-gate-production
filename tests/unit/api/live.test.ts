import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/productionState', () => ({ getProductionState: async () => ({ ok1: 1 }) }));
vi.mock('@/lib/defectPhotos', () => ({ listDefectPhotoFlags: async () => [{ group: 'bc' }] }));
vi.mock('@/lib/displaySettings', () => ({ getDisplaySettings: async () => ({ modes: { kpi: 'hidden' } }) }));
vi.mock('@/lib/blockCounter', () => ({ getBlockCounter: async () => ({ archived: 5, baseline: 0 }) }));
vi.mock('@/lib/lineStopHistory', () => ({ getArchivedLineStops: async () => [] }));

import { GET } from '@/app/api/live/route';
import { shouldSkipLive } from '@/hooks/useLivePoll';

const get = (qs: string) => GET(new NextRequest(`http://x/api/live?${qs}`));

describe('GET /api/live', () => {
  it('bundles the dashboard data', async () => {
    expect((await (await get('page=dashboard')).json()).data).toEqual({ state: { ok1: 1 }, photoFlags: [{ group: 'bc' }] });
  });
  it('bundles the overview data', async () => {
    expect((await (await get('page=overview&since=2026-10-01')).json()).data).toEqual({
      state: { ok1: 1 }, modes: { kpi: 'hidden' }, blocks: { archived: 5, baseline: 0 }, lineStops: [],
    });
  });
  it('rejects an unknown page or bad since', async () => {
    expect((await get('page=x')).status).toBe(400);
    expect((await get('page=overview&since=bad')).status).toBe(400);
  });
});

describe('shouldSkipLive', () => {
  it('skips while saving or right after a local change, else writes', () => {
    expect(shouldSkipLive(1, 0, 100_000)).toBe(true);
    expect(shouldSkipLive(0, 97_000, 100_000)).toBe(true);
    expect(shouldSkipLive(0, 85_000, 100_000)).toBe(false);
  });
});
