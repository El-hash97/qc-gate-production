# Hourly Table Full-Width, Inline Line Stops + Countermeasure, Manual Hour-Pin Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dashboard's "Hourly (Tabel)" panel full width, show each hour's overlapping line stops (Item Problem + a new Countermeasure field) inline in that table, and let a logged-in user "pin" one hour so manual OK/Repair/NG input attributes to it instead of the real current hour.

**Architecture:** A new `pinned_hour` column on `production_state` (plain string, `''` = real-time) feeds `useHourlySnapshot`'s existing net-attribution math via one new parameter — no change to the attribution formula itself. A new `lineStopsByHour` utility (built on a hour-splitting helper extracted from the existing `avMinutesByHour`/`peMinutesByHour`) feeds two new, unconditionally-rendered `HourlyTable` columns. `LineStop` gains an optional `countermeasure` field threaded through the existing add-form/list/table components. The Dashboard layout change is a pure CSS-class swap (`spanFull` instead of the current `spanWide`/`spanHalf`/`oeeChartPanel` split).

**Tech Stack:** Next.js App Router, Neon Postgres (`@neondatabase/serverless`), TanStack Query, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-25-hourly-table-linestop-pin-design.md`

## Global Constraints

- `pinnedHour` is plant-wide (not per product-view), persisted server-side on `production_state`, reset to `''` on every shift reset, and **not** archived to `history`.
- Pinning an hour redirects every OK/Repair/NG counter (all four product lines) — not a narrower subset.
- A line stop spanning two hours shows its Item Problem/Countermeasure in **both** overlapping hour rows, matching how AV/PE minutes are already split by `avMinutesByHour`/`peMinutesByHour`.
- `avMinutesByHour`/`peMinutesByHour`/`hourlyOee`/`shiftOee` keep their exact current signatures and behavior — the hour-splitting refactor must not change their output.
- Countermeasure is optional on `LineStop` (back-compat with stored data that predates it) and optional to fill in when adding a line stop (not required alongside Keterangan).
- New `HourlyTable` columns (Item Problem, Countermeasure) render unconditionally (every view, not just B/C) and are appended **after** the existing OEE columns so no existing column-index-based test assertion shifts.
- "OEE per Jam" moves to its own full-width row below the now-full-width "Hourly (Tabel)" — it is not removed.

---

### Task 1: `pinned_hour` persistence (schema, migration, types, read/write, reset)

**Files:**
- Modify: `lib/types.ts` (append `pinnedHour?: string;` to `ProductionState`)
- Modify: `lib/schema.sql` (append column + ALTER)
- Create: `scripts/migrate-pinned-hour.mjs`
- Modify: `lib/productionState.ts`
- Modify: `lib/reset.ts`
- Test: `tests/unit/lib/productionState.test.ts` (update existing test)

**Interfaces:**
- Produces: `ProductionState.pinnedHour?: string` (consumed by Task 2's `useHourlySnapshot`, Task 6/7's `HourlyTable`/`ProductionDashboardView`, Task 8's `handlePinHour`, Task 9's Input-page banner).

- [ ] **Step 1: Add the field to the type**

In `lib/types.ts`, find the `lineStops` field on `ProductionState`:

```ts
  // Plant-wide line stops. Optional for back-compat; every read site defaults
  // a missing value to [].
  lineStops?: LineStop[];
  savedAt: string;
```

Replace with:

```ts
  // Plant-wide line stops. Optional for back-compat; every read site defaults
  // a missing value to [].
  lineStops?: LineStop[];
  // "HH:00" of the hour manual OK/Repair/NG input is currently redirected to,
  // instead of the real current hour — or '' (the default) for real-time
  // attribution. Set only while logged in, via the Hourly (Tabel) panel's
  // per-row toggle (see useHourlySnapshot, HourlyTable). Plant-wide; reset to
  // '' on every shift reset; not archived to history.
  pinnedHour?: string;
  savedAt: string;
```

- [ ] **Step 2: Add the column to the schema**

In `lib/schema.sql`, find:

```sql
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS cycle_time_bc INTEGER NOT NULL DEFAULT 50;
ALTER TABLE history ADD COLUMN IF NOT EXISTS cycle_time_bc INTEGER NOT NULL DEFAULT 50;
```

Add right after it:

```sql

-- "HH:00" of the hour manual production input is currently redirected to,
-- instead of the real current hour — '' (the default) means real-time. Live-
-- editing concept only: production_state, not history (an archived shift has
-- no "current hour" to redirect).
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS pinned_hour TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 3: Create the one-off migration script**

Create `scripts/migrate-pinned-hour.mjs`:

```js
// One-off: add the pinned_hour column to production_state (history doesn't
// get it — see lib/schema.sql). Idempotent (IF NOT EXISTS) — safe to re-run.
// Run once against the live Neon DB:
//   node --env-file=.env.local scripts/migrate-pinned-hour.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE production_state ADD COLUMN IF NOT EXISTS pinned_hour TEXT NOT NULL DEFAULT ''`;

const rows = await sql`SELECT id, pinned_hour FROM production_state`;
console.log(rows);
console.log(`done — ${rows.length} row(s)`);
```

- [ ] **Step 4: Verify the script is syntactically valid**

Run: `node --check scripts/migrate-pinned-hour.mjs`
Expected: no output (exit code 0). Do not run it against the real database yourself — tell the user to run it once this plan is fully implemented and tested.

- [ ] **Step 5: Update the failing test for `rowToState`**

In `tests/unit/lib/productionState.test.ts`, find the `toEqual` block in `'maps a DB row to camelCase ProductionState'`:

```ts
    expect(result).toEqual({
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', pic: '', target: 100,
      targetBc: 0, targetCam: 0, targetCrank: 0,
      ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
      ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {},
      defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
      hourlyDataCam: {}, hourlyDataCrank: {},
      hourlyTargetBc: {}, hourlyTargetCam: {}, hourlyTargetCrank: {},
      hourlyWindow: {},
      cycleTimeBc: 50,
      entryLogs: [],
      lineStops: [],
      savedAt: '2026-08-05T07:00:00.000Z',
    });
```

Replace with (adds `pinnedHour: ''` — this is the failing assertion until Step 7 lands):

```ts
    expect(result).toEqual({
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', pic: '', target: 100,
      targetBc: 0, targetCam: 0, targetCrank: 0,
      ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
      ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {},
      defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
      hourlyDataCam: {}, hourlyDataCrank: {},
      hourlyTargetBc: {}, hourlyTargetCam: {}, hourlyTargetCrank: {},
      hourlyWindow: {},
      cycleTimeBc: 50,
      entryLogs: [],
      lineStops: [],
      pinnedHour: '',
      savedAt: '2026-08-05T07:00:00.000Z',
    });
```

Also add a new test right after it, in the same `describe('getProductionState', ...)` block:

```ts
  it('reads a stored pinned_hour through', async () => {
    mockSql.mockResolvedValueOnce([{
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
      defect_data: {}, repair_data: {}, hourly_data: {},
      pinned_hour: '09:00',
      saved_at: '2026-08-05T07:00:00.000Z',
    }]);
    const result = await getProductionState();
    expect(result?.pinnedHour).toBe('09:00');
  });
