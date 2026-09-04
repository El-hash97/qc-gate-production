// One-off: convert the LIVE shift's hourly maps in production_state (id = 1)
// from "cumulative shift total at end of hour" to "net produced during hour",
// matching the new useHourlySnapshot behaviour. Run ONCE, right after deploying
// that code change:
//   node --env-file=.env.local scripts/convert-hourly-to-delta.mjs
//
// Safe to re-run: a map that no longer looks cumulative (a later hour lower
// than an earlier one) is left untouched. History rows are not touched.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const UPDATERS = {
  hourly_data: (j) => sql`UPDATE production_state SET hourly_data = ${j}::jsonb WHERE id = 1`,
  hourly_data_shaft: (j) => sql`UPDATE production_state SET hourly_data_shaft = ${j}::jsonb WHERE id = 1`,
  hourly_data_cam: (j) => sql`UPDATE production_state SET hourly_data_cam = ${j}::jsonb WHERE id = 1`,
  hourly_data_crank: (j) => sql`UPDATE production_state SET hourly_data_crank = ${j}::jsonb WHERE id = 1`,
};

// Cumulative data only ever climbs across sorted hours; if a field dips, the
// map is already per-hour deltas.
function looksCumulative(sortedSnaps) {
  for (let i = 1; i < sortedSnaps.length; i++) {
    const a = sortedSnaps[i - 1];
    const b = sortedSnaps[i];
    if (b.ok < a.ok || b.repair < a.repair || b.ng < a.ng) return false;
  }
  return true;
}

function toDeltas(map) {
  const hours = Object.keys(map).sort();
  if (hours.length === 0) return { converted: false };
  if (!looksCumulative(hours.map((h) => map[h]))) return { converted: false };

  const out = {};
  let prev = { ok: 0, repair: 0, ng: 0 };
  for (const h of hours) {
    const cur = map[h];
    out[h] = {
      ok: Math.max(0, cur.ok - prev.ok),
      repair: Math.max(0, cur.repair - prev.repair),
      ng: Math.max(0, cur.ng - prev.ng),
    };
    prev = cur; // prev tracks the ORIGINAL cumulative value
  }
  return { converted: true, map: out };
}

const rows = await sql`
  SELECT hourly_data, hourly_data_shaft, hourly_data_cam, hourly_data_crank
  FROM production_state WHERE id = 1`;
if (!rows[0]) {
  console.log('no production_state row (id = 1) — nothing to do');
  process.exit(0);
}

for (const [col, run] of Object.entries(UPDATERS)) {
  const before = rows[0][col] ?? {};
  const { converted, map: after } = toDeltas(before);
  if (!converted) {
    console.log(`${col}: already per-hour deltas (or empty) — skipped`);
    continue;
  }
  await run(JSON.stringify(after));
  console.log(`${col}:`);
  console.log('  before (cumulative):', JSON.stringify(before));
  console.log('  after  (per-hour)  :', JSON.stringify(after));
}

console.log('done');
