// One-off: add hourly_data_cam / hourly_data_crank to production_state + history.
// Idempotent (IF NOT EXISTS). Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-hourly-per-line.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS hourly_data_cam JSONB NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS hourly_data_crank JSONB NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE history ADD COLUMN IF NOT EXISTS hourly_data_cam JSONB NOT NULL DEFAULT '{}'`;
await sql`ALTER TABLE history ADD COLUMN IF NOT EXISTS hourly_data_crank JSONB NOT NULL DEFAULT '{}'`;

const cols = await sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE column_name IN ('hourly_data_cam', 'hourly_data_crank')
  ORDER BY table_name, column_name`;
console.log(cols);
console.log('done');
