# Hourly Table Full-Width, Inline Line Stops + Countermeasure, Manual Hour-Pin Input

**Date:** 2026-09-25
**Status:** Approved for planning

## Context

The plant already keeps a physical whiteboard ("Laporan Produksi Finishing Line")
recording, per hour: Plan/Actual/Balance, OK/Repair/NG per product, AV/PE/RQ
line-stop minutes, an "Item Problem" free-text description, and a
"Countermeasure" free-text response — see the reference photo the user
attached. The Dashboard's digital "Hourly (Tabel)" panel already covers
Plan/Actual/AV/PE/RQ/OEE, but:

- It only gets 8 of 12 grid columns on the B/C view (sharing the row 2:1 with
  the "OEE per Jam" chart), so it visually stops short of the panel grid's
  right edge, unlike the full-width whiteboard table.
- It has no equivalent of "Item Problem" / "Countermeasure" — line stops are
  logged in a separate list (`LineStopSection`/`LineStopTable`), not
  cross-referenced into their hour's row.
- `LineStop` has no countermeasure field at all yet.
- Production is always attributed to the *real* current wall-clock hour
  (`useHourlySnapshot`'s `hourKey()`). The plant isn't running this on the
  floor in real time yet, and even once it is, there's a recurring need to
  correct the record after the fact: an hour that fell short of Plan can be
  topped up from a later hour that overshot, the way the whiteboard's
  "Balance" column already implies manual carry-over happens today. There's
  no way to redirect an OK/Repair/NG count at a chosen hour instead of
  whichever hour the clock is actually in.

## Goals

- The Dashboard's "Hourly (Tabel)" panel becomes full width (12/12 columns);
  "OEE per Jam" moves to its own full-width row directly below it instead of
  sharing the row.
- Each Hourly (Tabel) row shows every line stop that overlaps that hour, as
  two new columns: **Item Problem** and **Countermeasure** — sourced from the
  same `lineStops` data already captured on the Input page, split across
  hour boundaries the same way AV/PE minutes already are.
- `LineStop` gains a `countermeasure` field, collected in `LineStopSection`'s
  add form (alongside the existing "Keterangan"/problem field) and shown in
  both `LineStopTable` (the Dashboard's read-only list panel) and the new
  Hourly (Tabel) columns.
- Logged-in users get a per-hour toggle, in the Hourly (Tabel)'s Jam column,
  that "pins" one hour as the manual-input target. While an hour is pinned,
  every OK/Repair/NG count entered on the Input page (any product line)
  attributes to that hour instead of the real current hour — until the same
  toggle is switched off (or a different hour's toggle is turned on, which
  replaces it; only one hour can be pinned at a time).

## Non-Goals

- The pin does not change *what* gets counted, only *which hour's bucket*
  the net production lands in — the underlying cumulative OK/Repair/NG
  totals (`ok1`, `repair2`, etc.) are unaffected, exactly as they are today
  when production is attributed to the real current hour.
- The pin is a plant-wide, single-target setting (matches how `hourlyWindow`
  and `lineStops` are already plant-wide, not per-product-view) — there's no
  separate pin per product group.
- No change to how AV/PE/RQ/OEE are *calculated* — `avMinutesByHour`/
  `peMinutesByHour`/`hourlyOee`/`shiftOee` keep their exact current formulas.
  This spec only adds a *new*, unfiltered-by-category sibling
  (`lineStopsByHour`) that collects the stop objects themselves for display,
  reusing the same hour-splitting rule.
- `pinnedHour` is not archived to `history` — it's a live-editing concept
  with no meaning for a finished/read-only shift record, so `history` and
  `HistoryDetail`/the PDF export are untouched.
- Countermeasure is optional, not required, to add a line stop — matches how
  "Keterangan" is the only currently-required free-text field; making
  Countermeasure mandatory too would block logging a stop before its fix is
  known, which happens on the floor today (per the whiteboard's own blank
  Countermeasure cells).

## Data Model

**`LineStop`** (`lib/types.ts`) gains one optional field, so existing stored
data (with no `countermeasure`) still satisfies the type:

```ts
export interface LineStop {
  start: string;
  end: string;
  problem: string;
  countermeasure?: string;
  category: 'AV' | 'PE' | 'RQ';
}
```

**`ProductionState`** (`lib/types.ts`) gains one optional field:

```ts
// "HH:00" of the hour manual OK/Repair/NG input is currently redirected to,
// instead of the real current hour — or '' (the default) for real-time
// attribution. Set only while logged in, via the Hourly (Tabel) panel's
// per-row toggle. Plant-wide, not archived to history (see Non-Goals).
pinnedHour?: string;
```

**Schema** (`lib/schema.sql`, `production_state` only — not `history`, see
Non-Goals):

```sql
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS pinned_hour TEXT NOT NULL DEFAULT '';
```

Seeded via a one-off `scripts/migrate-pinned-hour.mjs`, matching every other
column addition this project has made (e.g. `scripts/migrate-pic.mjs`).
`lib/productionState.ts`'s `rowToState`/`saveProductionState` map it like
every other plain-string field (`pic`), defaulting a missing/absent value to
`''`. `lib/reset.ts` explicitly resets it to `''` on every shift reset (both
the archive-and-clear and the already-empty branches), so a new shift always
starts un-pinned.

## Manual Hour-Pin Mechanism

`hooks/useHourlySnapshot.ts` currently computes the attribution target as:

```ts
function hourKey(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}
```

This becomes:

```ts
function hourKey(pinnedHour?: string): string {
  if (pinnedHour) return pinnedHour;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}
```

`record()` calls `hourKey(state.pinnedHour)` instead of `hourKey()`. Nothing
else in the hook changes: the existing net-snapshot math (cumulative total
minus everything already booked to *other* hours) already correctly
re-attributes new production to whichever key it's given — pinning an
already-elapsed hour that fell short simply means the next OK/Repair/NG
click's net lands there instead of the real current hour, exactly the
"borrow from a later hour" adjustment the user described.

**UI:** a small toggle button in the Jam cell of each Hourly (Tabel) row
(`components/production/HourlyTable.tsx`), visible only when the panel is
already `editable` (i.e. only while logged in — the same gate the Jam-window
clock picker already uses). Clicking a row's toggle sets `pinnedHour` to that
row's hour; clicking the *already-pinned* row's toggle clears it back to
`''`. This exclusivity (only one row highlighted/active at a time) is
implemented in the state-owning callback (`app/dashboard/page.tsx`'s new
`handlePinHour`), mirroring the existing `handleHourlyWindow`:

```ts
function handlePinHour(hour: string) {
  if (!state) return;
  updateState({ ...state, pinnedHour: state.pinnedHour === hour ? '' : hour });
}
```

passed down as `onPinHour={authed ? handlePinHour : undefined}`, through
`ProductionDashboardView` into `HourlyTable`, the same path
`onHourlyWindowChange` already takes.

**Operator feedback on the Input page:** since the toggle lives on the
Dashboard (where the Jam column already is) but the OK/Repair/NG buttons
live on `/input`, a small banner is added to the top of `/input` when
`current.pinnedHour` is set — e.g. "Input diarahkan ke jam 09:00, bukan jam
real-time" — so an operator on the Input page isn't left guessing why the
Hourly table isn't updating the hour they expect. This is a small, clearly
necessary usability addition, not a new open design decision.

## Line Stops Inline in the Hourly Table

`utils/oee.ts` already has `avMinutesByHour`/`peMinutesByHour`, each built on
a private per-category-filtered, per-stop hour-splitting loop. That loop is
extracted into a shared helper:

```ts
// Hours (and minutes) a single stop's [start,end) overlaps, split at hour
// boundaries and wrapped past midnight (a stop from 23:50 to 00:20 books 10
// minutes to 23:00 and 20 to 00:00). Shared by lineStopMinutesByHour (sums
// minutes, filtered by category) and lineStopsByHour (collects the stop
// itself, every category) so both split a stop the same way.
function hourOverlaps(stop: LineStop): { hour: string; minutes: number }[] { ... }
```

`lineStopMinutesByHour` (and therefore `avMinutesByHour`/`peMinutesByHour`)
keeps its exact current signature and behavior — this is a pure internal
refactor, not a behavior change; their existing tests must keep passing
unmodified.

A new, unfiltered sibling is added:

```ts
// Which line stops (any category) overlap each hour, keyed like the hourly
// snapshots ("07:00"). A stop from 07:50 to 08:20 appears under both 07:00
// and 08:00 — for the Hourly table's Item Problem / Countermeasure columns.
export function lineStopsByHour(stops: LineStop[] = []): Record<string, LineStop[]>
```

`ProductionDashboardView` computes this once (`useMemo`, keyed on
`state.lineStops`) and passes it to `HourlyTable` as a new
`lineStopsByHour?: Record<string, LineStop[]>` prop.

`HourlyTable` renders two new columns, **unconditionally** (regardless of
whether `oee`/`hourlyPlan` are supplied — line stops apply to every view,
not just B/C), appended *after* the existing OEE columns so no existing
column-index-based test assertion shifts:

- **Item Problem**: `stops.map(s => s.problem).join('; ')`, or `—` when the
  hour has none.
- **Countermeasure**: `stops.map(s => s.countermeasure || '—').join('; ')`,
  or `—` when the hour has none.

## Countermeasure in the Line Stop Add Form + Lists

- `LineStopSection.tsx`: a new `countermeasure` local text field, rendered
  next to "Keterangan" (same `<div className={styles.group}>` pattern,
  labeled "Countermeasure"), included in the object pushed by `add()`.
  Optional — `canAdd` stays gated on `start`/`end`/`problem` only (see
  Non-Goals).
- `LineStopTable.tsx` (the Dashboard's read-only list panel): a new column
  between Problem and Kategori, showing `s.countermeasure || '—'`; the
  "Total Line Stop" footer's `colSpan` grows from 3 to 4 to match the new
  column count before Durasi.

## Dashboard Layout

`ProductionDashboardView.tsx`/`.module.css`:

- The Hourly (Tabel) `<section>`'s class list drops the
  `oeeByHour ? styles.spanWide : styles.spanHalf` ternary and the
  now-redundant `styles.hourlyTablePanel` (the print stylesheet already
  forces this panel full-width via `.spanFull`, so plain `styles.spanFull`
  now covers both screen and print) — it becomes
  `` `${styles.panel} ${styles.spanFull} ${styles.hPareto}` `` unconditionally.
- The "OEE per Jam" `<section>` (already positioned directly after Hourly
  (Tabel) in the JSX, so it already falls on the next grid row once Hourly
  (Tabel) is full-width) swaps `styles.oeeChartPanel` for `styles.spanFull`
  too, so it fills that row on its own instead of sitting 4/12 wide with an
  empty gap beside it.
- `.hourlyTablePanel`, `.spanWide`, and `.oeeChartPanel` become fully unused
  (confirmed via a repo-wide grep — nothing else references them) and are
  deleted from the CSS module, including their mentions in the two
  responsive media queries and the print stylesheet's selector list (which
  already includes `.spanFull` there, so removing `.hourlyTablePanel` from
  that selector list changes nothing about print output).

## Testing

Following this project's existing per-feature test depth:

- `utils/oee.ts`: new tests for `lineStopsByHour` (single-hour stop,
  cross-hour-boundary stop appearing in both hours, multiple stops in one
  hour, malformed/unparseable stop ignored); existing `avMinutesByHour`/
  `peMinutesByHour` tests must keep passing unmodified (regression check on
  the `hourOverlaps` refactor).
- `hooks/useHourlySnapshot.ts`: new test — production is attributed to
  `state.pinnedHour` instead of the real current hour when it's set.
- `components/production/HourlyTable.tsx`: new tests for the Item
  Problem/Countermeasure columns (single stop, cross-hour stop, multiple
  stops joined, empty-hour dash) and the pin toggle (rendered only when
  editable + `onPinHour` supplied, calls `onPinHour(hour)` on click, active
  state reflects the `pinnedHour` prop).
- `components/production/LineStopSection.tsx`: extend the existing add-flow
  tests to fill in Countermeasure and assert it's included in the `onChange`
  payload; confirm omitting it still adds the stop (optional field).
- `components/production/LineStopTable.tsx`: extend existing tests to cover
  the new Countermeasure column.
- `components/production/ProductionDashboardView.tsx`: new tests — the
  Hourly (Tabel) panel carries `spanFull`; "OEE per Jam" carries `spanFull`
  too when rendered; the pin toggle forwards to `onPinHour`.
- `app/dashboard/page.tsx` (via `tests/components/DashboardPage.test.tsx`):
  new test — clicking a row's pin toggle while logged in calls `updateState`
  with the expected `pinnedHour`.
- `app/input/page.tsx` (via `tests/components/InputPage.test.tsx`): new test
  — the "input diarahkan ke jam …" banner appears when `state.pinnedHour` is
  set, and is absent when it's `''`/unset.

## Decisions Already Resolved With the User

- "OEE per Jam" moves below the now-full-width Hourly (Tabel), full width
  itself — not removed.
- A line stop spanning two hours shows its Item Problem/Countermeasure in
  *both* hour rows (consistent with how AV/PE minutes are already split).
- `pinnedHour` is persisted server-side (survives reload, consistent across
  devices/tabs), not a local-only UI toggle.
- Pinning an hour redirects *every* OK/Repair/NG counter (all four product
  lines), not a narrower subset.
