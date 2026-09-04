// One-off: add hourly_target_bc / hourly_target_cam / hourly_target_crank
// (JSONB, keyed "HH:00") to production_state + history.
// Idempotent (IF NOT EXISTS). Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-hourly-targets.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

for (const table of ['production_state', 'history']) {
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS hourly_target_bc    JSONB NOT NULL DEFAULT '{}'`);
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS hourly_target_cam   JSONB NOT NULL DEFAULT '{}'`);
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS hourly_target_crank JSONB NOT NULL DEFAULT '{}'`);
}

const cols = await sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE column_name IN ('hourly_target_bc', 'hourly_target_cam', 'hourly_target_crank')
  ORDER BY table_name, column_name`;
console.log(cols);
console.log('done');
