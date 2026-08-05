# QC Gate Production — React + Neon Migration

**Date:** 2026-08-05
**Status:** Approved for planning

## Context

The current app (`index.html` + `server.js` + `database.js`) is a single-page vanilla-JS
QC production monitor for a Block Cylinder finishing line (products BC 1TR / BC 2TR). It
runs as an Express + Socket.IO server, likely hosted locally on the factory LAN (a code
comment references a LAN IP), persisting to a single SQLite file via `sql.js`.

This migration moves the app to **React (Next.js) + Neon Postgres**, deployed fully to
the cloud (Vercel), while preserving every existing feature. The UI is split into three
routes — **Dashboard**, **Input**, **History** — replacing the current single page.

Everything in this document was walked through and approved interactively; no section is
speculative.

## Goals

- 100% feature parity with the current app (see "Feature Inventory" below) — nothing
  drops silently.
- Split the single-page UI into `/dashboard`, `/input`, `/history`.
- Replace sql.js/SQLite with Neon Postgres.
- Move fully to cloud hosting (Vercel), replacing the LAN-hosted Express process.
- Replace Socket.IO real-time sync with a serverless-compatible approach.

## Non-Goals

- Multi-line / multi-product-family support beyond BC 1TR / BC 2TR (out of scope; the
  fixed defect/repair category lists and two-product layout carry over unchanged).
- Migrating existing `qcgate.db` data into Neon — **explicitly decided against**; Neon
  starts fresh.
- User accounts / per-operator login — the app keeps its current model of a free-text
  "Operator" name field, no authentication beyond the single reset password.

## Feature Inventory (must all survive the migration)

| Feature | Current implementation | New home |
|---|---|---|
| Operator/shift/date entry | Toolbar in `index.html` | Input |
| Target input + progress bar + achievement % | `target-strip` | Input (editable) + Dashboard (read-only mirror) |
| OK counters (direct +/−) | `add()`/`minus()` | Input |
| Repair counter (+ opens modal w/ 11 fixed types + qty, − direct) | `openRepairModal()`/`saveRepair()` | Input |
| NG counter (+ opens modal w/ 10 fixed defect types + qty, − direct) | `openDefectModal()`/`saveDefect()` | Input |
| OK/Repair/NG rate % | `updateRate()` | Input + Dashboard |
| NG-rate alarm toast (>5%) | `checkNGAlarm()` | Input |
| Production distribution doughnut chart | Chart.js | Dashboard |
| Defect Pareto chart | Chart.js | Dashboard |
| Repair Pareto chart | Chart.js | Dashboard |
| Hourly production table | `updateHourlyTable()` / `renderHourlyTable()` | Dashboard |
| Defect/Repair detail summaries | `updateSidebarSummary()` | Dashboard |
| Password-gated reset → archive to history | `confirmReset()` / `database.resetState()` | Input only (not on Dashboard, to avoid accidental resets) |
| Excel export (multi-sheet: Production/Defect/Repair/Hourly) | `saveData()` (SheetJS) | Dashboard (current shift) + History (per archived record) |
| Auto-reset at shift change (07:00/19:00) | client-side `setInterval` | Server-side Vercel Cron Job hitting `/api/cron/shift-reset` |
| Real-time multi-device sync | Socket.IO | React Query polling (3s) + optimistic mutations |
| Anti-clobber "safety lock" (1.5s) | `_lastUserAction` timestamp check | React Query optimistic update + delayed invalidation |
| History of archived shifts | `history` table, `/api/history` (**currently unused by the frontend**) | History page — first real UI for this data |
| Toast notifications | `showToast()` | Ported as-is (shared component) |
| Connection status indicator | `conn-dot` / Socket.IO connect/disconnect | Ported, driven by React Query fetch state instead |
| Dark theme / design tokens | CSS custom properties in `index.html` | Ported to CSS Modules / global stylesheet, same tokens |

## Architecture & Stack