```

And a new test in `describe('saveProductionState', ...)`:

```ts
  it('writes pinnedHour, defaulting to empty string when absent', async () => {
    mockSql.mockResolvedValueOnce([]);
    await saveProductionState({ operator: 'Siti', pinnedHour: '09:00' });
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain('09:00');
  });
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/lib/productionState.test.ts`
Expected: FAIL — the updated `toEqual` is missing `pinnedHour` from the actual result, and the two new tests fail on `undefined`.

- [ ] **Step 7: Implement the read/write mapping**

In `lib/productionState.ts`, find the `ProductionStateRow` interface's `line_stops`/`saved_at` fields:

```ts
  entry_logs: EntryLog[];
  line_stops?: LineStop[];
  saved_at: string;
}
```

Replace with:

```ts
  entry_logs: EntryLog[];
  line_stops?: LineStop[];
  pinned_hour?: string;
  saved_at: string;
}
```

Find `rowToState`'s `lineStops`/`savedAt` lines:

```ts
    entryLogs: row.entry_logs ?? [],
    lineStops: row.line_stops ?? [],
    savedAt: row.saved_at,
  };
```

Replace with:

```ts
    entryLogs: row.entry_logs ?? [],
    lineStops: row.line_stops ?? [],
    pinnedHour: row.pinned_hour ?? '',
    savedAt: row.saved_at,
  };
```

Find `saveProductionState`'s `line_stops`/`saved_at` SQL lines:

```ts
      entry_logs = ${JSON.stringify(state.entryLogs ?? [])}::jsonb,
      line_stops = ${JSON.stringify(state.lineStops ?? [])}::jsonb,
      saved_at = now()
    WHERE id = 1
  `;
```

Replace with:

```ts
      entry_logs = ${JSON.stringify(state.entryLogs ?? [])}::jsonb,
      line_stops = ${JSON.stringify(state.lineStops ?? [])}::jsonb,
      pinned_hour = ${state.pinnedHour ?? ''},
      saved_at = now()
    WHERE id = 1
  `;
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/lib/productionState.test.ts`
Expected: PASS, 6 tests (4 existing + 2 new).

- [ ] **Step 9: Reset `pinnedHour` on every shift reset**

In `lib/reset.ts`, find the first `UPDATE production_state SET` (inside the `sql.transaction([...])` array, the archive-and-clear branch):

```ts
          hourly_window = '{}'::jsonb,
          entry_logs = '[]'::jsonb, line_stops = '[]'::jsonb,
          saved_at = now()
        WHERE id = 1
      `,
    ]);
```

Replace with:

```ts
          hourly_window = '{}'::jsonb,
          entry_logs = '[]'::jsonb, line_stops = '[]'::jsonb,
          pinned_hour = '',
          saved_at = now()
        WHERE id = 1
      `,
    ]);
```

Find the second `UPDATE production_state SET` (the `else` branch, no archive):

```ts
        hourly_target_bc = '{}'::jsonb, hourly_target_cam = '{}'::jsonb, hourly_target_crank = '{}'::jsonb,
        entry_logs = '[]'::jsonb, line_stops = '[]'::jsonb,
        saved_at = now()
      WHERE id = 1
    `;
  }
```

Replace with:

```ts
        hourly_target_bc = '{}'::jsonb, hourly_target_cam = '{}'::jsonb, hourly_target_crank = '{}'::jsonb,
        entry_logs = '[]'::jsonb, line_stops = '[]'::jsonb,
        pinned_hour = '',
        saved_at = now()
      WHERE id = 1
    `;
  }
```

- [ ] **Step 10: Run the full reset test suite**

Run: `npx vitest run tests/unit/lib/reset.test.ts`
Expected: PASS, 6 tests (unchanged — these tests don't assert on individual SQL fragments, so this step is a regression check, not a new assertion).

- [ ] **Step 11: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add lib/types.ts lib/schema.sql scripts/migrate-pinned-hour.mjs lib/productionState.ts lib/reset.ts tests/unit/lib/productionState.test.ts
git commit -m "feat(db): pinned_hour column for manual hour-targeted production input"
```

---

### Task 2: `useHourlySnapshot` attributes to the pinned hour

**Files:**
- Modify: `hooks/useHourlySnapshot.ts`
- Test: `tests/components/useHourlySnapshot.test.ts`

**Interfaces:**
- Consumes: `ProductionState.pinnedHour` (Task 1).
- Produces: no signature change to `useHourlySnapshot(current, updateState)` — the hour-attribution behavior change is internal.

- [ ] **Step 1: Write the failing test**

In `tests/components/useHourlySnapshot.test.ts`, add this test at the end of the `describe('useHourlySnapshot', ...)` block, right before the closing `});`:

```ts
  it('attributes production to the pinned hour instead of the real current hour', () => {
    const updateState = vi.fn();
    // Real clock hour is 14:00 (see beforeEach), but pinnedHour redirects to 09:00.
    const state = { ...baseState, pinnedHour: '09:00' };
    renderHook(() => useHourlySnapshot(state, updateState));

    vi.advanceTimersByTime(5 * 60 * 1000);

    const [arg] = updateState.mock.calls[0];
    expect(arg.hourlyData).toEqual({ '09:00': { ok: 8, repair: 1, ng: 1 } });
    expect(arg.hourlyData['14:00']).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/useHourlySnapshot.test.ts`
Expected: FAIL — `arg.hourlyData` is keyed `'14:00'` (the real clock hour), not `'09:00'`.

- [ ] **Step 3: Implement the pin override**

In `hooks/useHourlySnapshot.ts`, find:

```ts
function hourKey(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}
```

Replace with:

```ts
// Real current hour, unless a pin redirects it — see ProductionState.pinnedHour.
function hourKey(pinnedHour?: string): string {
  if (pinnedHour) return pinnedHour;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}
```

Find the one call site, inside `record()`:

```ts
  function record(state: ProductionState, update: (next: ProductionState) => void) {
    if (getGrandTotal(state) === 0) return;
    const key = hourKey();
```

Replace with:

```ts
  function record(state: ProductionState, update: (next: ProductionState) => void) {
    if (getGrandTotal(state) === 0) return;
    const key = hourKey(state.pinnedHour);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/components/useHourlySnapshot.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/useHourlySnapshot.ts tests/components/useHourlySnapshot.test.ts
git commit -m "feat(hourly): attribute production to the pinned hour, not the real current hour"
```

---

### Task 3: `LineStop.countermeasure` + `lineStopsByHour`

**Files:**
- Modify: `lib/types.ts` (`LineStop.countermeasure?: string`)
- Modify: `utils/oee.ts` (extract `hourOverlaps`, add `lineStopsByHour`)
- Test: `tests/unit/utils/oee.test.ts`

**Interfaces:**
- Produces: `LineStop.countermeasure?: string` (consumed by Tasks 4, 5, 6); `lineStopsByHour(stops: LineStop[] = []): Record<string, LineStop[]>` (consumed by Task 7).

- [ ] **Step 1: Add the field to the type**

In `lib/types.ts`, find:

```ts
export interface LineStop {
  start: string;
  end: string;
  problem: string;
  category: 'AV' | 'PE' | 'RQ';
}
```

Replace with:

```ts
export interface LineStop {
  start: string;
  end: string;
  problem: string;
  // Optional for back-compat — stops logged before this field existed have none.
  countermeasure?: string;
  category: 'AV' | 'PE' | 'RQ';
}
```

- [ ] **Step 2: Write the failing tests for `lineStopsByHour`**

In `tests/unit/utils/oee.test.ts`, find the existing import block:

