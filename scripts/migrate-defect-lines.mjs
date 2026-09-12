// One-off: create defect_lines and seed it with the plant's initial 23
// (line, defect_name) pairs. Idempotent (IF NOT EXISTS + ON CONFLICT DO
// NOTHING) — safe to re-run. Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-defect-lines.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS defect_lines (
    id          SERIAL PRIMARY KEY,
    line        TEXT NOT NULL,
    defect_name TEXT NOT NULL,
    UNIQUE (line, defect_name)
  )
`;

const seed = [
  ['Melting', 'Kandama'], ['Melting', 'Yuzakai'], ['Melting', 'Pinhole'],
  ['Melting', 'Gas Hole'], ['Melting', 'Ireboshi'], ['Melting', 'Dross'],
  ['Moulding', 'Dakon'], ['Moulding', 'Youmouyo'], ['Moulding', 'Gomi'],
  ['Moulding', 'Ihada'], ['Moulding', 'Kake'], ['Moulding', 'Kataochi'],
  ['Moulding', 'Mikui'], ['Moulding', 'Crack'], ['Moulding', 'Gas Hole'],
  ['Core Making', 'Mejashi'], ['Core Making', 'Vinning'], ['Core Making', 'Gyakubari'],
  ['Core Making', 'Gomi'], ['Core Making', 'Togata Tare'], ['Core Making', 'Gas Hole'],
  ['Finishing', 'Kake'], ['Finishing', 'Tsurikomi'],
];

for (const [line, defectName] of seed) {
  await sql`
    INSERT INTO defect_lines (line, defect_name) VALUES (${line}, ${defectName})
    ON CONFLICT (line, defect_name) DO NOTHING
  `;
}

const rows = await sql`SELECT line, defect_name FROM defect_lines ORDER BY line, defect_name`;
console.log(rows);
console.log(`done — ${rows.length} rows`);
