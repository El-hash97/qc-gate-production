// One-off: add pic TEXT column to production_state + history.
// Idempotent (IF NOT EXISTS). Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-pic.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS pic TEXT NOT NULL DEFAULT ''`;
await sql`ALTER TABLE history ADD COLUMN IF NOT EXISTS pic TEXT NOT NULL DEFAULT ''`;

const cols = await sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE column_name = 'pic'
  ORDER BY table_name`;
console.log(cols);
console.log('done');