```ts
import { describe, it, expect } from 'vitest';
import type { LineStop } from '@/lib/types';
import {
  DEFAULT_CYCLE_TIME_SEC, PIECES_PER_BC, productCycleTime, hourCapacity,
  avMinutesByHour, peMinutesByHour,
  elapsedMinutesInHour, windowMinutes, workedMinutesInHour,
  hourlyOee, shiftOee, toPercent,
} from '@/utils/oee';
```

Replace with (`LineStop` is already imported; only the `@/utils/oee` import list changes):

```ts
import { describe, it, expect } from 'vitest';
import type { LineStop } from '@/lib/types';
import {
  DEFAULT_CYCLE_TIME_SEC, PIECES_PER_BC, productCycleTime, hourCapacity,
  avMinutesByHour, peMinutesByHour, lineStopsByHour,
  elapsedMinutesInHour, windowMinutes, workedMinutesInHour,
  hourlyOee, shiftOee, toPercent,
} from '@/utils/oee';
```

Then add this new `describe` block at the end of the file:

```ts
describe('lineStopsByHour', () => {
  it('places a single-hour stop under its hour', () => {
    const stops: LineStop[] = [{ start: '08:10', end: '08:40', problem: 'Ganti tooling', category: 'AV' }];
    expect(lineStopsByHour(stops)).toEqual({ '08:00': stops });
  });

  it('places a stop crossing an hour boundary under both hours', () => {
    const stops: LineStop[] = [{ start: '07:50', end: '08:20', problem: 'Setting ulang', category: 'PE' }];
    const result = lineStopsByHour(stops);
    expect(result['07:00']).toEqual(stops);
    expect(result['08:00']).toEqual(stops);
  });

  it('collects multiple stops that overlap the same hour, in order', () => {
    const stops: LineStop[] = [
      { start: '09:00', end: '09:10', problem: 'A', category: 'AV' },
      { start: '09:20', end: '09:30', problem: 'B', category: 'PE' },
    ];
    expect(lineStopsByHour(stops)).toEqual({ '09:00': stops });
  });

  it('ignores a stop with an unparseable time', () => {
    const stops: LineStop[] = [{ start: 'bad', end: '08:20', problem: 'A', category: 'AV' }];
    expect(lineStopsByHour(stops)).toEqual({});
  });

  it('returns an empty object for no stops', () => {
    expect(lineStopsByHour()).toEqual({});
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/utils/oee.test.ts`
Expected: FAIL — `lineStopsByHour is not a function` (or a TypeScript import error if the test file doesn't compile).

- [ ] **Step 4: Extract the shared hour-splitting helper and add `lineStopsByHour`**

In `utils/oee.ts`, find:

```ts
// Minutes lost to line stops of one category, split into the hours they
// actually fell in and keyed like the hourly snapshots ("07:00"). A stop from
// 07:50 to 08:20 books 10 minutes to 07:00 and 20 to 08:00; one that runs past
// midnight wraps around to 00:00.
function lineStopMinutesByHour(
  stops: LineStop[],
  category: LineStop['category'],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const stop of stops) {
    if (stop.category !== category) continue;
    const start = toMinutes(stop.start);
    const rawEnd = toMinutes(stop.end);
    if (start === null || rawEnd === null) continue;
    const end = rawEnd >= start ? rawEnd : rawEnd + 1440;
    for (let hour = Math.floor(start / 60); hour * 60 < end; hour++) {
      const overlap = Math.min(end, (hour + 1) * 60) - Math.max(start, hour * 60);
      if (overlap <= 0) continue;
      const key = `${String(hour % 24).padStart(2, '0')}:00`;
      out[key] = (out[key] ?? 0) + overlap;
    }
  }
  return out;
}
```

Replace with:

```ts
// Hours (and minutes) a single stop's [start,end) overlaps, split at hour
// boundaries and wrapped past midnight (a stop from 23:50 to 00:20 books 10
// minutes to 23:00 and 20 to 00:00). Shared by lineStopMinutesByHour (sums
// minutes, filtered by category) and lineStopsByHour (collects the stop
// itself, every category) so both split a stop the same way. Empty array for
// an unparseable start/end.
function hourOverlaps(stop: LineStop): { hour: string; minutes: number }[] {
  const start = toMinutes(stop.start);
  const rawEnd = toMinutes(stop.end);
  if (start === null || rawEnd === null) return [];
  const end = rawEnd >= start ? rawEnd : rawEnd + 1440;
  const out: { hour: string; minutes: number }[] = [];
  for (let hour = Math.floor(start / 60); hour * 60 < end; hour++) {
    const overlap = Math.min(end, (hour + 1) * 60) - Math.max(start, hour * 60);
    if (overlap <= 0) continue;
    out.push({ hour: `${String(hour % 24).padStart(2, '0')}:00`, minutes: overlap });
  }
  return out;
}

// Minutes lost to line stops of one category, split into the hours they
// actually fell in and keyed like the hourly snapshots ("07:00").
function lineStopMinutesByHour(
  stops: LineStop[],
  category: LineStop['category'],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const stop of stops) {
    if (stop.category !== category) continue;
    for (const { hour, minutes } of hourOverlaps(stop)) {
      out[hour] = (out[hour] ?? 0) + minutes;
    }
  }
  return out;
}

// Which line stops (any category) overlap each hour, keyed like the hourly
// snapshots ("07:00"). A stop from 07:50 to 08:20 appears under both 07:00
// and 08:00 — for the Hourly table's Item Problem / Countermeasure columns.
export function lineStopsByHour(stops: LineStop[] = []): Record<string, LineStop[]> {
  const out: Record<string, LineStop[]> = {};
  for (const stop of stops) {
    for (const { hour } of hourOverlaps(stop)) {
      (out[hour] ??= []).push(stop);
    }
  }
  return out;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/utils/oee.test.ts`
Expected: PASS, every test in the file — including the pre-existing `avMinutesByHour`/`peMinutesByHour` tests (unmodified, regression check on the refactor) plus the 5 new `lineStopsByHour` tests.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts utils/oee.ts tests/unit/utils/oee.test.ts
git commit -m "feat(oee): LineStop.countermeasure field + lineStopsByHour utility"
```

---

### Task 4: Countermeasure in `LineStopSection` (add form + list)

**Files:**
- Modify: `components/production/LineStopSection.tsx`
- Modify: `components/production/LineStop.module.css`
- Test: `tests/components/LineStopSection.test.tsx`

**Interfaces:**
- Consumes: `LineStop.countermeasure` (Task 3).

- [ ] **Step 1: Write the failing tests**

In `tests/components/LineStopSection.test.tsx`, replace the existing `'adds a line stop once both times, via the clock picker, and a problem are filled in'` test:

```ts
  it('adds a line stop once both times, via the clock picker, and a problem are filled in', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jam Mulai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 0' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.click(screen.getByRole('button', { name: 'Jam Selesai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 30' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:00', end: '07:30', problem: 'Mesin macet', countermeasure: '', category: 'AV' },
    ]);
  });
```

with:

```ts
  it('adds a line stop once both times, a problem, and a countermeasure are filled in', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jam Mulai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 0' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.click(screen.getByRole('button', { name: 'Jam Selesai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 30' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.type(screen.getByPlaceholderText('Countermeasure'), 'Ganti oli');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:00', end: '07:30', problem: 'Mesin macet', countermeasure: 'Ganti oli', category: 'AV' },
    ]);
  });
