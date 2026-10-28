import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

  it('passes JSON text to the server as is, and encodes only real objects', async () => {
    const { jsonType } = await import('@/lib/db');
    // callers write `${JSON.stringify(x)}::jsonb`: encoding that again would store a JSON string
    expect(jsonType.serialize('{"a":1}')).toBe('{"a":1}');
    expect(jsonType.serialize({ a: 1 })).toBe('{"a":1}');
    expect(jsonType.parse('{"a":1}')).toEqual({ a: 1 });
    expect(jsonType.from).toContain(3802); // jsonb, not only json
  });

  it('runs a query only when awaited, and a transaction replays its queries on the transaction connection', async () => {
    process.env.DATABASE_URL = 'postgres://u:p@localhost:6543/db';
    const direct = vi.fn(async () => [{ n: 1 }]);
    const inTx = vi.fn(async () => []);
    const begin = vi.fn(async (fn: (tx: unknown) => unknown[]) => Promise.all(fn(inTx)));
    vi.doMock('postgres', () => ({ default: () => Object.assign(direct, { begin }) }));
    const { sql } = await import('@/lib/db');

    const q = sql`SELECT ${7}`;
    expect(direct).not.toHaveBeenCalled(); // lazy, like the Neon driver was
    expect(await q).toEqual([{ n: 1 }]);
    expect(direct).toHaveBeenCalledTimes(1);

    await sql.transaction([sql`UPDATE a SET x = ${1}`, sql`DELETE FROM b WHERE id = ${2}`]);
    expect(begin).toHaveBeenCalledTimes(1);
    expect(inTx).toHaveBeenCalledTimes(2);
    expect(inTx.mock.calls[1].slice(1)).toEqual([2]);
    expect(direct).toHaveBeenCalledTimes(1); // the transaction did not use the plain connection
    vi.doUnmock('postgres');
  });
});
