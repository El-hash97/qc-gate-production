# Suspect Defect Line — Master Data + Dashboard Pareto-by-Line

**Date:** 2026-09-12
**Status:** Approved for planning

## Context

QC Gate's Pareto Defect (NG) chart shows which defect *type* is most frequent
(Kandama Front, Gas Hole Cope, …), but not which *foundry process stage* is
likely producing it. The plant organizes defect troubleshooting around four
process stages — Melting, Moulding, Core Making, Finishing — and already
maintains an informal mapping of "which stages could plausibly cause this
defect." This feature makes that mapping first-class, editable data, and adds
a second Dashboard chart that aggregates NG by suspect line.

The mapping is **many-to-many**: a defect can have more than one suspect
line (e.g. "Gas Hole" is suspect for Melting, Moulding, *and* Core Making —
confirmed with the user from their own seed data, not an assumption).

This is scoped to Block Cylinder's defect vocabulary but the chart is shown on
every dashboard view (B/C, Camshaft, Crankshaft, Semua) per the user's
decision — the seed data already mixes BC-style names (Kandama, Gas Hole
Cope) with shaft-style names (Ireboshi, Dross).

## Goals

- An editable master-data list of (line, defect name) pairs, seeded with the
  user's initial 24 pairs.
- A new `/master-data` page, reachable only when logged in (mirrors
  Input/History's existing gate — no new role, the app has exactly one login).
- A new Dashboard panel: a 4-bar chart (Melting/Moulding/Core Making/
  Finishing) showing each line's total suspect NG count, its share of the
  4-bar total as a percentage, and a tooltip breaking that total down by the
  actual defect types that contributed to it (each with its own count and
  percentage of that line's total).

## Non-Goals

- The four line names themselves are **not** editable in this pass — only the
  defect-name list under each fixed line. (Flagged to the user; cheap to
  revisit if wrong.)
- No audit trail / history of master-data edits — it's reference data, edited
  rarely, like the existing hardcoded `DEFECT_TYPES` constant.
- No per-product-group master data — one shared list across B/C and shaft,
  matching the user's decision that the chart applies to every view.
- Repair Pareto is unaffected — this is NG (defect) only, matching the user's
  request ("Suspect data defect line").

## Data Model

New table, `defect_lines` — one row per (line, defect name) pair, since a
defect can appear under several lines:

```sql
CREATE TABLE IF NOT EXISTS defect_lines (
  id          SERIAL PRIMARY KEY,
  line        TEXT NOT NULL,        -- one of the 4 fixed line names
  defect_name TEXT NOT NULL,
  UNIQUE (line, defect_name)
);
```

The four line names are a fixed TypeScript constant (`DEFECT_LINES = ['Melting',
'Moulding', 'Core Making', 'Finishing']`), not stored per-row as free text
validated against a lookup table — simplest option that still satisfies "the
defect list is editable," and avoids a second CRUD surface for the lines
themselves.

Seeded once (idempotent `INSERT ... ON CONFLICT DO NOTHING`, via `lib/schema.sql`
for new databases and a `scripts/migrate-defect-lines.mjs` one-off for the
existing live database, matching every other schema change this project has
made) with the user's 24 pairs:

- Melting: Kandama, Yuzakai, Pinhole, Gas Hole, Ireboshi, Dross
- Moulding: Dakon, Youmouyo, Gomi, Ihada, Kake, Kataochi, Mikui, Crack, Gas Hole
- Core Making: Mejashi, Vinning, Gyakubari, Gomi, Togata Tare, Gas Hole
- Finishing: Kake, Tsurikomi

## Matching Logic

Master-data names are short/generic ("Kandama") while logged defect entries
use the full `DEFECT_TYPES`/`SHAFT_DEFECT_TYPES` strings ("Kandama Front").
A defect entry `type` is considered suspect for a `defect_lines` row when,
after lowercasing and stripping all whitespace from both strings, one
contains the other:

```ts
function matches(defectType: string, masterName: string): boolean {
  const a = defectType.toLowerCase().replace(/\s+/g, '');
  const b = masterName.toLowerCase().replace(/\s+/g, '');
  return a.includes(b) || b.includes(a);
}
```

Stripping whitespace (not just lowercasing) is deliberate: the seed data
spells "Pinhole" as one word, which must still match `DEFECT_TYPES`'s
"Pin Hole Cope" (`"pinholecope".includes("pinhole")` ⇒ true). This is a
heuristic, not a guarantee — if a future master-data entry matches more
logged types than intended, the fix is editing the entry's spelling on the
Master Data page, not a code change.

Bidirectional `includes` also covers the reverse case (a custom master-data
entry more specific than any logged type), at negligible cost.

## Aggregation for the Chart

Per the user's decision, a defect matching multiple lines is counted in
**full** for each — no splitting. For each of the 4 fixed lines:

```
lineTotal(line) = Σ defectData[type]  for every (type, count) in defectData
                                       where matches(type, name)
                                       for any (line, name) row in defect_lines
```

`defectData` is the same `Record<string, number>` already used by
`ParetoChart` (BC: `current.defectData`; shaft: `current.defectDataShaft`;
"Semua": `mergeCounts` of both — this chart reuses whichever `defectData`
the Dashboard page already computed for the active view, no new aggregation
of `entryLogs` needed).

Percentage is each line's share of the **sum of all 4 line totals**, not of
the raw NG total — since a defect counted in 2+ lines would otherwise push
the total over 100%. This makes the 4 percentages always sum to 100%, which
is the reading the user confirmed makes sense for "which line is most
suspect this shift."

Tooltip on a bar shows the line's total and percentage, then a breakdown of
the individual defect types that contributed, each with its own pcs count
*and its own percentage* of that line's total (added per the user's
follow-up).

Edge cases:
- No `defect_lines` rows match anything in `defectData` for a given line ⇒
  that bar is 0%, not hidden (all 4 bars always render, for a consistent
  read across shifts).
- No `defect_lines` data at all (e.g. DB not yet seeded) ⇒ all 4 bars show
  0, chart still renders (no crash, no special empty state needed beyond
  that).

## Components

**Backend** (mirrors `lib/defectPhotos.ts` + `app/api/defect-photos/*`, the
existing simplest CRUD precedent in this codebase):

- `lib/defectLines.ts` — `listDefectLines()`, `addDefectLine(line, defectName)`,
  `deleteDefectLine(id)`. Rejects an empty/whitespace `defectName`; relies on
  the `UNIQUE (line, defect_name)` constraint to reject exact duplicates
  (surfaced to the UI as a normal error toast, not a special case).
- `app/api/defect-lines/route.ts` — `GET` (list all), `POST` (add one).
- `app/api/defect-lines/[id]/route.ts` — `DELETE`.

**Client:**

- `hooks/useDefectLines.ts` — `useDefectLines()` (plain `useQuery`, no
  polling interval — this is admin data edited rarely, not live shift data),
  `useAddDefectLine()`, `useDeleteDefectLine()` (mutations, invalidate the
  list query on success).
- `utils/defectLines.ts` — the pure `matches()` helper and a
  `paretoByLine(defectData, mappings)` function returning, per line, its
  total/percentage and the sorted per-type breakdown (each with its own
  count and percentage) — unit-tested in isolation from any React/DB
  concern, following this project's established pattern of keeping
  aggregation logic in plain `utils/*.ts` functions (`utils/oee.ts`,
  `utils/rates.ts`, `utils/charts.ts`).
- `components/production/LineParetoChart.tsx` — the 4-bar Chart.js chart
  (via the existing `Chart`/`chartSetup` wrapper `ParetoChart` already uses),
  built from `paretoByLine()`'s output. A new component rather than a
  `ParetoChart` variant — different shape (fixed 4 categories vs. one bar per
  defect type) and a materially richer tooltip.
- `app/master-data/page.tsx` — four columns (one per fixed line), each
  listing its defect names with a delete button and an add-input, backed by
  `useDefectLines()`/`useAddDefectLine()`/`useDeleteDefectLine()`.

**Wiring:**

- `components/layout/TopNav.tsx` — add `{ href: '/master-data', label: 'Master Data' }`
  to `LINKS` (already only rendered when `authed`, so no new gating logic).
- `components/layout/AuthGate.tsx` — add `/master-data` to `PROTECTED_PATHS`
  so direct-URL access is blocked pre-login too, same as `/input`/`/history`.
- `app/dashboard/page.tsx` — new panel "Pareto Defect per Line" in the bento
  grid, near the existing "Pareto Defect (NG)" panel, built from
  `LineParetoChart` fed the view's current `defectData` and
  `useDefectLines()`'s list. Rendered for every view (no `showOee`-style
  product gating).