```

There is a **second** existing test in this file that also needs updating —
`countermeasure` becomes part of every pushed object now, so any test that
asserts the exact shape via `toHaveBeenCalledWith` (deep equality) breaks if
it doesn't account for the new key, even if it never touches the
Countermeasure field itself. Find:

```ts
  it('adds a line stop typed directly into the manual Jam Mulai/Selesai inputs', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Mulai' }), '730');
    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Selesai' }), '800');
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:30', end: '08:00', problem: 'Mesin macet', category: 'AV' },
    ]);
  });
```

Replace with (adds `countermeasure: ''` — this test doesn't touch the
Countermeasure field, so it doubles as the "left blank defaults to empty
string" case; no separate test is needed for that):

```ts
  it('adds a line stop typed directly into the manual Jam Mulai/Selesai inputs, with an empty countermeasure by default', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Mulai' }), '730');
    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Selesai' }), '800');
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:30', end: '08:00', problem: 'Mesin macet', countermeasure: '', category: 'AV' },
    ]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/LineStopSection.test.tsx`
Expected: FAIL — `onChange` is called without a `countermeasure` key, and `screen.getByPlaceholderText('Countermeasure')` doesn't exist yet.

- [ ] **Step 3: Implement the Countermeasure field**

In `components/production/LineStopSection.tsx`, find:

```tsx
export function LineStopSection({ stops, onChange }: LineStopSectionProps) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [problem, setProblem] = useState('');
  const [category, setCategory] = useState<LineStop['category']>('AV');

  const canAdd = start !== '' && end !== '' && problem.trim() !== '';

  function add() {
    if (!canAdd) return;
    onChange([...stops, { start, end, problem: problem.trim(), category }]);
    setStart('');
    setEnd('');
    setProblem('');
    setCategory('AV');
  }
```

Replace with:

```tsx
export function LineStopSection({ stops, onChange }: LineStopSectionProps) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [problem, setProblem] = useState('');
  const [countermeasure, setCountermeasure] = useState('');
  const [category, setCategory] = useState<LineStop['category']>('AV');

  const canAdd = start !== '' && end !== '' && problem.trim() !== '';

  function add() {
    if (!canAdd) return;
    onChange([...stops, {
      start, end, problem: problem.trim(), countermeasure: countermeasure.trim(), category,
    }]);
    setStart('');
    setEnd('');
    setProblem('');
    setCountermeasure('');
    setCategory('AV');
  }
```

Find the "Keterangan" field:

```tsx
        <label className={styles.group}>
          <span className={styles.label}>Keterangan</span>
          <input
            className={styles.input}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Problem line stop"
          />
        </label>
```

Add a matching field right after it:

```tsx
        <label className={styles.group}>
          <span className={styles.label}>Keterangan</span>
          <input
            className={styles.input}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Problem line stop"
          />
        </label>
        <label className={styles.group}>
          <span className={styles.label}>Countermeasure</span>
          <input
            className={styles.input}
            value={countermeasure}
            onChange={(e) => setCountermeasure(e.target.value)}
            placeholder="Countermeasure"
          />
        </label>
```

Find the list row rendering:

```tsx
            <div key={i} className={styles.row}>
              <span className={styles.rowTime}>{s.start}–{s.end}</span>
              <span>({formatDuration(lineStopMinutes(s.start, s.end))})</span>
              <span className={styles.rowProblem}>{s.problem}</span>
              <span className={styles.badge}>{s.category}</span>
```

Replace with:

```tsx
            <div key={i} className={styles.row}>
              <span className={styles.rowTime}>{s.start}–{s.end}</span>
              <span>({formatDuration(lineStopMinutes(s.start, s.end))})</span>
              <span className={styles.rowProblem}>{s.problem}</span>
              <span className={styles.rowCountermeasure}>{s.countermeasure || '—'}</span>
              <span className={styles.badge}>{s.category}</span>
