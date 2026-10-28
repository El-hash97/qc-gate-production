// Creates the app's tables on a fresh Supabase (or any Postgres) database:
//   node --env-file=.env.local scripts/setup-supabase.mjs
// Reads SUPABASE_DATABASE_URL (falls back to DATABASE_URL). Safe to re-run.
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Set SUPABASE_DATABASE_URL (or DATABASE_URL) first.');

// Where history ids start on this database: the old Neon history (ids 1..N)
// is imported later with its own ids, so new shifts must not reuse them.
const HISTORY_FIRST_ID = 100000;
const TABLES = [
  'production_state', 'history', 'defect_types', 'defect_lines',
  'defect_photos', 'display_settings', 'counter_baselines',
];

const sql = postgres(url, { prepare: false, max: 1, ssl: 'require', connect_timeout: 15 });
try {
  await sql.unsafe(readFileSync(new URL('../lib/schema.sql', import.meta.url), 'utf8'));

  // Supabase exposes every public table through its REST API (anon key). RLS
  // with no policy shuts that door; the app's direct Postgres role bypasses RLS.
  for (const t of TABLES) await sql.unsafe(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);

  // Only while history is empty, so a re-run never moves a live sequence back.
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM history`;
  if (n === 0) await sql.unsafe(`ALTER SEQUENCE history_id_seq RESTART WITH ${HISTORY_FIRST_ID}`);

  const counts = {};
  for (const t of TABLES) counts[t] = (await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`))[0].n;
  console.log('ok', counts);
} finally {
  await sql.end();
}
