# Suspect Defect Line — Master Data + Dashboard Pareto-by-Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable master-data mapping of (foundry process line → suspect defect names) and a new Dashboard chart that aggregates NG counts by suspect line, with percentages and a per-defect-type tooltip breakdown.

**Architecture:** New Postgres table `defect_lines` (many rows per line, since one defect name can be suspect for several lines) behind a `lib/defectLines.ts` CRUD module and two API routes, mirroring the existing `lib/defectPhotos.ts` pattern exactly. A pure `utils/defectLines.ts` module does the name-matching and per-line aggregation, consumed by a new `LineParetoChart` component. A new `/master-data` page (gated the same way `/input`/`/history` already are) lets the plant edit the list; the Dashboard reads it read-only.

**Tech Stack:** Next.js App Router, Neon Postgres (`@neondatabase/serverless`), TanStack Query, Chart.js via `react-chartjs-2`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-12-defect-line-master-data-design.md`

## Global Constraints

- The four line names are fixed: `Melting`, `Moulding`, `Core Making`, `Finishing` — not user-editable in this pass.
- Name matching: lowercase both strings, strip all whitespace, then check bidirectional `includes` (neither exact-match-only nor a constrained picker).
- A defect matching multiple lines is counted in full for every matching line (no splitting) when aggregating for the chart.
- Chart percentage = each line's total ÷ the sum of all 4 line totals (not ÷ raw NG total), so the 4 percentages always sum to 100%.
- The chart applies to every Dashboard view (Semua/B/C/Camshaft/Crankshaft) — no product-group gating.
- `/master-data` is reachable only when logged in, exactly like `/input` and `/history` (same single login, no new role).
- `DEFECT_LINE_NAMES` / `DefectLineName` / `DefectLineMapping` live in `lib/types.ts` (no `sql` import), never in `lib/defectLines.ts` (which imports `sql` at module scope) — so client-side files may only ever `import type` from `lib/defectLines.ts`, matching how `PhotoGroup`/`PHOTO_GROUPS` already split across `lib/defectPhotos.ts` (server-only value) today.

---

### Task 1: Database schema + seed migration

**Files:**
- Modify: `lib/schema.sql` (append near the end, before the final `INSERT INTO production_state` statement)
- Create: `scripts/migrate-defect-lines.mjs`

**Interfaces:**
- Produces: table `defect_lines(id SERIAL, line TEXT, defect_name TEXT, UNIQUE(line, defect_name))`, seeded with 23 rows.

- [ ] **Step 1: Add the table + seed to `lib/schema.sql`**

Open `lib/schema.sql`. Find this block near the end of the file:

```sql
-- Current-defect photo per Pareto chart (NG/Repair) x product group (bc/
```

Insert the following immediately **before** that line:

```sql
-- Suspect defect line master data: which foundry process stage(s) a given
-- defect name is suspected to come from. Many-to-many — one row per
-- (line, defect_name) pair, since e.g. "Gas Hole" is suspect for three
-- different lines at once.
CREATE TABLE IF NOT EXISTS defect_lines (
  id          SERIAL PRIMARY KEY,
  line        TEXT NOT NULL,
  defect_name TEXT NOT NULL,
  UNIQUE (line, defect_name)
);

INSERT INTO defect_lines (line, defect_name) VALUES
  ('Melting', 'Kandama'), ('Melting', 'Yuzakai'), ('Melting', 'Pinhole'),
  ('Melting', 'Gas Hole'), ('Melting', 'Ireboshi'), ('Melting', 'Dross'),
  ('Moulding', 'Dakon'), ('Moulding', 'Youmouyo'), ('Moulding', 'Gomi'),
  ('Moulding', 'Ihada'), ('Moulding', 'Kake'), ('Moulding', 'Kataochi'),
  ('Moulding', 'Mikui'), ('Moulding', 'Crack'), ('Moulding', 'Gas Hole'),
  ('Core Making', 'Mejashi'), ('Core Making', 'Vinning'), ('Core Making', 'Gyakubari'),
  ('Core Making', 'Gomi'), ('Core Making', 'Togata Tare'), ('Core Making', 'Gas Hole'),
  ('Finishing', 'Kake'), ('Finishing', 'Tsurikomi')
ON CONFLICT (line, defect_name) DO NOTHING;
```

- [ ] **Step 2: Create the one-off migration script for the live database**

Create `scripts/migrate-defect-lines.mjs`:

```js
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
```

- [ ] **Step 3: Verify the script is syntactically valid**

Run: `node --check scripts/migrate-defect-lines.mjs`
Expected: no output (exit code 0). This only checks syntax — do **not** run the script against the real database yourself; tell the user to run it (it needs their `.env.local`).

- [ ] **Step 4: Commit**

```bash
git add lib/schema.sql scripts/migrate-defect-lines.mjs
git commit -m "feat(db): defect_lines table + seed for Suspect Defect Line master data"
```

---

### Task 2: Shared types + `lib/defectLines.ts` CRUD

**Files:**
- Modify: `lib/types.ts` (append at end of file)
- Create: `lib/defectLines.ts`
- Test: `tests/unit/lib/defectLines.test.ts`

**Interfaces:**
- Consumes: `sql` from `./db` (existing, used exactly like `lib/defectPhotos.ts` does).
- Produces:
  - `lib/types.ts`: `export const DEFECT_LINE_NAMES = ['Melting', 'Moulding', 'Core Making', 'Finishing'] as const;`, `export type DefectLineName = (typeof DEFECT_LINE_NAMES)[number];`, `export interface DefectLineMapping { id: number; line: DefectLineName; defectName: string; }`
  - `lib/defectLines.ts`: `isDefectLineName(value: string): value is DefectLineName`, `listDefectLines(): Promise<DefectLineMapping[]>`, `addDefectLine(line: DefectLineName, defectName: string): Promise<void>`, `deleteDefectLine(id: number): Promise<void>`

- [ ] **Step 1: Add the shared types to `lib/types.ts`**

Append to the end of `lib/types.ts` (after the existing `export interface HistoryRecord extends ProductionState { id: number; }`):

```ts

// Suspect Defect Line master data — which foundry process stage(s) a defect
// name is suspected to originate from. Many-to-many (see defect_lines table);
// the four line names themselves are fixed, not part of the editable data.
export const DEFECT_LINE_NAMES = ['Melting', 'Moulding', 'Core Making', 'Finishing'] as const;
export type DefectLineName = (typeof DEFECT_LINE_NAMES)[number];

export interface DefectLineMapping {
  id: number;
  line: DefectLineName;
  defectName: string;
}
```

- [ ] **Step 2: Write the failing test for `lib/defectLines.ts`**

Create `tests/unit/lib/defectLines.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { isDefectLineName, listDefectLines, addDefectLine, deleteDefectLine } from '@/lib/defectLines';

describe('isDefectLineName', () => {
  it('accepts only the four fixed line names', () => {
    expect(isDefectLineName('Melting')).toBe(true);
    expect(isDefectLineName('Moulding')).toBe(true);
    expect(isDefectLineName('Core Making')).toBe(true);
    expect(isDefectLineName('Finishing')).toBe(true);
    expect(isDefectLineName('Casting')).toBe(false);
  });
});

describe('listDefectLines', () => {
  beforeEach(() => mockSql.mockReset());

  it('maps rows to camelCase mappings', async () => {
    mockSql.mockResolvedValueOnce([
      { id: 1, line: 'Melting', defect_name: 'Kandama' },
      { id: 2, line: 'Moulding', defect_name: 'Gomi' },
    ]);
    const result = await listDefectLines();
    expect(result).toEqual([
      { id: 1, line: 'Melting', defectName: 'Kandama' },
      { id: 2, line: 'Moulding', defectName: 'Gomi' },
    ]);
  });

  it('returns an empty array when the table is empty', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await listDefectLines()).toEqual([]);
  });
});

