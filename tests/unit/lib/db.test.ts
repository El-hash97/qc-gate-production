import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('lib/db', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
  });

  it('throws a clear error when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('@/lib/db')).rejects.toThrow(
      'DATABASE_URL environment variable is not set',
    );
  });
});