- `hooks/useDashboardSettings.ts` — add `{ id: 'lineDefect', label: 'Pareto Defect per Line' }`
  to `PANELS` so it's toggleable from the existing Settings modal.

## Testing

Following this project's existing per-feature test depth:

- `utils/defectLines.ts`: unit tests for `matches()` (whitespace/case
  normalization, bidirectional containment, the "Pinhole"/"Pin Hole Cope"
  case specifically) and `paretoByLine()` (multi-line double-counting,
  percentage summing to 100%, zero-match line, empty mappings, per-type
  percentage within a line's breakdown).
- `lib/defectLines.ts`: unit tests with a mocked `sql`, matching
  `lib/defectPhotos.ts`'s existing test style.
- `LineParetoChart`: renders 4 bars from a fixed mapping + defectData
  fixture; tooltip callback content (total, percentage, per-type breakdown
  with its own percentage) assembled correctly.
- `app/master-data/page.tsx`: add/delete a defect name updates the list;
  rejects empty input.
- `TopNav`/`AuthGate`: extend existing tests to cover the new link and the
  new protected path, following the same mocking style already used for
  `/input`/`/history`.

## Decisions Already Resolved With the User

- Multi-line defects are counted in full for every matching line (not split),
  confirmed against the "Gas Hole" (3 lines), "Gomi" (2 lines), "Kake" (2
  lines) examples already present in the seed data.
- Name matching is substring-based (whitespace/case-normalized,
  bidirectional), not exact-match or a constrained picker.
- The chart applies to every dashboard view (B/C, Camshaft, Crankshaft,
  Semua), not B/C only.
- The four line names themselves are fixed, not part of the editable master
  data — called out above as a Non-Goal rather than decided silently.
