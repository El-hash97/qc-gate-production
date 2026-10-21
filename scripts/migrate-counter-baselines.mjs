// One-off: create the counter_baselines table (the block count at which the
// Baritori block counter was last reset — see lib/blockCounter.ts).
// Idempotent (IF NOT EXISTS) — safe to re-run.
// Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-counter-baselines.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS counter_baselines (
    key       TEXT PRIMARY KEY,
    value     INTEGER NOT NULL DEFAULT 0,
    saved_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const rows = await sql`SELECT key, value, saved_at FROM counter_baselines`;
console.log(rows);
console.log(`done — ${rows.length} row(s)`);
