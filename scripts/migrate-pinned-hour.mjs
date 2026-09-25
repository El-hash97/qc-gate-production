// One-off: add the pinned_hour column to production_state (history doesn't
// get it — see lib/schema.sql). Idempotent (IF NOT EXISTS) — safe to re-run.
// Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-pinned-hour.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS pinned_hour TEXT NOT NULL DEFAULT ''`;

const rows = await sql`SELECT id, pinned_hour FROM production_state`;
console.log(rows);
console.log(`done — ${rows.length} row(s)`);