describe('addDefectLine', () => {
  beforeEach(() => mockSql.mockReset());

  it('rejects an empty defect name without touching the database', async () => {
    await expect(addDefectLine('Melting', '   ')).rejects.toThrow('wajib diisi');
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('inserts a trimmed defect name under the given line', async () => {
    mockSql.mockResolvedValueOnce([]);
    await addDefectLine('Melting', '  Yuzakai  ');
    expect(mockSql).toHaveBeenCalledTimes(1);
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain('Melting');
    expect(values).toContain('Yuzakai');
  });

  it('propagates a duplicate-key error from the database', async () => {
    mockSql.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));
    await expect(addDefectLine('Melting', 'Kandama')).rejects.toThrow('duplicate key');
  });
});

describe('deleteDefectLine', () => {
  beforeEach(() => mockSql.mockReset());

  it('deletes by id', async () => {
    mockSql.mockResolvedValueOnce([]);
    await deleteDefectLine(7);
    expect(mockSql).toHaveBeenCalledTimes(1);
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain(7);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/lib/defectLines.test.ts`
Expected: FAIL — `Cannot find module '@/lib/defectLines'`.

- [ ] **Step 4: Implement `lib/defectLines.ts`**

Create `lib/defectLines.ts`:

```ts
import { sql } from './db';
import { DEFECT_LINE_NAMES, type DefectLineName, type DefectLineMapping } from './types';

export function isDefectLineName(value: string): value is DefectLineName {
  return (DEFECT_LINE_NAMES as readonly string[]).includes(value);
}

export async function listDefectLines(): Promise<DefectLineMapping[]> {
  const rows = (await sql`
    SELECT id, line, defect_name FROM defect_lines ORDER BY line, defect_name
  `) as { id: number; line: string; defect_name: string }[];
  return rows.map((row) => ({ id: row.id, line: row.line as DefectLineName, defectName: row.defect_name }));
}

export async function addDefectLine(line: DefectLineName, defectName: string): Promise<void> {
  const trimmed = defectName.trim();
  if (!trimmed) {
    throw new Error('Nama defect wajib diisi');
  }
  await sql`INSERT INTO defect_lines (line, defect_name) VALUES (${line}, ${trimmed})`;
}

export async function deleteDefectLine(id: number): Promise<void> {
  await sql`DELETE FROM defect_lines WHERE id = ${id}`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/lib/defectLines.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/defectLines.ts tests/unit/lib/defectLines.test.ts
git commit -m "feat(db): lib/defectLines.ts CRUD for Suspect Defect Line master data"
```

---

### Task 3: API routes

**Files:**
- Create: `app/api/defect-lines/route.ts`
- Create: `app/api/defect-lines/[id]/route.ts`
- Test: `tests/unit/api/defect-lines.test.ts`

**Interfaces:**
- Consumes: `listDefectLines`, `addDefectLine`, `deleteDefectLine`, `isDefectLineName` from `@/lib/defectLines` (Task 2).
- Produces: `GET /api/defect-lines` → `{ success, data: DefectLineMapping[] }`; `POST /api/defect-lines` body `{ line, defectName }` → `{ success }` or `{ success: false, error }`; `DELETE /api/defect-lines/:id` → `{ success }` or `{ success: false, error }`.

- [ ] **Step 1: Write the failing test for the top-level route**

Create `tests/unit/api/defect-lines.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockList = vi.fn();
const mockAdd = vi.fn();
vi.mock('@/lib/defectLines', () => ({
  listDefectLines: (...args: any[]) => mockList(...args),
  addDefectLine: (...args: any[]) => mockAdd(...args),
  isDefectLineName: (value: string) => ['Melting', 'Moulding', 'Core Making', 'Finishing'].includes(value),
}));

import { GET, POST } from '@/app/api/defect-lines/route';

describe('GET /api/defect-lines', () => {
  beforeEach(() => { mockList.mockReset(); mockAdd.mockReset(); });

  it('returns the list wrapped in a success envelope', async () => {
    mockList.mockResolvedValueOnce([{ id: 1, line: 'Melting', defectName: 'Kandama' }]);
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ success: true, data: [{ id: 1, line: 'Melting', defectName: 'Kandama' }] });
  });

  it('returns a 500 error envelope when the DB call throws', async () => {
    mockList.mockRejectedValueOnce(new Error('connection refused'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'connection refused' });
  });
});

describe('POST /api/defect-lines', () => {
  beforeEach(() => { mockList.mockReset(); mockAdd.mockReset(); });

  it('adds a defect line and returns success', async () => {
    mockAdd.mockResolvedValueOnce(undefined);
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Melting', defectName: 'Yuzakai' }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(json).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledWith('Melting', 'Yuzakai');
  });

  it('rejects a line that is not one of the four fixed names', async () => {
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Casting', defectName: 'Yuzakai' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('rejects a missing defectName', async () => {
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Melting', defectName: '' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('returns a 400 error envelope when addDefectLine throws (e.g. duplicate)', async () => {
    mockAdd.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));
    const request = new NextRequest('http://localhost/api/defect-lines', {
      method: 'POST',
      body: JSON.stringify({ line: 'Melting', defectName: 'Kandama' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/api/defect-lines.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/defect-lines/route'`.

- [ ] **Step 3: Implement `app/api/defect-lines/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { listDefectLines, addDefectLine, isDefectLineName } from '@/lib/defectLines';

// Reference data edited rarely by hand — no polling concern like
// defect-photos has, but force-dynamic keeps a plain GET from being cached
// right after an edit, matching every other data route in this app.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await listDefectLines();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const line = typeof body?.line === 'string' ? body.line : '';
    const defectName = typeof body?.defectName === 'string' ? body.defectName : '';
    if (!isDefectLineName(line)) {
      return NextResponse.json({ success: false, error: 'Line tidak valid' }, { status: 400 });
    }
    if (!defectName.trim()) {
      return NextResponse.json({ success: false, error: 'Nama defect wajib diisi' }, { status: 400 });
    }
    await addDefectLine(line, defectName);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/api/defect-lines.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Implement the DELETE route (no dedicated test — matches this codebase's existing convention of not unit-testing dynamic `[id]` routes, e.g. `app/api/history/[id]/restore/route.ts` and `app/api/defect-photos/[group]/[chartType]/route.ts` have none either; coverage comes from `lib/defectLines.test.ts` plus the Task 7 page test)**

Create `app/api/defect-lines/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { deleteDefectLine } from '@/lib/defectLines';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: 'Id tidak valid' }, { status: 400 });
  }
  try {
    await deleteDefectLine(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/defect-lines tests/unit/api/defect-lines.test.ts
git commit -m "feat(api): GET/POST /api/defect-lines, DELETE /api/defect-lines/:id"
```

---

### Task 4: Matching + aggregation logic (`utils/defectLines.ts`)

**Files:**
- Create: `utils/defectLines.ts`
- Test: `tests/unit/utils/defectLines.test.ts`

**Interfaces:**
- Consumes: `DEFECT_LINE_NAMES`, `DefectLineName`, `DefectLineMapping` (`import type`) from `@/lib/types` (Task 2).
- Produces: `matchesDefectLine(defectType: string, masterName: string): boolean`; `interface LineParetoBreakdownItem { type: string; count: number; percent: number }`; `interface LineParetoBar { line: DefectLineName; total: number; percent: number; breakdown: LineParetoBreakdownItem[] }`; `paretoByLine(defectData: Record<string, number>, mappings: DefectLineMapping[]): LineParetoBar[]` (always returns exactly 4 bars, in `DEFECT_LINE_NAMES` order).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/utils/defectLines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { DefectLineMapping } from '@/lib/types';
import { matchesDefectLine, paretoByLine } from '@/utils/defectLines';

describe('matchesDefectLine', () => {
  it('matches case-insensitively', () => {
    expect(matchesDefectLine('KANDAMA FRONT', 'kandama')).toBe(true);
  });

  it('matches when the master name has no space but the real type does (the "Pinhole" case)', () => {
    expect(matchesDefectLine('Pin Hole Cope', 'Pinhole')).toBe(true);
  });

  it('matches bidirectionally — a longer master name against a shorter real type', () => {
    expect(matchesDefectLine('Kandama', 'Kandama Front')).toBe(true);
  });

  it('does not match unrelated names', () => {
    expect(matchesDefectLine('Crack', 'Kandama')).toBe(false);
  });
});

describe('paretoByLine', () => {
  it('always returns exactly 4 bars, in Melting/Moulding/Core Making/Finishing order', () => {
    const bars = paretoByLine({}, []);
    expect(bars.map((b) => b.line)).toEqual(['Melting', 'Moulding', 'Core Making', 'Finishing']);
  });

  it('counts a defect matching multiple lines in full for each line', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, line: 'Moulding', defectName: 'Gas Hole' },
    ];
    const bars = paretoByLine({ 'Gas Hole Cope': 10 }, mappings);
    const melting = bars.find((b) => b.line === 'Melting')!;
    const moulding = bars.find((b) => b.line === 'Moulding')!;
    expect(melting.total).toBe(10);
    expect(moulding.total).toBe(10);
  });

  it('computes each line percent as its share of the sum of all 4 line totals', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, line: 'Moulding', defectName: 'Gas Hole' },
    ];
    const bars = paretoByLine({ 'Gas Hole Cope': 10 }, mappings);
    const percents = Object.fromEntries(bars.map((b) => [b.line, b.percent]));
    expect(percents).toEqual({ Melting: 50, Moulding: 50, 'Core Making': 0, Finishing: 0 });
  });

  it('gives a zero-match line a 0 total and 0 percent, not an omitted bar', () => {
    const mappings: DefectLineMapping[] = [{ id: 1, line: 'Melting', defectName: 'Kandama' }];
    const bars = paretoByLine({ 'Kandama Front': 5 }, mappings);
    const finishing = bars.find((b) => b.line === 'Finishing')!;
    expect(finishing.total).toBe(0);
    expect(finishing.percent).toBe(0);
    expect(finishing.breakdown).toEqual([]);
  });

  it('is all zeros when there are no mappings at all', () => {
    const bars = paretoByLine({ 'Kandama Front': 5 }, []);
    expect(bars.every((b) => b.total === 0 && b.percent === 0)).toBe(true);
  });

  it('breaks a line total down by contributing defect type, sorted by count descending, with its own percent of that line', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, line: 'Melting', defectName: 'Kandama' },
      { id: 2, line: 'Melting', defectName: 'Gas Hole' },
    ];
    const bars = paretoByLine({ 'Kandama Front': 10, 'Gas Hole Cope': 30 }, mappings);
    const melting = bars.find((b) => b.line === 'Melting')!;
    expect(melting.total).toBe(40);
    expect(melting.breakdown).toEqual([
      { type: 'Gas Hole Cope', count: 30, percent: 75 },
      { type: 'Kandama Front', count: 10, percent: 25 },
    ]);
  });

  it('ignores a defectData entry with a zero or negative count', () => {
    const mappings: DefectLineMapping[] = [{ id: 1, line: 'Melting', defectName: 'Kandama' }];
    const bars = paretoByLine({ 'Kandama Front': 0 }, mappings);
    const melting = bars.find((b) => b.line === 'Melting')!;
    expect(melting.total).toBe(0);
    expect(melting.breakdown).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/utils/defectLines.test.ts`
Expected: FAIL — `Cannot find module '@/utils/defectLines'`.

- [ ] **Step 3: Implement `utils/defectLines.ts`**

```ts
import { DEFECT_LINE_NAMES, type DefectLineMapping, type DefectLineName } from '@/lib/types';

// Master-data names are short/generic ("Kandama"); logged defect types are
// the full DEFECT_TYPES/SHAFT_DEFECT_TYPES strings ("Kandama Front"). Strip
// whitespace (not just lowercase) so a one-word master entry like "Pinhole"
// still matches "Pin Hole Cope" — a heuristic, not a guarantee; a mismatch
// is fixed by editing the master-data spelling, not by changing this code.
export function matchesDefectLine(defectType: string, masterName: string): boolean {
  const a = defectType.toLowerCase().replace(/\s+/g, '');
  const b = masterName.toLowerCase().replace(/\s+/g, '');
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export interface LineParetoBreakdownItem {
  type: string;
  count: number;
  // This type's share of its own line's total (not the grand total).
  percent: number;
}

export interface LineParetoBar {
  line: DefectLineName;
  total: number;
  // This line's share of the sum of all 4 bars' totals — always sums to
  // 100 across the 4 bars, even though `total` itself can double-count a
  // defect that's suspect for more than one line.
  percent: number;
  breakdown: LineParetoBreakdownItem[];
}

/**
 * Aggregates a shift's `defectData` (defect type -> pcs, the same shape
 * ParetoChart consumes) into one bar per fixed suspect line. A defect
 * matching several lines' master data is counted in full for each —
 * deliberately, this is a "which line to go inspect" view, not an exclusive
 * root-cause split.
 */
export function paretoByLine(
  defectData: Record<string, number>,
  mappings: DefectLineMapping[],
): LineParetoBar[] {
  const bars: LineParetoBar[] = DEFECT_LINE_NAMES.map((line) => {
    const namesForLine = mappings.filter((m) => m.line === line).map((m) => m.defectName);
    const breakdown: LineParetoBreakdownItem[] = [];
    let total = 0;
    for (const [type, count] of Object.entries(defectData)) {
      if (count <= 0) continue;
      if (namesForLine.some((name) => matchesDefectLine(type, name))) {
        breakdown.push({ type, count, percent: 0 });
        total += count;
      }
    }
    breakdown.sort((a, b) => b.count - a.count);
    for (const item of breakdown) {
      item.percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
    }
    return { line, total, percent: 0, breakdown };
  });

  const grandTotal = bars.reduce((sum, bar) => sum + bar.total, 0);
  for (const bar of bars) {
    bar.percent = grandTotal > 0 ? Math.round((bar.total / grandTotal) * 100) : 0;
  }
  return bars;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/utils/defectLines.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add utils/defectLines.ts tests/unit/utils/defectLines.test.ts
git commit -m "feat(charts): utils/defectLines.ts name matching + per-line Pareto aggregation"
```

---

### Task 5: `hooks/useDefectLines.ts`

**Files:**
- Create: `hooks/useDefectLines.ts`

No dedicated test file — this codebase does not unit-test its TanStack Query hooks in isolation (`hooks/useDefectPhotos.ts`, `hooks/useReset.ts`, `hooks/useRestoreHistory.ts` have none either); coverage comes from the Task 7 and Task 9 component tests, which mock this module.

**Interfaces:**
- Consumes: `DefectLineMapping`, `DefectLineName` (`import type`) from `@/lib/types`.
- Produces: `useDefectLines(): { mappings: DefectLineMapping[]; isLoading: boolean }`; `useAddDefectLine(): { mutate: (vars: { line: DefectLineName; defectName: string }, opts?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => void }`; `useDeleteDefectLine(): { mutate: (id: number, opts?: { onError?: (err: unknown) => void }) => void }`.

- [ ] **Step 1: Implement `hooks/useDefectLines.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DefectLineMapping, DefectLineName } from '@/lib/types';

interface ListResponse {
  success: boolean;
  data: DefectLineMapping[];
  error?: string;
}

const DEFECT_LINES_KEY = ['defectLines'] as const;

async function fetchDefectLines(): Promise<DefectLineMapping[]> {
  const res = await fetch('/api/defect-lines', { cache: 'no-store' });
  const json: ListResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Gagal memuat master data defect');
  return json.data;
}

// Reference data edited rarely by an admin, not live shift data — a plain
// query with no polling interval, unlike useDefectPhotoFlags.
export function useDefectLines() {
  const query = useQuery({ queryKey: DEFECT_LINES_KEY, queryFn: fetchDefectLines });
  return { mappings: query.data ?? [], isLoading: query.isLoading };
}

export function useAddDefectLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ line, defectName }: { line: DefectLineName; defectName: string }) => {
      const res = await fetch('/api/defect-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, defectName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal menambah defect');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFECT_LINES_KEY }),
  });
}

export function useDeleteDefectLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/defect-lines/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal menghapus defect');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFECT_LINES_KEY }),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useDefectLines.ts
git commit -m "feat(hooks): useDefectLines query + add/delete mutations"
```

---

### Task 6: `LineParetoChart` component

**Files:**
- Create: `components/production/LineParetoChart.tsx`
- Test: `tests/components/LineParetoChart.test.tsx`

**Interfaces:**
- Consumes: `LineParetoBar` (`import type`) from `@/utils/defectLines` (Task 4); `useChartTheme` from `@/hooks/useTheme` (existing).
- Produces: `<LineParetoChart bars={LineParetoBar[]} />` (expects exactly the 4 bars `paretoByLine` returns, in order).

- [ ] **Step 1: Write the failing test**

Create `tests/components/LineParetoChart.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { LineParetoChart } from '@/components/production/LineParetoChart';
import type { LineParetoBar } from '@/utils/defectLines';

const bars: LineParetoBar[] = [
  { line: 'Melting', total: 10, percent: 50, breakdown: [{ type: 'Gas Hole Cope', count: 10, percent: 100 }] },
  { line: 'Moulding', total: 10, percent: 50, breakdown: [{ type: 'Gas Hole Drag', count: 10, percent: 100 }] },
  { line: 'Core Making', total: 0, percent: 0, breakdown: [] },
  { line: 'Finishing', total: 0, percent: 0, breakdown: [] },
];

describe('LineParetoChart', () => {
  beforeEach(() => chartSpy.mockClear());

  it('draws one bar per fixed line, in order, height = that line\'s percent share', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.data.labels).toEqual(['Melting', 'Moulding', 'Core Making', 'Finishing']);
    expect(props.data.datasets[0].data).toEqual([50, 50, 0, 0]);
  });

  it('y axis ticks render as percentages', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.scales.y.ticks.callback(50)).toBe('50%');
  });

  it('tooltip label shows the line total and percent', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.tooltip.callbacks.label({ dataIndex: 0 })).toBe('10 pcs (50%)');
  });

  it('tooltip afterLabel breaks the line down by contributing defect type, each with its own percent', () => {
    const withBreakdown: LineParetoBar[] = [
      {
        line: 'Melting', total: 40, percent: 100,
        breakdown: [
          { type: 'Gas Hole Cope', count: 30, percent: 75 },
          { type: 'Kandama Front', count: 10, percent: 25 },
        ],
      },
      bars[1], bars[2], bars[3],
    ];
    render(<LineParetoChart bars={withBreakdown} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.tooltip.callbacks.afterLabel({ dataIndex: 0 })).toEqual([
      'Gas Hole Cope: 30 pcs (75%)',
      'Kandama Front: 10 pcs (25%)',
    ]);
  });

  it('datalabel shows the pcs count above each bar', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.datalabels.formatter(50, { dataIndex: 0 })).toBe('10 pcs');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/LineParetoChart.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/LineParetoChart'`.

- [ ] **Step 3: Implement `components/production/LineParetoChart.tsx`**

```tsx
'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import { useChartTheme } from '@/hooks/useTheme';
import type { LineParetoBar } from '@/utils/defectLines';

// One fixed colour per line (not a Pareto ranking gradient — these are 4
// fixed categories, not sorted by size).
const LINE_COLORS: Record<string, string> = {
  Melting: '#dc2626',
  Moulding: '#3b82f6',
  'Core Making': '#22c55e',
  Finishing: '#a855f7',
};

interface LineParetoChartProps {
  bars: LineParetoBar[];
}

// Fixed 4-bar chart: one bar per foundry process line, height = that line's
// share of the 4-bar total. Unlike ParetoChart (one bar per defect type,
// tallest first), the category set and order here never change.
export function LineParetoChart({ bars }: LineParetoChartProps) {
  const ct = useChartTheme();
  const labels = bars.map((b) => b.line);
  const data = bars.map((b) => b.percent);
  const colors = bars.map((b) => LINE_COLORS[b.line] ?? '#94a3b8');

  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [{ type: 'bar' as const, data, backgroundColor: colors, borderRadius: 4 }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: { dataIndex: number }) => {
                const bar = bars[c.dataIndex];
                return `${bar.total} pcs (${bar.percent}%)`;
              },
              afterLabel: (c: { dataIndex: number }) => {
                const bar = bars[c.dataIndex];
                return bar.breakdown.map((item) => `${item.type}: ${item.count} pcs (${item.percent}%)`);
              },
            },
          },
          datalabels: {
            display: true,
            color: ct.label,
            anchor: 'end',
            align: 'top',
            offset: 2,
            font: { weight: 'bold', size: 11 },
            formatter: (_v: number, c: { dataIndex: number }) => `${bars[c.dataIndex].total} pcs`,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: ct.tick, font: { size: 10 } } },
          y: {
            beginAtZero: true,
            max: 100,
            grace: '15%',
            grid: { color: ct.grid },
            ticks: { color: ct.tick, callback: (v: number) => `${v}%` },
          },
        },
      }}
    />
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/components/LineParetoChart.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/production/LineParetoChart.tsx tests/components/LineParetoChart.test.tsx
git commit -m "feat(dashboard): LineParetoChart — 4-bar suspect-line chart with breakdown tooltip"
```

---

### Task 7: `/master-data` page

**Files:**
- Create: `app/master-data/page.tsx`
- Create: `app/master-data/page.module.css`
- Test: `tests/components/MasterDataPage.test.tsx`

**Interfaces:**
- Consumes: `useDefectLines`, `useAddDefectLine`, `useDeleteDefectLine` from `@/hooks/useDefectLines` (Task 5); `DEFECT_LINE_NAMES`, `DefectLineName` from `@/lib/types`; `useToast` from `@/components/ui/ToastProvider` (existing).
- Produces: the `/master-data` route (default export `MasterDataPage`).

- [ ] **Step 1: Write the failing test**

Create `tests/components/MasterDataPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMappings = [
  { id: 1, line: 'Melting', defectName: 'Kandama' },
  { id: 2, line: 'Moulding', defectName: 'Gomi' },
];
const addMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({ mappings: mockMappings, isLoading: false }),
  useAddDefectLine: () => ({ mutate: addMutate }),
  useDeleteDefectLine: () => ({ mutate: deleteMutate }),
}));
const mockShowToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import MasterDataPage from '@/app/master-data/page';

describe('MasterDataPage', () => {
  beforeEach(() => {
    addMutate.mockClear();
    deleteMutate.mockClear();
    mockShowToast.mockClear();
  });

  it('renders all four fixed line columns', () => {
    render(<MasterDataPage />);
    expect(screen.getByText('Melting')).toBeInTheDocument();
    expect(screen.getByText('Moulding')).toBeInTheDocument();
    expect(screen.getByText('Core Making')).toBeInTheDocument();
    expect(screen.getByText('Finishing')).toBeInTheDocument();
  });

  it('lists each defect under its own line', () => {
    render(<MasterDataPage />);
    expect(screen.getByText('Kandama')).toBeInTheDocument();
    expect(screen.getByText('Gomi')).toBeInTheDocument();
  });

  it('adds a defect name typed into a specific line\'s input', async () => {
    render(<MasterDataPage />);
    const input = screen.getByRole('textbox', { name: 'Tambah defect untuk Melting' });
    await userEvent.type(input, 'Yuzakai');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Melting' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ line: 'Melting', defectName: 'Yuzakai' });
  });

  it('does not add an empty defect name', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Melting' }));
    expect(addMutate).not.toHaveBeenCalled();
  });

  it('deletes a defect by its id via its own delete button', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Kandama' }));
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate.mock.calls[0][0]).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/MasterDataPage.test.tsx`
Expected: FAIL — `Cannot find module '@/app/master-data/page'`.

- [ ] **Step 3: Implement `app/master-data/page.module.css`**

```css
.page {
  padding: 24px 32px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 20px;
  color: var(--text-primary);
}

.columns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.column {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
}

.columnTitle {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
}

.deleteButton {
  border: none;
  background: transparent;
  color: var(--accent-red);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.addRow {
  display: flex;
  gap: 8px;
}

.addButton {
  padding: 8px 14px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: var(--accent-red);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .columns { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Implement `app/master-data/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useDefectLines, useAddDefectLine, useDeleteDefectLine } from '@/hooks/useDefectLines';
import { useToast } from '@/components/ui/ToastProvider';
import { DEFECT_LINE_NAMES } from '@/lib/types';
import type { DefectLineName } from '@/lib/types';
import modalStyles from '@/components/production/EntryModal.module.css';
import styles from './page.module.css';

type Drafts = Record<DefectLineName, string>;

const EMPTY_DRAFTS: Drafts = { Melting: '', Moulding: '', 'Core Making': '', Finishing: '' };

export default function MasterDataPage() {
  const { mappings, isLoading } = useDefectLines();
  const addMutation = useAddDefectLine();
  const deleteMutation = useDeleteDefectLine();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS);

  function handleAdd(line: DefectLineName) {
    const defectName = drafts[line].trim();
    if (!defectName) return;
    addMutation.mutate(
      { line, defectName },
      {
        onSuccess: () => setDrafts((prev) => ({ ...prev, [line]: '' })),
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : 'Gagal menambah defect', 'error'),
      },
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onError: (err: unknown) => showToast(err instanceof Error ? err.message : 'Gagal menghapus defect', 'error'),
    });
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Master Data — Suspect Defect Line</h1>
      {isLoading && <p>Memuat data…</p>}
      <div className={styles.columns}>
        {DEFECT_LINE_NAMES.map((line) => (
          <div key={line} className={styles.column}>
            <h2 className={styles.columnTitle}>{line}</h2>
            <ul className={styles.list}>
              {mappings.filter((m) => m.line === line).map((m) => (
                <li key={m.id} className={styles.item}>
                  <span>{m.defectName}</span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(m.id)}
                    aria-label={`Hapus ${m.defectName}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.addRow}>
              <input
                className={modalStyles.input}
                aria-label={`Tambah defect untuk ${line}`}
                placeholder="Tambah nama defect"
                value={drafts[line]}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [line]: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd(line)}
              />
              <button
                type="button"
                className={styles.addButton}
                onClick={() => handleAdd(line)}
                aria-label={`Tambah ke ${line}`}
              >
                Tambah
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/components/MasterDataPage.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/master-data tests/components/MasterDataPage.test.tsx
git commit -m "feat(master-data): /master-data page to edit Suspect Defect Line mappings"
```

---

### Task 8: Wire into TopNav + AuthGate

**Files:**
- Modify: `components/layout/TopNav.tsx:13-17` (the `LINKS` array)
- Modify: `components/layout/AuthGate.tsx:9` (the `PROTECTED_PATHS` array)
- Modify: `tests/components/TopNav.test.tsx`
- Modify: `tests/components/AuthGate.test.tsx`

**Interfaces:**
- No new interfaces — this task only extends two existing constant arrays.

- [ ] **Step 1: Add the Master Data link to `TopNav.tsx`**

In `components/layout/TopNav.tsx`, replace:

```ts
const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
] as const;
```

with:

```ts
const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
  { href: '/master-data', label: 'Master Data' },
] as const;
```

- [ ] **Step 2: Add `/master-data` to `AuthGate`'s protected paths**

In `components/layout/AuthGate.tsx`, replace:

```ts
const PROTECTED_PATHS = ['/input', '/history'];
```

with:

```ts
const PROTECTED_PATHS = ['/input', '/history', '/master-data'];
```

- [ ] **Step 3: Update `tests/components/TopNav.test.tsx`**

Replace the test:

```ts
  it('renders links to all three routes once logged in', () => {
    mockAuth.authed = true;
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Input' })).toHaveAttribute('href', '/input');
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.queryByAltText('Toyota')).not.toBeInTheDocument();
  });
```

with:

```ts
  it('renders links to all four routes once logged in', () => {
    mockAuth.authed = true;
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Input' })).toHaveAttribute('href', '/input');
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: 'Master Data' })).toHaveAttribute('href', '/master-data');
    expect(screen.queryByAltText('Toyota')).not.toBeInTheDocument();
  });
```

Also update the logged-out test so it checks the new link is absent too. Replace:

```ts
  it('shows the logo and a centred title instead of nav links when logged out', () => {
    render(<TopNav />);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Input' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Toyota')).toHaveAttribute('src', '/logo.png');
    expect(screen.getByText('QC Gate Production')).toBeInTheDocument();
  });
```

with:

```ts
  it('shows the logo and a centred title instead of nav links when logged out', () => {
    render(<TopNav />);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Input' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Master Data' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Toyota')).toHaveAttribute('src', '/logo.png');
    expect(screen.getByText('QC Gate Production')).toBeInTheDocument();
  });
```

- [ ] **Step 4: Add a protection test to `tests/components/AuthGate.test.tsx`**

Add this test inside the existing `describe('AuthGate', ...)` block, after the `'blocks History when not logged in'` test:

```ts
  it('blocks Master Data when not logged in', () => {
    pathname = '/master-data';
    render(<AuthGate><div>Master Data content</div></AuthGate>);
    expect(screen.queryByText('Master Data content')).not.toBeInTheDocument();
  });
```

- [ ] **Step 5: Run the updated tests**

Run: `npx vitest run tests/components/TopNav.test.tsx tests/components/AuthGate.test.tsx`
Expected: PASS, all tests (TopNav: 7 tests; AuthGate: 7 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/layout/TopNav.tsx components/layout/AuthGate.tsx tests/components/TopNav.test.tsx tests/components/AuthGate.test.tsx
git commit -m "feat(nav): add Master Data link + gate /master-data like Input/History"
```

---

### Task 9: Wire into the Dashboard

**Files:**
- Modify: `hooks/useDashboardSettings.tsx` (the `PANELS` array)
- Modify: `app/dashboard/page.tsx` (imports + new panel, near the existing Pareto Defect/Repair panels)
- Modify: `tests/components/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `useDefectLines` (Task 5), `paretoByLine` (Task 4), `LineParetoChart` (Task 6).

- [ ] **Step 1: Add the new panel to the Settings list**

In `hooks/useDashboardSettings.tsx`, replace:

```ts
  { id: 'paretoNg', label: 'Pareto Defect (NG)' },
  { id: 'paretoRepair', label: 'Pareto Repair' },
```

with:

```ts
  { id: 'paretoNg', label: 'Pareto Defect (NG)' },
  { id: 'paretoRepair', label: 'Pareto Repair' },
  { id: 'lineDefect', label: 'Pareto Defect per Line' },
```

- [ ] **Step 2: Write the failing test for the new Dashboard panel**

In `tests/components/DashboardPage.test.tsx`, add this mock right after the existing `vi.mock('@/hooks/useDashboardSettings', ...)` block:

```ts
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({
    mappings: [
      { id: 1, line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, line: 'Moulding', defectName: 'Dross' },
    ],
    isLoading: false,
  }),
}));
```

Then add this test inside the existing `describe('DashboardPage', ...)` block:

```ts
  it('shows the Pareto Defect per Line panel aggregating NG by suspect line', () => {
    render(<DashboardPage />);
    // fixture defectData is { 'Gas Hole Cope': 1 } on the B/C default view —
    // matches the Melting mapping above, so that bar should carry the 1 pcs.
    expect(screen.getByText('Pareto Defect per Line')).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/components/DashboardPage.test.tsx`
Expected: FAIL — `Cannot find module '@/hooks/useDefectLines'` (Task 5's file exists by now, so this instead fails because `app/dashboard/page.tsx` doesn't render "Pareto Defect per Line" yet) — the new `it` fails with "Unable to find an element with the text: Pareto Defect per Line".

- [ ] **Step 4: Wire the panel into `app/dashboard/page.tsx`**

Add the imports. Replace:

```ts
import { PicCard } from '@/components/production/PicCard';
```

with:

```ts
import { PicCard } from '@/components/production/PicCard';
import { LineParetoChart } from '@/components/production/LineParetoChart';
import { useDefectLines } from '@/hooks/useDefectLines';
import { paretoByLine } from '@/utils/defectLines';
```

Add the hook call and derived bars. Find:

```ts
  const [printedAt, setPrintedAt] = useState('');
  const { hidden } = useDashboardSettings();
```

Replace with:

```ts
  const [printedAt, setPrintedAt] = useState('');
  const { hidden } = useDashboardSettings();
  const { mappings: defectLineMappings } = useDefectLines();
```

Add the panel itself. Find:

```tsx
        {!hidden.has('paretoRepair') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Pareto Repair</div>
            <div className={styles.panelBody}>
              <ParetoChart
                data={repairData}
                hasPhoto={photoGroup ? (defectType) => hasPhoto(photoGroup, 'repair', defectType) : undefined}
                onBarClick={photoGroup ? (defectType) => setPhotoModal({ chartType: 'repair', defectType }) : undefined}
              />
            </div>
          </section>
        )}
```

Replace with (adds the new panel right after it):

```tsx
        {!hidden.has('paretoRepair') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Pareto Repair</div>
            <div className={styles.panelBody}>
              <ParetoChart
                data={repairData}
                hasPhoto={photoGroup ? (defectType) => hasPhoto(photoGroup, 'repair', defectType) : undefined}
                onBarClick={photoGroup ? (defectType) => setPhotoModal({ chartType: 'repair', defectType }) : undefined}
              />
            </div>
          </section>
        )}

        {!hidden.has('lineDefect') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Pareto Defect per Line</div>
            <div className={styles.panelBody}>
              <LineParetoChart bars={paretoByLine(defectData, defectLineMappings)} />
            </div>
          </section>
        )}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/components/DashboardPage.test.tsx`
Expected: PASS, all tests (14 existing + 1 new = 15).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, every test file (this repo was at 288 passing tests before this feature; expect that plus every test added in Tasks 2–9).

- [ ] **Step 8: Production build**

Run: `npm run build`
Expected: builds cleanly, `/master-data` listed as a new static route alongside `/dashboard`, `/input`, `/history`.

- [ ] **Step 9: Commit**

```bash
git add hooks/useDashboardSettings.tsx app/dashboard/page.tsx tests/components/DashboardPage.test.tsx
git commit -m "feat(dashboard): wire Pareto Defect per Line panel into the bento grid"
```

---

## After Implementation

Tell the user to run the migration script against the live database before the feature is usable there:

```bash
node --env-file=.env.local scripts/migrate-defect-lines.mjs
```

(Same reasoning as every other schema change in this project — this modifies the production database, so it's the user's call to run it, not something to run automatically.)
