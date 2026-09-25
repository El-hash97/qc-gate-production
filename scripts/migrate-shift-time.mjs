// One-off: add shift_time to production_state and history. Idempotent.
// Run once against the live Neon DB: node --env-file=.env.local scripts/migrate-shift-time.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS shift_time TEXT NOT NULL DEFAULT ''`;
await sql`ALTER TABLE history ADD COLUMN IF NOT EXISTS shift_time TEXT NOT NULL DEFAULT ''`;

const rows = await sql`SELECT id, shift, shift_time FROM production_state`;
console.log(rows);
console.log(`done — ${rows.length} row(s)`);
