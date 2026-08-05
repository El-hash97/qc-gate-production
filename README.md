# QC Gate Production

React (Next.js) + Neon Postgres monitoring app for the Block Cylinder finishing line (BC 1TR / BC 2TR).

## Setup

1. `npm install`
2. Create a Neon project at https://console.neon.tech and copy its connection string.
3. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — your Neon connection string
   - `RESET_PASSWORD` — password required to reset/archive the current shift
   - `CRON_SECRET` — random secret Vercel Cron uses to authenticate scheduled shift-reset calls
4. Apply the schema: run the contents of `lib/schema.sql` against your Neon database (via the Neon SQL Editor, or `psql "$DATABASE_URL" -f lib/schema.sql`).
5. `npm run dev` — app runs at http://localhost:3000, redirecting to `/dashboard`.

## Routes

- `/input` — operator entry screen (counters, defect/repair modals, reset)
- `/dashboard` — read-only live overview (charts, hourly table, Excel export)
- `/history` — archived shifts, filterable, per-record Excel export

## Scheduled auto-reset

`vercel.json` schedules `POST /api/cron/shift-reset` at 00:00 and 12:00 UTC (07:00 and 19:00 WIB) to auto-archive and zero the current shift, matching the factory's shift-change times. Adjust the cron schedule in `vercel.json` if your factory operates in a different timezone.

## Testing

- `npm test` — unit + component tests (Vitest)
- `npm run test:e2e` — Playwright smoke test (requires a running dev server against a real/test Neon database — ideally a separate Neon branch, not your main data, since it writes and archives a synthetic test record)

## Migration history

This app was migrated from a single-page vanilla JS + Express/Socket.IO + sql.js implementation. See `docs/superpowers/specs/2026-08-05-web-react-neon-migration-design.md` and `docs/superpowers/plans/2026-08-05-web-react-neon-migration.md` for the full design and implementation history.
