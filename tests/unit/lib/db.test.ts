import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('lib/db', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
  });

  it('does not throw on import even when DATABASE_URL is not set (Next.js build-time safety)', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('@/lib/db')).resolves.toBeDefined();
  });

  it('throws a clear error when a query is attempted without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    const { sql } = await import('@/lib/db');
    expect(() => sql`SELECT 1`).toThrow('DATABASE_URL environment variable is not set');
  });
});
