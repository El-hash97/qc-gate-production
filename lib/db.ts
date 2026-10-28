import postgres from 'postgres';

// Plain Postgres over a connection pooler (Supabase's transaction pooler, port
// 6543), so any Postgres host works: only DATABASE_URL changes.
//
// Lazily constructed: `next build` imports every Route Handler module during
// its "Collecting page data" step, before any request happens. Throwing here
// at module-import time (rather than on first actual query) would break
// `npm run build` in any environment where DATABASE_URL isn't set yet — so
// the check is deferred to the first real call.
let client: postgres.Sql | null = null;

// Every query here writes JSON as `${JSON.stringify(x)}::jsonb`, text the
// server casts. The driver's own json serializer would encode that text a
// second time (a JSON string, not an object), so text passes through as is.
export const jsonType = {
  to: 114,
  from: [114, 3802],
  serialize: (x: unknown): string => (typeof x === 'string' ? x : JSON.stringify(x)),
  parse: (x: string): unknown => JSON.parse(x),
};

function getClient(): postgres.Sql {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Copy .env.example to .env.local and fill in your Postgres connection string.',
      );
    }
    client = postgres(process.env.DATABASE_URL, {
      // the pooler hands each statement to any backend: no prepared statements
      prepare: false,
      // Not 1: Supabase's pooler stalls when 5 statements are pipelined on one
      // connection, and /api/live?page=overview runs exactly 5 in parallel. The
      // pooler shares its few real backends among these client connections.
      max: 10,
      ssl: 'require',
      idle_timeout: 20,
      connect_timeout: 15,
      types: { json: jsonType },
    });
  }
  return client;
}

type Row = Record<string, any>;

// A query that has not run yet: it runs when awaited, or inside
// `sql.transaction([...])`, which needs the text + values to replay them on the
// transaction's own connection.
class Query implements PromiseLike<Row[]> {
  constructor(readonly strings: TemplateStringsArray, readonly values: unknown[]) {}

  then<A = Row[], B = never>(
    onFulfilled?: ((rows: Row[]) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return Promise.resolve(getClient()(this.strings, ...(this.values as never[])) as unknown as Row[]).then(onFulfilled, onRejected);
  }
}

function sqlTag(strings: TemplateStringsArray, ...values: unknown[]): Query {
  getClient(); // fail fast on a missing DATABASE_URL, not only once awaited
  return new Query(strings, values);
}

// All statements commit together or not at all.
sqlTag.transaction = (queries: Query[]): Promise<Row[][]> =>
  getClient().begin((tx) => queries.map((q) => tx(q.strings, ...(q.values as never[])))) as unknown as Promise<Row[][]>;

export const sql = sqlTag;
