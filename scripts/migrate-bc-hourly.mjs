// One-off: add per-line BC hourly columns. Idempotent.
// Run once against the live Neon DB: node --env-file=.env.local scripts/migrate-bc-hourly.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS hourly_data_bc1 JSONB NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS hourly_data_bc2 JSONB NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE history ADD COLUMN IF NOT EXISTS hourly_data_bc1 JSONB NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE history ADD COLUMN IF NOT EXISTS hourly_data_bc2 JSONB NOT NULL DEFAULT '{}'`;

const rows = await sql`SELECT id, hourly_data_bc1, hourly_data_bc2 FROM production_state`;
console.log(rows);
console.log(`done — ${rows.length} row(s)`);