```

- [ ] **Step 4: Add the CSS for the new field/column**

In `components/production/LineStop.module.css`, find:

```css
.form {
  display: grid;
  grid-template-columns: 130px 130px 1fr 90px auto;
  gap: 12px;
  align-items: end;
}
```

Replace with:

```css
.form {
  display: grid;
  grid-template-columns: 130px 130px 1fr 1fr 90px auto;
  gap: 12px;
  align-items: end;
}
```

Find:

```css
.rowProblem { flex: 1; color: var(--text-secondary); }
```

Replace with:

```css
.rowProblem { flex: 1; color: var(--text-secondary); }
.rowCountermeasure { flex: 1; color: var(--text-secondary); }
```

Find the mobile media query:

```css
@media (max-width: 640px) {
  .form { grid-template-columns: 1fr 1fr; }
  .form .group:nth-child(3) { grid-column: 1 / -1; }
}
```

Replace with:

```css
@media (max-width: 640px) {
  .form { grid-template-columns: 1fr 1fr; }
  .form .group:nth-child(3), .form .group:nth-child(4) { grid-column: 1 / -1; }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/LineStopSection.test.tsx`
Expected: PASS, all 5 tests (2 existing tests updated in place in Step 1, not added; the other 3 untouched).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/production/LineStopSection.tsx components/production/LineStop.module.css tests/components/LineStopSection.test.tsx
git commit -m "feat(line-stop): add optional Countermeasure field to the add form"
```

---

### Task 5: Countermeasure column in `LineStopTable`

**Files:**
- Modify: `components/production/LineStopTable.tsx`
- Test: `tests/components/LineStopTable.test.tsx`

**Interfaces:**
- Consumes: `LineStop.countermeasure` (Task 3).

- [ ] **Step 1: Write the failing test**

In `tests/components/LineStopTable.test.tsx`, replace:

```ts
  it('renders one row per stop with waktu, durasi and category, and no total row', () => {
    const stops: LineStop[] = [
      { start: '08:00', end: '08:45', problem: 'Ganti tooling', category: 'AV' },
    ];
    const { container } = render(<LineStopTable stops={stops} />);

    expect(container.textContent).toContain('08:00–08:45');
    expect(container.textContent).toContain('45m');
    expect(screen.getByText('Ganti tooling')).toBeInTheDocument();
    expect(screen.getByText('AV')).toBeInTheDocument();
    expect(screen.queryByText('Total Line Stop')).not.toBeInTheDocument();
  });
```

with:

```ts
  it('renders one row per stop with waktu, countermeasure, durasi and category, and no total row', () => {
    const stops: LineStop[] = [
      { start: '08:00', end: '08:45', problem: 'Ganti tooling', countermeasure: 'Cek berkala', category: 'AV' },
    ];
    const { container } = render(<LineStopTable stops={stops} />);

    expect(container.textContent).toContain('08:00–08:45');
    expect(container.textContent).toContain('45m');
    expect(screen.getByText('Ganti tooling')).toBeInTheDocument();
    expect(screen.getByText('Cek berkala')).toBeInTheDocument();
    expect(screen.getByText('AV')).toBeInTheDocument();
    expect(screen.queryByText('Total Line Stop')).not.toBeInTheDocument();
  });

  it('shows a dash for a stop with no countermeasure recorded', () => {
    const stops: LineStop[] = [{ start: '08:00', end: '08:45', problem: 'Ganti tooling', category: 'AV' }];
    render(<LineStopTable stops={stops} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/LineStopTable.test.tsx`
Expected: FAIL — "Cek berkala" and "—" aren't rendered yet.

- [ ] **Step 3: Implement the column**

In `components/production/LineStopTable.tsx`, replace the whole file with:

```tsx
import type { LineStop } from '@/lib/types';
import { lineStopMinutes, totalLineStopMinutes, formatDuration } from '@/utils/lineStop';
import summary from './DefectRepairSummary.module.css';
import styles from './LineStop.module.css';

export function LineStopTable({ stops = [] }: { stops?: LineStop[] }) {
  if (stops.length === 0) {
    return <div className={summary.empty}>Belum ada line stop</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Waktu</th><th>Problem</th><th>Countermeasure</th><th>Kategori</th><th>Durasi</th></tr>
      </thead>
      <tbody>
        {stops.map((s, i) => (
          <tr key={i}>
            <td>{s.start}–{s.end}</td>
            <td>{s.problem}</td>
            <td>{s.countermeasure || '—'}</td>
            <td><span className={styles.badge}>{s.category}</span></td>
            <td>{formatDuration(lineStopMinutes(s.start, s.end))}</td>
          </tr>
        ))}
      </tbody>
      {stops.length > 1 && (
        <tfoot>
          <tr>
            <td colSpan={4}>Total Line Stop</td>
            <td>{formatDuration(totalLineStopMinutes(stops))}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/components/LineStopTable.test.tsx`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/production/LineStopTable.tsx tests/components/LineStopTable.test.tsx
git commit -m "feat(line-stop): show Countermeasure column in the read-only Line Stop panel"
```

---

### Task 6: `HourlyTable` — Item Problem/Countermeasure columns + pin toggle

**Files:**
- Modify: `components/production/HourlyTable.tsx`
- Modify: `components/production/HourlyTable.module.css`
- Test: `tests/components/HourlyTable.test.tsx`

**Interfaces:**
- Consumes: `lineStopsByHour` shape from Task 3 (`Record<string, LineStop[]>`); `LineStop.countermeasure` (Task 3).
- Produces: `HourlyTableProps` gains `lineStopsByHour?: Record<string, LineStop[]>`, `pinnedHour?: string`, `onPinHour?: (hour: string) => void` — consumed by Task 7.

- [ ] **Step 1: Write the failing tests**

In `tests/components/HourlyTable.test.tsx`, add these tests at the end of the `describe('HourlyTable', ...)` block, right before the closing `});`:

```ts
  it('shows a dash in Item Problem/Countermeasure for an hour with no line stops', () => {
    render(<HourlyTable hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }} />);
    const cells = within(screen.getByRole('row', { name: /07:00/ })).getAllByRole('cell');
    expect(cells[cells.length - 2]).toHaveTextContent('—');
    expect(cells[cells.length - 1]).toHaveTextContent('—');
  });

  it("shows a line stop's problem and countermeasure under its hour", () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        lineStopsByHour={{
          '07:00': [{ start: '07:10', end: '07:20', problem: 'Ganti tooling', countermeasure: 'Cek berkala', category: 'AV' }],
        }}
      />,
    );
    const cells = within(screen.getByRole('row', { name: /07:00/ })).getAllByRole('cell');
    expect(cells[cells.length - 2]).toHaveTextContent('Ganti tooling');
    expect(cells[cells.length - 1]).toHaveTextContent('Cek berkala');
  });

  it('joins multiple line stops in the same hour with "; "', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        lineStopsByHour={{
          '07:00': [
            { start: '07:00', end: '07:10', problem: 'A', countermeasure: 'CM A', category: 'AV' },
            { start: '07:20', end: '07:30', problem: 'B', category: 'PE' },
          ],
        }}
      />,
    );
    const cells = within(screen.getByRole('row', { name: /07:00/ })).getAllByRole('cell');
    expect(cells[cells.length - 2]).toHaveTextContent('A; B');
    expect(cells[cells.length - 1]).toHaveTextContent('CM A; —');
  });

  it('does not show a pin toggle when read-only', () => {
    render(<HourlyTable hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }} />);
    expect(screen.queryByRole('button', { name: /jam 07:00/i })).not.toBeInTheDocument();
  });

  it('shows a pin toggle per row when editable and onPinHour is supplied', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        editable
        onPinHour={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Arahkan input manual ke jam 07:00' })).toBeInTheDocument();
  });

  it("calls onPinHour with the row's hour when its toggle is clicked", async () => {
    const onPinHour = vi.fn();
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        editable
        onPinHour={onPinHour}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Arahkan input manual ke jam 07:00' }));
    expect(onPinHour).toHaveBeenCalledWith('07:00');
  });

  it('shows the pinned row\'s toggle as active, with an "off" label', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        editable
        onPinHour={vi.fn()}
        pinnedHour="07:00"
      />,
    );
    const button = screen.getByRole('button', { name: 'Matikan input manual ke jam 07:00' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/HourlyTable.test.tsx`
Expected: FAIL — no Item Problem/Countermeasure columns exist yet, and no pin toggle button exists yet.

- [ ] **Step 3: Implement the new columns and pin toggle**

Replace the whole file `components/production/HourlyTable.tsx` with:

```tsx
'use client';

import { ClockTimeInput } from '@/components/ui/ClockTimeInput';
import type { HourWindow, LineStop, ProductionState } from '@/lib/types';
import type { OeeBreakdown } from '@/utils/oee';
import { toPercent } from '@/utils/oee';
import { sortHourKeys } from '@/utils/hourOrder';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
  // Actual worked window per hour, keyed "HH:00". An hour with no entry falls
  // back to the full clock hour (HH:00 -> HH+1:00).
  hourlyWindow?: Record<string, HourWindow>;
  // Per-hour plan (pcs), keyed "HH:00" — the pieces the worked window allows at
  // the cycle time, computed by the caller. Supplied only alongside `oee` (B/C);
  // the Plan and Actual columns show only when it's present.
  hourlyPlan?: Record<string, number>;
  // Line stops overlapping each hour (see utils/oee.ts's lineStopsByHour),
  // keyed "HH:00" — feeds the Item Problem / Countermeasure columns, shown
  // on every view regardless of `oee`.
  lineStopsByHour?: Record<string, LineStop[]>;
  // When true each row's time window is an editable field; otherwise it's shown
  // read-only (the "Semua" view).
  editable?: boolean;
  onWindowChange?: (hour: string, win: HourWindow) => void;
  // Which hour (if any) manual OK/Repair/NG input is currently redirected to.
  // Only relevant/rendered alongside onPinHour.
  pinnedHour?: string;
  // Toggles a row's hour as the pin target — only rendered when `editable` is
  // true (same gate as the Jam-window clock picker).
  onPinHour?: (hour: string) => void;
  // Per-hour OEE factors, keyed "HH:00". Supplied only for a view that has a
  // cycle time to measure against (B/C today); without it the Plan/Actual and
  // AV/PE/RQ/OEE columns aren't rendered at all.
  oee?: Record<string, OeeBreakdown>;
}

// "07:00" -> "08:00"; "23:00" -> "00:00". The default window of an hour is the
// clock hour itself, shown until the operator narrows it for a break.
function nextHour(hour: string): string {
  const h = parseInt(hour.slice(0, 2), 10);
  return `${String((Number.isNaN(h) ? 0 : h + 1) % 24).padStart(2, '0')}:00`;
}

function defaultWindow(hour: string): HourWindow {
  return { start: hour, end: nextHour(hour) };
}

// Two time fields; either one committing sends the whole {start,end} back up.
// Each is a circular clock picker (24h, no AM/PM) rather than a native time
// input — it only calls onChange once, when OK is pressed, so there's no
// half-edited value for the background poll to yank back mid-pick.
function WindowCell({ win, onCommit }: { win: HourWindow; onCommit: (w: HourWindow) => void }) {
  return (
    <span className={styles.windowCell}>
      <ClockTimeInput
        value={win.start} ariaLabel="Jam mulai"
        onChange={(v) => onCommit({ start: v, end: win.end })}
      />
      <span className={styles.windowDash}>–</span>
      <ClockTimeInput
        value={win.end} ariaLabel="Jam selesai"
        onChange={(v) => onCommit({ start: win.start, end: v })}
      />
    </span>
  );
}

// Small pin/target glyph for the manual-input toggle — inherits colour from
// the button via currentColor, same convention as this app's other icon
// buttons (e.g. TopNav's gear/person icons).
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.5" fill="currentColor" />
    </svg>
  );
}

