// One-off: add target_bc / target_cam / target_crank to production_state + history.
// Idempotent (IF NOT EXISTS). Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-per-group-targets.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

for (const table of ['production_state', 'history']) {
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS target_bc INTEGER NOT NULL DEFAULT 0`);
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS target_cam INTEGER NOT NULL DEFAULT 0`);
  await sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS target_crank INTEGER NOT NULL DEFAULT 0`);
}

// Seed the split from the existing single target so live/history rows aren't
// left showing 0 for every group: put the whole current target under BC.
await sql`UPDATE production_state SET target_bc = target WHERE target_bc = 0 AND target > 0`;
await sql`UPDATE history SET target_bc = target WHERE target_bc = 0 AND target > 0`;

const cols = await sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE column_name IN ('target_bc', 'target_cam', 'target_crank')
  ORDER BY table_name, column_name`;
console.log(cols);
console.log('done');
