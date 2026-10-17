// One-off: create the defect_types table (Master Data additions to the
// NG/Repair type lists, see lib/defectTypes.ts). Idempotent (IF NOT EXISTS).
// Run once against the live Neon DB BEFORE deploying the code that reads it:
//   node --env-file=.env.local scripts/migrate-defect-types.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS defect_types (
    id      SERIAL PRIMARY KEY,
    product TEXT NOT NULL,
    kind    TEXT NOT NULL,
    name    TEXT NOT NULL,
    CONSTRAINT defect_types_product_kind_name_key UNIQUE (product, kind, name)
  )
`;

const rows = await sql`SELECT count(*)::int AS n FROM defect_types`;
console.log(`done - defect_types has ${rows[0].n} row(s)`);
