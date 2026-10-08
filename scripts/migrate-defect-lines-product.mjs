// One-off: scope defect_lines per product ('bc' | 'camshaft' | 'crankshaft').
// Existing rows are the original BC seed data, so they backfill to 'bc'.
// Idempotent. Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-defect-lines-product.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE defect_lines ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'bc'`;
await sql`UPDATE defect_lines SET product = 'bc' WHERE product IS NULL OR product = ''`;
await sql`ALTER TABLE defect_lines DROP CONSTRAINT IF EXISTS defect_lines_line_defect_name_key`;
await sql`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'defect_lines_product_line_defect_name_key') THEN
      ALTER TABLE defect_lines ADD CONSTRAINT defect_lines_product_line_defect_name_key UNIQUE (product, line, defect_name);
    END IF;
  END $$`;

const rows = await sql`
  SELECT product, count(*) AS n FROM defect_lines GROUP BY product ORDER BY product`;
console.log(rows);
console.log('done');