- **Framework:** Next.js (App Router), one project, deployed to Vercel.
- **Database:** Neon Postgres via `@neondatabase/serverless` (HTTP-based driver, fits the
  per-request serverless pattern with no connection pooling to manage).
- **Data fetching:** TanStack Query (React Query) on the client, calling Next.js Route
  Handlers (`app/api/**`) which talk to Neon.
- **Charts:** Chart.js + `chartjs-plugin-datalabels`, wrapped in React components — same
  three charts, same visuals.
- **Excel export:** SheetJS (`xlsx`), client-side, same multi-sheet structure.
- **Auth for reset:** `RESET_PASSWORD` env var, validated inside the reset Route Handler.
  The client never holds the correct value.
- **Realtime:** No Socket.IO. React Query polls the live-state endpoint every 3s;
  mutations apply optimistic updates + invalidate on success.
- **Scheduled auto-reset:** Vercel Cron Job (`vercel.json` `crons` entry) calling
  `POST /api/cron/shift-reset` at 07:00 and 19:00.
- **Styling:** Dark theme ported as-is (same CSS custom properties / color tokens, same
  Inter font), restructured into component-scoped CSS. A UI-polish pass with the
  `impeccable` skill happens after the structural implementation is in place.

## Data Model (Neon Postgres)

