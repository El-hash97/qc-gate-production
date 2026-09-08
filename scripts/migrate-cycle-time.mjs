// One-off: add cycle_time_bc (seconds per piece, Block Cylinder) to
// production_state + history. It is the basis of the OEE availability factor:
// 3600 / cycle_time_bc = pcs an uninterrupted hour yields (50 s -> 72 pcs).
// Idempotent (IF NOT EXISTS). Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-cycle-time.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

for (const table of ['production_state', 'history']) {
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS cycle_time_bc INTEGER NOT NULL DEFAULT 50`);
}

const cols = await sql`
  SELECT table_name, column_name, column_default FROM information_schema.columns
  WHERE column_name = 'cycle_time_bc'
  ORDER BY table_name`;
console.log(cols);
console.log('done');