// Green from 85%, amber from 60%, red below — a glance down the column shows
// which hour cost the shift its OEE.
function rateClass(percent: number): string {
  if (percent >= 85) return styles.rateGood;
  if (percent >= 60) return styles.rateWarn;
  return styles.rateBad;
}

// Actual vs Plan for the hour: green on/above plan, amber within 10%, red below.
// Uncoloured when there's no plan for the hour. AV no longer follows this
// comparison (it's driven by AV line stops now, see utils/oee.ts) — a missed
// Plan shows up only here, as the colour plus the percentage in the cell text
// below, not by pulling the AV column down too.
function actualClass(actual: number, plan: number): string {
  if (plan <= 0) return '';
  if (actual >= plan) return styles.rateGood;
  if (actual >= plan * 0.9) return styles.rateWarn;
  return styles.rateBad;
}

// "45" when the hour met (or has no) Plan; "45 / 63%" when it fell short, so
// the shortfall is visible right in this cell without a dedicated column.
function actualCellText(actual: number, plan: number): string {
  if (plan <= 0 || actual >= plan) return String(actual);
  return `${actual} / ${Math.round((actual / plan) * 100)}%`;
}

function RateCell({ ratio }: { ratio: number }) {
  const percent = toPercent(ratio);
  return <td className={rateClass(percent)}>{percent}%</td>;
}

// "A; B" from every stop's problem (or countermeasure) in the hour, "—" for
// an hour with none. Order is index-aligned across the two columns, so the
// Nth problem and Nth countermeasure describe the same stop.
function stopsText(stops: LineStop[], field: 'problem' | 'countermeasure'): string {
  if (stops.length === 0) return '—';
  return stops.map((s) => (field === 'problem' ? s.problem : s.countermeasure || '—')).join('; ');
}