```sql
CREATE TABLE production_state (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  date        TEXT NOT NULL DEFAULT '',
  shift       TEXT NOT NULL DEFAULT 'Shift Red',
  operator    TEXT NOT NULL DEFAULT '',
  target      INTEGER NOT NULL DEFAULT 0,
  ok1         INTEGER NOT NULL DEFAULT 0,
  repair1     INTEGER NOT NULL DEFAULT 0,
  ng1         INTEGER NOT NULL DEFAULT 0,
  ok2         INTEGER NOT NULL DEFAULT 0,
  repair2     INTEGER NOT NULL DEFAULT 0,
  ng2         INTEGER NOT NULL DEFAULT 0,
  defect_data JSONB NOT NULL DEFAULT '{}',
  repair_data JSONB NOT NULL DEFAULT '{}',
  hourly_data JSONB NOT NULL DEFAULT '{}',
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE history (
  id          SERIAL PRIMARY KEY,
  date        TEXT NOT NULL,
  shift       TEXT NOT NULL,
  operator    TEXT NOT NULL,
  target      INTEGER NOT NULL DEFAULT 0,
  ok1         INTEGER NOT NULL DEFAULT 0,
  repair1     INTEGER NOT NULL DEFAULT 0,
  ng1         INTEGER NOT NULL DEFAULT 0,
  ok2         INTEGER NOT NULL DEFAULT 0,
  repair2     INTEGER NOT NULL DEFAULT 0,
  ng2         INTEGER NOT NULL DEFAULT 0,
  defect_data JSONB NOT NULL DEFAULT '{}',
  repair_data JSONB NOT NULL DEFAULT '{}',
  hourly_data JSONB NOT NULL DEFAULT '{}',
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Same singleton-row pattern for `production_state` (`CHECK (id=1)`, insert-or-ignore on
first boot) and same archive-on-reset behavior as today. `defect_data`/`repair_data`/
`hourly_data` move from TEXT-encoded JSON to native `JSONB` — the application no longer
manually `JSON.parse`/`JSON.stringify`s them.

No new tables: three routes are three *views* over this same data, not three separate
data models. `history` is unchanged in shape from today's SQLite schema; it's just never
had a UI in front of it until now.

## Pages & Routes

**`/input`** — the operator's working screen (floor devices):
- Toolbar: operator name, shift select, live date
- Target input, progress bar, achievement %
- BC 1TR / BC 2TR counter cards, preserving the exact interaction quirk: OK has direct
  `+`/`−`; Repair's `+` opens the Repair modal (11 fixed types + qty) while `−`
  decrements directly; NG's `+` opens the Defect modal (10 fixed types + qty) while `−`
  decrements directly
- Rate strip for immediate feedback
- NG-rate alarm toast (>5%)
- Reset button → password modal → archive-then-zero (only on this page)

**`/dashboard`** — read-only overview (office/supervisor screen or a second monitor):
- Live mirror of operator/shift/date, target/achievement, progress bar (read-only)
- Rate strip
- Three Chart.js charts: production distribution, defect Pareto, repair Pareto
- Hourly production table, defect/repair detail summaries
- "Save Data" → Excel export of the current in-progress shift
- Connection/sync status indicator + live clock

**`/history`** — archived shifts:
- Table of past `history` rows (date, shift, operator, target, OK/Repair/NG totals,
  saved_at)
- Filter by date range and/or shift
- Expand a row to see its defect/repair breakdown and hourly data (same chart components,
  fed historical data)
- Per-row "Export to Excel"

A shared top nav replaces the current single header, linking the three routes.

## Realtime Sync & Anti-Clobber Behavior

Today's rule: when a Socket.IO `stateUpdate` arrives, if the local user interacted within
the last 1.5s, incoming counters are ignored (`_lastUserAction` lock) so a slow
round-trip can't visually "bounce" a value the user just set. Reproduced without sockets:

- Live state lives in one React Query key (`['productionState']`), polled every 3s from
  `GET /api/state`.
- Every mutation (`add`, `minus`, `saveDefect`, `saveRepair`, `reset`) is a
  `useMutation` that:
  1. Applies an optimistic update to the local cache immediately.
  2. Sends the change to its Route Handler.
  3. On success, invalidates `['productionState']` after a short grace window (matching
     today's 1.5s lock) so a slow poll response can't stomp the just-applied value.
  4. On error, rolls back the optimistic update and shows an error toast.
- Other devices simply see the new value on their next 3s poll.

Net effect: the acting device's own taps are instant and never bounce; other devices
catch up within ~3s — same felt behavior as today, without a persistent socket
connection.

## Error Handling & Edge Cases

- API failures return `{success:false, error}` (same envelope as today); client shows an
  error toast and keeps its last-known local state.
- Connection-status dot driven by React Query's `isError`/`isFetching`, with its built-in
  retry/backoff replacing the manual Socket.IO reconnect logic.
- Wrong reset password: checked server-side now, toast on mismatch (same UX as today).
- Concurrent reset race: archive-then-zero happens in a single Postgres transaction.
- Defect/repair qty ≥1: validated client-side (as today) *and* server-side (new
  hardening).
- Auto-reset via Cron: `POST /api/cron/shift-reset` runs the same archive-then-zero
  transaction at 07:00/19:00 regardless of whether any device has the app open (fixes a
  real reliability gap in the current client-side-timer approach). **Behavior change**
  (explicitly approved): the automatic Excel file download that today's client-side
  auto-reset triggers goes away, since a server Cron has no browser to download to. Data
  is not lost — it's archived to `history` exactly as always, and exportable anytime from
  the History page.

## Testing Strategy

- **API routes:** Vitest against a throwaway Neon branch (Neon supports instant DB
  branching) — state get/save, reset transaction correctness, history list/filter, cron
  endpoint, password validation.
- **Components:** React Testing Library for counter cards (+/− behavior, modal-gated
  Repair/NG increments), Defect/Repair modals (fixed options, qty validation), and the
  optimistic-update/rollback mutation behavior.
- **E2E smoke test** (Playwright): enter counts on Input → see them reflected on
  Dashboard within a poll cycle → reset → confirm it appears in History.
- Priority: cover the highest-connectivity "god node" behaviors identified in the
  codebase graph analysis first — `saveState`/`resetState`/`persistData`-equivalents —
  since those are the highest-risk-to-break pieces.

## Open Questions

None outstanding — all decisions in this document were confirmed interactively during
brainstorming.
