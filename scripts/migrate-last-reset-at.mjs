// One-off: add last_reset_at to production_state for the auto shift reset
// (lib/autoReset.ts). Defaults to now() so the running shift isn't reset the
// moment this lands. Idempotent (IF NOT EXISTS) - safe to re-run.
// Run once against the live Neon DB BEFORE deploying the auto-reset code:
//   node --env-file=.env.local scripts/migrate-last-reset-at.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now()`;

const rows = await sql`SELECT id, last_reset_at FROM production_state`;
console.log(rows);
console.log(`done - ${rows.length} row(s)`);
