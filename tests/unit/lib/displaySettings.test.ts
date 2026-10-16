import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { cleanSettings, getDisplaySettings, isDisplayKey, saveDisplaySettings } from '@/lib/displaySettings';

describe('display settings', () => {
  beforeEach(() => mockSql.mockReset());

  it('knows only the Overview layout', () => {
    expect(isDisplayKey('overview')).toBe(true);
    expect(isDisplayKey('dashboard')).toBe(false);
  });

  it('keeps only valid panel modes', () => {
    expect(cleanSettings({ modes: { paretoNg: 'hidden', pins: 'open', x: 'gone', y: 3 } })).toEqual({
      modes: { paretoNg: 'hidden', pins: 'open' },
    });
    expect(cleanSettings(null)).toEqual({ modes: {} });
  });

  it('reads the saved layout, or the default one before the table exists', async () => {
    mockSql.mockResolvedValueOnce([{ value: { modes: { labels: 'hidden' } } }]);
    expect(await getDisplaySettings('overview')).toEqual({ modes: { labels: 'hidden' } });
    mockSql.mockRejectedValueOnce(Object.assign(new Error('relation does not exist'), { code: '42P01' }));
    expect(await getDisplaySettings('overview')).toEqual({ modes: {} });
  });

  it('upserts the cleaned layout', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await saveDisplaySettings('overview', { modes: { pins: 'hidden', bad: 'x' } })).toEqual({ modes: { pins: 'hidden' } });
    const [, key, json] = mockSql.mock.calls[0];
    expect(key).toBe('overview');
    expect(JSON.parse(json)).toEqual({ modes: { pins: 'hidden' } });
  });
});
