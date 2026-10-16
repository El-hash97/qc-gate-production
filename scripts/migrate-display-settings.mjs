// One-off: create the display_settings table (shared Overview panel / pin /
// tag layout, one JSON row per page — see lib/displaySettings.ts).
// Idempotent (IF NOT EXISTS) — safe to re-run.
// Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-display-settings.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS display_settings (
    key       TEXT PRIMARY KEY,
    value     JSONB NOT NULL DEFAULT '{}',
    saved_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const rows = await sql`SELECT key, value, saved_at FROM display_settings`;
console.log(rows);
console.log(`done — ${rows.length} row(s)`);
