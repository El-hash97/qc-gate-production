// One-off: add hourly_window (JSONB, keyed "HH:00" -> {start,end} as "HH:MM")
// to production_state + history.
// Idempotent (IF NOT EXISTS). Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-hourly-window.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

for (const table of ['production_state', 'history']) {
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS hourly_window JSONB NOT NULL DEFAULT '{}'`);
}

const cols = await sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE column_name = 'hourly_window'
  ORDER BY table_name`;
console.log(cols);
console.log('done');