export function HourlyTable({
  hourlyData, hourlyWindow = {}, hourlyPlan = {}, lineStopsByHour = {},
  editable = false, onWindowChange, pinnedHour, onPinHour, oee,
}: HourlyTableProps) {
  const sortedHours = sortHourKeys(Object.keys(hourlyData));

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Jam</th><th>OK</th><th>Repair</th><th>NG</th>
          {oee && <><th>Plan</th><th>Actual</th><th>AV</th><th>PE</th><th>RQ</th><th>OEE</th></>}
          <th>Item Problem</th><th>Countermeasure</th>
        </tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => {
          const factors = oee?.[hour];
          const win = hourlyWindow[hour] ?? defaultWindow(hour);
          const snap = hourlyData[hour];
          const actual = snap.ok + snap.repair + snap.ng;
          const plan = hourlyPlan[hour] ?? 0;
          const stops = lineStopsByHour[hour] ?? [];
          const pinned = hour === pinnedHour;
          return (
            <tr key={hour}>
              <td>
                <span className={styles.jamCell}>
                  {editable && onWindowChange ? (
                    <WindowCell win={win} onCommit={(w) => onWindowChange(hour, w)} />
                  ) : (
                    `${win.start}–${win.end}`
                  )}
                  {editable && onPinHour && (
                    <button
                      type="button"
                      className={pinned ? styles.pinButtonActive : styles.pinButton}
                      aria-label={pinned ? `Matikan input manual ke jam ${hour}` : `Arahkan input manual ke jam ${hour}`}
                      aria-pressed={pinned}
                      onClick={() => onPinHour(hour)}
                    >
                      <PinIcon />
                    </button>
                  )}
                </span>
              </td>
              <td>{snap.ok}</td>
              <td>{snap.repair}</td>
              <td>{snap.ng}</td>
              {oee && factors && (
                <>
                  <td>{plan || '—'}</td>
                  <td className={actualClass(actual, plan)}>{actualCellText(actual, plan)}</td>
                  <RateCell ratio={factors.av} />
                  <RateCell ratio={factors.pe} />
                  <RateCell ratio={factors.rq} />
                  <RateCell ratio={factors.oee} />
                </>
              )}
              <td>{stopsText(stops, 'problem')}</td>
              <td>{stopsText(stops, 'countermeasure')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Add CSS for the Jam cell layout and pin button**

In `components/production/HourlyTable.module.css`, find:

```css
/* --- "Jam" column: start/end time fields for the actual worked window --- */
.windowCell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
```

Replace with:

```css
/* --- "Jam" column: start/end time fields, plus the manual-input pin toggle --- */
.jamCell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.windowCell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.pinButton, .pinButtonActive {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  padding: 0;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
}

.pinButton:hover { background: var(--bg-card-hover); color: var(--text-primary); }

.pinButtonActive {
  background: var(--accent-orange-soft, rgba(245, 158, 11, 0.15));
  border-color: var(--accent-orange);
  color: var(--accent-orange);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/HourlyTable.test.tsx`
Expected: PASS, all 19 tests (12 existing + 7 new).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/production/HourlyTable.tsx components/production/HourlyTable.module.css tests/components/HourlyTable.test.tsx
git commit -m "feat(hourly): Item Problem/Countermeasure columns + manual-input pin toggle"
```

---

### Task 7: Wire into `ProductionDashboardView` + full-width layout

**Files:**
- Modify: `components/production/ProductionDashboardView.tsx`
- Modify: `components/production/ProductionDashboardView.module.css`
- Test: `tests/components/ProductionDashboardView.test.tsx`

**Interfaces:**
- Consumes: `lineStopsByHour` (Task 3), `HourlyTable`'s new props (Task 6).
- Produces: `ProductionDashboardViewProps` gains `onPinHour?: (hour: string) => void` — consumed by Task 8.

- [ ] **Step 1: Write the failing tests**

In `tests/components/ProductionDashboardView.test.tsx`, add this new `describe` block at the end of the file, after the closing `});` of `describe('ProductionDashboardView export button', ...)`:

```ts
describe('ProductionDashboardView hourly table', () => {
  it('gives the Hourly (Tabel) panel the full-width class', () => {
    render(
      <ToastProvider>
        <ProductionDashboardView state={state} view="bc" onViewChange={() => {}} now={null} />
      </ToastProvider>,
    );
    const panel = screen.getByText('Hourly (Tabel)').closest('section')!;
    expect(panel.className).toMatch(/spanFull/);
  });

  it('gives the OEE per Jam panel the full-width class too', () => {
    render(
      <ToastProvider>
        <ProductionDashboardView state={state} view="bc" onViewChange={() => {}} now={null} />
      </ToastProvider>,
    );
    const panel = screen.getByText('OEE per Jam').closest('section')!;
    expect(panel.className).toMatch(/spanFull/);
  });

  it('forwards a pin-toggle click to onPinHour', async () => {
    const withHour: typeof state = {
      ...state,
      hourlyData: { '07:00': { ok: 5, repair: 0, ng: 0 } },
    };
    const onPinHour = vi.fn();
    render(
      <ToastProvider>
        <ProductionDashboardView
          state={withHour} view="bc" onViewChange={() => {}} now={null}
          onHourlyWindowChange={() => {}} onPinHour={onPinHour}
        />
      </ToastProvider>,
    );
    const button = screen.getByRole('button', { name: 'Arahkan input manual ke jam 07:00' });
    fireEvent.click(button);
    expect(onPinHour).toHaveBeenCalledWith('07:00');
  });

  it("shows a line stop's Item Problem under its hour, via lineStopsByHour", () => {
    const withStop: typeof state = {
      ...state,
      hourlyData: { '07:00': { ok: 5, repair: 0, ng: 0 } },
      lineStops: [{ start: '07:10', end: '07:20', problem: 'Ganti tooling', category: 'AV' }],
    };
    render(
      <ToastProvider>
        <ProductionDashboardView state={withStop} view="bc" onViewChange={() => {}} now={null} />
      </ToastProvider>,
    );
    expect(screen.getByText('Ganti tooling')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/ProductionDashboardView.test.tsx`
Expected: FAIL — the panel doesn't carry `spanFull` yet, there's no pin toggle, and Item Problem isn't wired to `state.lineStops` yet.

- [ ] **Step 3: Add the `onPinHour` prop and `lineStopsByHour` computation**

In `components/production/ProductionDashboardView.tsx`, find the import of `avMinutesByHour`/`peMinutesByHour`:

```ts
import {
  DEFAULT_CYCLE_TIME_SEC, productCycleTime, hourCapacity, windowMinutes, workedMinutesInHour,
  hourlyOee, avMinutesByHour, peMinutesByHour, shiftOee,
} from '@/utils/oee';
```

Replace with:

```ts
import {
  DEFAULT_CYCLE_TIME_SEC, productCycleTime, hourCapacity, windowMinutes, workedMinutesInHour,
  hourlyOee, avMinutesByHour, peMinutesByHour, lineStopsByHour, shiftOee,
} from '@/utils/oee';
```

Find the `ProductionDashboardViewProps` interface's `onHourlyWindowChange` field:

```ts
  onHourlyWindowChange?: (hour: string, win: HourWindow) => void;
```

Replace with:

```ts
  onHourlyWindowChange?: (hour: string, win: HourWindow) => void;
  // Manual hour-pin toggle — omitted (the default) hides the toggle, same
  // gate as onHourlyWindowChange (the live Dashboard passes it once logged in).
  onPinHour?: (hour: string) => void;
```

Find the destructured props:

```ts
export function ProductionDashboardView({
  state, view, onViewChange, now,
  onHourlyWindowChange, hasPhoto, onPhotoBarClick, connectionStatus,
  exportMode = 'print', downloadPdfUrl,
}: ProductionDashboardViewProps) {
```

Replace with:

```ts
export function ProductionDashboardView({
  state, view, onViewChange, now,
  onHourlyWindowChange, onPinHour, hasPhoto, onPhotoBarClick, connectionStatus,
  exportMode = 'print', downloadPdfUrl,
}: ProductionDashboardViewProps) {
```

Find the `lineStops` line:

```ts
  const lineStops = state.lineStops ?? [];
```

Replace with:

```ts
  const lineStops = state.lineStops ?? [];
  const stopsByHour = useMemo(() => lineStopsByHour(lineStops), [lineStops]);
```

- [ ] **Step 4: Wire the new props into `HourlyTable` and swap the panel classes**

Find:

```tsx
        {!hidden.has('hourlyTable') && (
          <section className={`${styles.panel} ${oeeByHour ? styles.spanWide : styles.spanHalf} ${styles.hPareto} ${styles.hourlyTablePanel}`}>
            <div className={styles.panelTitle}>Hourly (Tabel)</div>
            <div className={styles.scrollBody}>
              <HourlyTable
                hourlyData={hourlyData}
                hourlyWindow={hourlyWindow}
                hourlyPlan={hourlyPlan}
                editable={editableHourly}
                onWindowChange={onHourlyWindowChange}
                oee={oeeByHour}
              />
            </div>
          </section>
        )}

        {oeeByHour && !hidden.has('oeeChart') && (
          <section className={`${styles.panel} ${styles.oeeChartPanel} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>OEE per Jam</div>
            <div className={styles.panelBody}><HourlyOeeChart oee={oeeByHour} /></div>
          </section>
        )}
```

Replace with:

```tsx
        {!hidden.has('hourlyTable') && (
          <section className={`${styles.panel} ${styles.spanFull} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Hourly (Tabel)</div>
            <div className={styles.scrollBody}>
              <HourlyTable
                hourlyData={hourlyData}
                hourlyWindow={hourlyWindow}
                hourlyPlan={hourlyPlan}
                lineStopsByHour={stopsByHour}
                editable={editableHourly}
                onWindowChange={onHourlyWindowChange}
                pinnedHour={state.pinnedHour}
                onPinHour={editableHourly ? onPinHour : undefined}
                oee={oeeByHour}
              />
            </div>
          </section>
        )}

        {oeeByHour && !hidden.has('oeeChart') && (
          <section className={`${styles.panel} ${styles.spanFull} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>OEE per Jam</div>
            <div className={styles.panelBody}><HourlyOeeChart oee={oeeByHour} /></div>
          </section>
        )}
```

- [ ] **Step 5: Remove the now-unused CSS classes**

In `components/production/ProductionDashboardView.module.css`, find:

```css
.spanFull  { grid-column: span 12; }
/* Hourly (Tabel): a .spanHalf tile alone (Semua/Cam/Crank, few columns), but
   .spanWide next to the OEE chart on B/C where it carries 10 columns — 2:1 with
   .oeeChartPanel. The print stylesheet always gives it the full width. */
.hourlyTablePanel { grid-column: span 6; }
.spanWide { grid-column: span 8; }
.oeeChartPanel { grid-column: span 4; }
/* Line Stop: a quarter-width tile next to Hourly Production on screen; the print
   stylesheet widens it to the full row. */
.lineStopPanel { grid-column: span 3; }
```

Replace with:

```css
.spanFull  { grid-column: span 12; }
/* Line Stop: a quarter-width tile next to Hourly Production on screen; the print
   stylesheet widens it to the full row. */
.lineStopPanel { grid-column: span 3; }
```

Find:

```css
@media (max-width: 1100px) {
  .spanDonut, .spanHero, .spanList, .oeeChartPanel { grid-column: span 6; }
  .spanHalf, .spanWide { grid-column: span 12; }
}
```

Replace with:

```css
@media (max-width: 1100px) {
  .spanDonut, .spanHero, .spanList { grid-column: span 6; }
  .spanHalf { grid-column: span 12; }
}
```

Find:

```css
  .hourlyTablePanel,
  .lineStopPanel,
  .spanFull { grid-column: 1 / -1 !important; }
```

Replace with:

```css
  .lineStopPanel,
  .spanFull { grid-column: 1 / -1 !important; }
```

Find the comment referencing `.hourlyTablePanel` a few lines below it:

```css
  /* Production Distribution + Hourly Production side by side, 1:1, in their
     own row; Hourly (Tabel) then gets the full-width row right below (see
     .hourlyTablePanel above) so its 24 rows stay legible instead of squeezed
     to half width. */
```

Replace with:

```css
  /* Production Distribution + Hourly Production side by side, 1:1, in their
     own row; Hourly (Tabel) then gets the full-width row right below (see
     .spanFull above) so its 24 rows stay legible instead of squeezed to half
     width. */
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/components/ProductionDashboardView.test.tsx`
Expected: PASS, all 8 tests (4 existing + 4 new).

- [ ] **Step 7: Confirm nothing else references the removed classes**

Run: `grep -rn "spanWide\|oeeChartPanel\|hourlyTablePanel" components/ app/ tests/`
Expected: no output.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add components/production/ProductionDashboardView.tsx components/production/ProductionDashboardView.module.css tests/components/ProductionDashboardView.test.tsx
git commit -m "feat(dashboard): full-width Hourly table, line stops inline, pin-toggle wiring"
```

---

### Task 8: Wire `handlePinHour` into the Dashboard page

**Files:**
- Modify: `app/dashboard/page.tsx`
- Test: `tests/components/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `ProductionDashboardViewProps.onPinHour` (Task 7).

- [ ] **Step 1: Write the failing test**

In `tests/components/DashboardPage.test.tsx`, replace the inline `updateState: vi.fn()` mock with a named one. Find:

```ts
vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({
    state: {
```

Replace with:

```ts
const updateStateMock = vi.fn();
vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({
    state: {
```

Find the end of that mock's returned object:

```ts
    isFetching: false,
    isError: false,
    updateState: vi.fn(),
  }),
}));
```

Replace with:

```ts
    isFetching: false,
    isError: false,
    updateState: updateStateMock,
  }),
}));
```

Find the `beforeEach`:

```ts
describe('DashboardPage', () => {
  beforeEach(() => {
    mockAuth.authed = false;
  });
```

Replace with:

```ts
describe('DashboardPage', () => {
  beforeEach(() => {
    mockAuth.authed = false;
    updateStateMock.mockClear();
  });
```

Add this test at the end of the `describe('DashboardPage', ...)` block, right before the closing `});`:

```ts
  it("toggles pinnedHour when a row's pin button is clicked while logged in", async () => {
    mockAuth.authed = true;
    render(<ToastProvider><DashboardPage /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    await userEvent.click(screen.getByRole('button', { name: 'Arahkan input manual ke jam 09:00' }));
    expect(updateStateMock).toHaveBeenCalledWith(expect.objectContaining({ pinnedHour: '09:00' }));
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/DashboardPage.test.tsx`
Expected: FAIL — no pin button exists on the page yet (`onPinHour` isn't wired).

- [ ] **Step 3: Implement `handlePinHour`**

In `app/dashboard/page.tsx`, find:

```ts
  // Plant-wide worked window, so it writes the same `hourlyWindow` map from any
  // view. Never write before the running shift has loaded — that would POST
  // EMPTY_STATE over live data (mirrors the Input page's load gate).
  function handleHourlyWindow(hour: string, win: HourWindow) {
    if (!state) return;
    updateState({ ...state, hourlyWindow: { ...(state.hourlyWindow ?? {}), [hour]: win } });
  }
```

Replace with:

```ts
  // Plant-wide worked window, so it writes the same `hourlyWindow` map from any
  // view. Never write before the running shift has loaded — that would POST
  // EMPTY_STATE over live data (mirrors the Input page's load gate).
  function handleHourlyWindow(hour: string, win: HourWindow) {
    if (!state) return;
    updateState({ ...state, hourlyWindow: { ...(state.hourlyWindow ?? {}), [hour]: win } });
  }

  // Toggles which hour manual OK/Repair/NG input attributes to (see
  // useHourlySnapshot). Exclusive: pinning a new hour replaces any existing
  // pin; pinning the already-pinned hour clears it back to real-time.
  function handlePinHour(hour: string) {
    if (!state) return;
    updateState({ ...state, pinnedHour: state.pinnedHour === hour ? '' : hour });
  }
```

Find:

```tsx
        onHourlyWindowChange={authed ? handleHourlyWindow : undefined}
```

Replace with:

```tsx
        onHourlyWindowChange={authed ? handleHourlyWindow : undefined}
        onPinHour={authed ? handlePinHour : undefined}
```

Find `EMPTY_STATE`'s `entryLogs`/`lineStops` line:

```ts
  entryLogs: [], lineStops: [], savedAt: '',
};
```

Replace with:

```ts
  entryLogs: [], lineStops: [], pinnedHour: '', savedAt: '',
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/components/DashboardPage.test.tsx`
Expected: PASS, all tests (16 existing + 1 new = 17).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx tests/components/DashboardPage.test.tsx
git commit -m "feat(dashboard): wire the manual-input pin toggle to production state"
```

---

### Task 9: Input-page banner when an hour is pinned

**Files:**
- Modify: `app/input/page.tsx`
- Modify: `app/input/page.module.css`
- Test: `tests/components/InputPage.test.tsx`

**Interfaces:**
- Consumes: `ProductionState.pinnedHour` (Task 1).

- [ ] **Step 1: Write the failing tests**

In `tests/components/InputPage.test.tsx`, add these tests at the end of the `describe('InputPage', ...)` block, right before the closing `});`:

```ts
  it('shows no pinned-hour banner by default (real-time input)', () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.queryByText(/input diarahkan ke jam/i)).not.toBeInTheDocument();
  });

  it('shows a banner naming the pinned hour when one is set', () => {
    hookReturn = { state: { ...stateMock, pinnedHour: '09:00' }, updateState: updateStateMock, isLoading: false };
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByText(/input diarahkan ke jam 09:00/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify the second one fails**

Run: `npx vitest run tests/components/InputPage.test.tsx`
Expected: the first new test passes already (no banner exists at all yet); the second FAILS — no banner text is rendered.

- [ ] **Step 3: Implement the banner**

In `app/input/page.tsx`, find:

```tsx
  return (
    <main className={styles.page}>
      <div className={styles.topRow}>
```

Replace with:

```tsx
  return (
    <main className={styles.page}>
      {current.pinnedHour && (
        <div className={styles.pinnedBanner}>
          Input diarahkan ke jam {current.pinnedHour}, bukan jam real-time. Matikan dari tabel Hourly di Dashboard jika sudah selesai.
        </div>
      )}
      <div className={styles.topRow}>
```

- [ ] **Step 4: Add the banner's CSS**

In `app/input/page.module.css`, find:

```css
.topRow {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}
```

Add right before it:

```css
.pinnedBanner {
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  background: var(--accent-orange-soft, rgba(245, 158, 11, 0.15));
  color: var(--accent-orange);
  font-size: 13px;
  font-weight: 600;
}

.topRow {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/InputPage.test.tsx`
Expected: PASS, every test in the file.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/input/page.tsx app/input/page.module.css tests/components/InputPage.test.tsx
git commit -m "feat(input): banner when manual input is pinned to a specific hour"
```

---

### Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: every test file passes, including every test added/modified across Tasks 1-9.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: builds cleanly; no new routes (this feature adds no pages/API routes, only components/hooks/utils).

- [ ] **Step 4: Report the pending manual migration**

Tell the user to run the migration against the live database themselves,
once every task above is committed:

```bash
node --env-file=.env.local scripts/migrate-pinned-hour.mjs
```

(Same reasoning as every other schema change in this project — this
modifies the production database, so it's the user's call to run it, not
something to run automatically.)
