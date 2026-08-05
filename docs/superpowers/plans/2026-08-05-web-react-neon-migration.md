# QC Gate Production — React + Neon Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the QC Gate Production app from vanilla JS/Express/Socket.IO/sql.js to Next.js + Neon Postgres, deployed to Vercel, with the UI split into `/dashboard`, `/input`, `/history` routes and 100% feature parity with the current app.

**Architecture:** Next.js App Router project with Route Handlers (`app/api/**`) as the backend, talking to Neon Postgres via `@neondatabase/serverless`. TanStack Query polls a single live-state endpoint every 3s and applies optimistic updates on mutation, replacing Socket.IO's real-time push. A Vercel Cron Job replaces the old client-side shift-change timer.

**Tech Stack:** Next.js 14 (App Router, TypeScript strict), `@neondatabase/serverless`, TanStack Query v5, Chart.js + react-chartjs-2 + chartjs-plugin-datalabels, SheetJS (`xlsx`), Vitest + React Testing Library, Playwright.

Full context and all decisions behind this plan are in `docs/superpowers/specs/2026-08-05-web-react-neon-migration-design.md` — read it first if anything below is ambiguous.

## Global Constraints

- Framework: Next.js (App Router), TypeScript in strict mode.
- Package manager: npm (matches the existing repo's `package-lock.json` convention).
- Database access: raw parameterized SQL via `@neondatabase/serverless` — no ORM.
- All UI copy/labels stay in Indonesian, verbatim from the original app, except the History page (which had no UI before this migration).
- Fixed dropdown lists — 10 defect types, 11 repair types, 2 shifts — must match the original app exactly (`database.js`/`index.html` in the current repo), enforced by dedicated tests.
- Auto-reset cron times assume the factory operates on WIB (UTC+7): 07:00/19:00 WIB = 00:00/12:00 UTC. Flag to the user if this assumption is wrong.
- Every task must leave `npm test` green and `npm run build` succeeding before moving to the next task.

---

### Task 1: Scaffold Next.js project + tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `next-env.d.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `playwright.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a bootable Next.js + TypeScript project; `npm test` (Vitest), `npm run test:e2e` (Playwright), and `npm run build` all runnable from this point on. Path alias `@/*` → repo root, used by every later task's imports.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "qc-gate-production",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "@tanstack/react-query": "^5.59.0",
    "chart.js": "^4.4.4",
    "chartjs-plugin-datalabels": "^2.2.0",
    "next": "^14.2.13",
    "react": "^18.3.1",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.3.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.2",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.7.4",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 5: Create `.env.example`**

```
DATABASE_URL=postgres://user:password@ep-example-12345.us-east-2.aws.neon.tech/qcgate?sslmode=require
RESET_PASSWORD=1234
CRON_SECRET=change-me-to-a-random-string
```

- [ ] **Step 6: Create `.gitignore`**

```
# dependencies
/node_modules

# next.js
/.next/
/out/

# env
.env
.env.local
.env*.local

# testing
/coverage
/test-results
/playwright-report

# misc
*.log
```

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // tests/e2e is Playwright-only (conflicting test()/expect() globals) —
    // exclude it here so Vitest doesn't try to collect it too. Discovered
    // in Task 24 once tests/e2e/smoke.spec.ts existed alongside it.
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 8: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 9: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

- [ ] **Step 10: Create `app/globals.css`** (minimal reset for now — the full design-token set is ported in Task 8)

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  min-height: 100vh;
}
```

- [ ] **Step 11: Create `app/layout.tsx`** (minimal — TopNav and Providers are added in Tasks 8 and 11)

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QC Gate Production',
  description: 'QC Gate Production Block Cylinder Line Finishing Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 12: Create `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
}
```

- [ ] **Step 13: Install dependencies and verify the build**

Run: `npm install`
Run: `npm run build`
Expected: build succeeds (the `/dashboard` route will 404 at runtime until Task 20 — that's fine, the build itself must still pass since `redirect()` doesn't require the target route to exist at compile time).

- [ ] **Step 14: Commit**

```bash
git add package.json tsconfig.json next.config.mjs next-env.d.ts .env.example .gitignore vitest.config.ts tests/setup.ts playwright.config.ts app/
git commit -m "chore: scaffold Next.js + TypeScript project with test tooling"
```

---

### Task 2: Neon DB client + schema + shared types

**Files:**
- Create: `lib/db.ts`
- Create: `lib/schema.sql`
- Create: `lib/types.ts`
- Test: `tests/unit/lib/db.test.ts`

**Interfaces:**
- Consumes: nothing new (standalone data-access foundation).
- Produces: `sql` (tagged-template query function) from `lib/db.ts`, used by every data-access module from Task 4 onward. `ProductionState` and `HistoryRecord` types from `lib/types.ts`, used throughout the app.

**Manual setup (cannot be scripted — do this before Step 1):**
1. Create a Neon project at https://console.neon.tech.
2. Copy its connection string.
3. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to that connection string (also set `RESET_PASSWORD` and `CRON_SECRET` to your own values now — they're used starting Task 5/7).
4. Apply `lib/schema.sql` (created in Step 2 below) against that database — via the Neon SQL Editor (paste and run), or `psql "$DATABASE_URL" -f lib/schema.sql` if you have `psql` installed.

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export interface ProductionState {
  date: string;
  shift: string;
  operator: string;
  target: number;
  ok1: number;
  repair1: number;
  ng1: number;
  ok2: number;
  repair2: number;
  ng2: number;
  defectData: Record<string, number>;
  repairData: Record<string, number>;
  hourlyData: Record<string, { ok: number; repair: number; ng: number }>;
  savedAt: string;
}

export interface HistoryRecord extends ProductionState {
  id: number;
}
```

- [ ] **Step 2: Create `lib/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS production_state (
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

CREATE TABLE IF NOT EXISTS history (
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

INSERT INTO production_state (id, saved_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3: Write the failing test for `lib/db.ts`**

Create `tests/unit/lib/db.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('lib/db', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
  });

  it('does not throw on import even when DATABASE_URL is not set (Next.js build-time safety)', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('@/lib/db')).resolves.toBeDefined();
  });

  it('throws a clear error when a query is attempted without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    const { sql } = await import('@/lib/db');
    expect(() => sql`SELECT 1`).toThrow('DATABASE_URL environment variable is not set');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run tests/unit/lib/db.test.ts`
Expected: FAIL — `Cannot find module '@/lib/db'` (the file doesn't exist yet).

- [ ] **Step 5: Create `lib/db.ts`**

**Important:** the client must be constructed lazily, not at module-import time. `next build` imports every Route Handler module during its "Collecting page data" step — before any request happens — so an eager `if (!process.env.DATABASE_URL) throw` at module scope breaks `npm run build` in any environment where `DATABASE_URL` isn't set yet (discovered by actually running the build in Task 8's checkpoint, not by inspection).

```ts
import { neon } from '@neondatabase/serverless';

// API reference: https://neon.tech/docs/serverless/serverless-driver
//
// Lazily constructed: `next build` imports every Route Handler module during
// its "Collecting page data" step, before any request happens. Throwing here
// at module-import time (rather than on first actual query) would break
// `npm run build` in any environment where DATABASE_URL isn't set yet — so
// the check is deferred to the first real call.
let client: ReturnType<typeof neon> | null = null;

function getClient(): ReturnType<typeof neon> {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Copy .env.example to .env.local and fill in your Neon connection string.',
      );
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
  return getClient()(strings, ...values);
}
sqlTag.transaction = (...args: Parameters<ReturnType<typeof neon>['transaction']>) =>
  getClient().transaction(...(args as Parameters<ReturnType<typeof neon>['transaction']>));

export const sql = sqlTag as ReturnType<typeof neon>;
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/unit/lib/db.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/db.ts lib/schema.sql lib/types.ts tests/unit/lib/db.test.ts
git commit -m "feat: add Neon DB client, schema, and shared production-state types"
```

---

### Task 3: Core domain utilities — rates, totals, constants

**Files:**
- Create: `utils/rates.ts`
- Create: `utils/constants.ts`
- Test: `tests/unit/utils/rates.test.ts`
- Test: `tests/unit/utils/constants.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions, no I/O).
- Produces: `getOkTotal`, `getRepairTotal`, `getNgTotal`, `getGrandTotal`, `getRates`, `getAchievementPercent`, `getProgressPercent`, `isNgAlarmActive` from `utils/rates.ts` — used by Input/Dashboard pages (Tasks 16, 20) and `useHourlySnapshot` (Task 15). `DEFECT_TYPES`, `REPAIR_TYPES`, `SHIFTS` from `utils/constants.ts` — used by DefectModal/RepairModal (Task 13) and the toolbar (Task 16).

- [ ] **Step 1: Write the failing tests for `utils/rates.ts`**

Create `tests/unit/utils/rates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  getOkTotal, getRepairTotal, getNgTotal, getGrandTotal,
  getRates, getAchievementPercent, getProgressPercent, isNgAlarmActive,
} from '@/utils/rates';

const base = { ok1: 10, repair1: 2, ng1: 1, ok2: 5, repair2: 1, ng2: 1 };

describe('rates utilities', () => {
  it('sums OK across both products', () => {
    expect(getOkTotal(base)).toBe(15);
  });

  it('sums Repair across both products', () => {
    expect(getRepairTotal(base)).toBe(3);
  });

  it('sums NG across both products', () => {
    expect(getNgTotal(base)).toBe(2);
  });

  it('sums the grand total', () => {
    expect(getGrandTotal(base)).toBe(20);
  });

  it('returns 0% rates when total is 0', () => {
    const empty = { ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0 };
    expect(getRates(empty)).toEqual({ okRate: 0, repairRate: 0, ngRate: 0 });
  });

  it('computes rounded percentage rates', () => {
    expect(getRates(base)).toEqual({ okRate: 75, repairRate: 15, ngRate: 10 });
  });

  it('computes achievement percent relative to target', () => {
    expect(getAchievementPercent(base, 40)).toBe(50);
  });

  it('returns 0 achievement when target is 0', () => {
    expect(getAchievementPercent(base, 0)).toBe(0);
  });

  it('caps progress percent at 100', () => {
    expect(getProgressPercent(base, 10)).toBe(100);
  });

  it('flags NG alarm when NG rate exceeds 5%', () => {
    const highNg = { ok1: 10, repair1: 0, ng1: 5, ok2: 0, repair2: 0, ng2: 0 };
    expect(isNgAlarmActive(highNg)).toBe(true);
  });

  it('does not flag NG alarm at or below 5%', () => {
    const okNg = { ok1: 95, repair1: 0, ng1: 5, ok2: 0, repair2: 0, ng2: 0 };
    expect(isNgAlarmActive(okNg)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/utils/rates.test.ts`
Expected: FAIL — `Cannot find module '@/utils/rates'`.

- [ ] **Step 3: Create `utils/rates.ts`**

```ts
export interface Counters {
  ok1: number;
  repair1: number;
  ng1: number;
  ok2: number;
  repair2: number;
  ng2: number;
}

export function getOkTotal(c: Counters): number {
  return c.ok1 + c.ok2;
}

export function getRepairTotal(c: Counters): number {
  return c.repair1 + c.repair2;
}

export function getNgTotal(c: Counters): number {
  return c.ng1 + c.ng2;
}

export function getGrandTotal(c: Counters): number {
  return getOkTotal(c) + getRepairTotal(c) + getNgTotal(c);
}

export function getRates(c: Counters): { okRate: number; repairRate: number; ngRate: number } {
  const total = getGrandTotal(c);
  if (total === 0) return { okRate: 0, repairRate: 0, ngRate: 0 };
  return {
    okRate: Math.round((getOkTotal(c) / total) * 100),
    repairRate: Math.round((getRepairTotal(c) / total) * 100),
    ngRate: Math.round((getNgTotal(c) / total) * 100),
  };
}

export function getAchievementPercent(c: Counters, target: number): number {
  if (target <= 0) return 0;
  return Math.round((getGrandTotal(c) / target) * 100);
}

export function getProgressPercent(c: Counters, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((getGrandTotal(c) / target) * 100), 100);
}

export function isNgAlarmActive(c: Counters): boolean {
  const total = getGrandTotal(c);
  if (total === 0) return false;
  return (getNgTotal(c) / total) * 100 > 5;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/utils/rates.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Write the failing test for `utils/constants.ts`**

Create `tests/unit/utils/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DEFECT_TYPES, REPAIR_TYPES, SHIFTS } from '@/utils/constants';

describe('production constants', () => {
  it('has exactly the 10 defect types from the original app', () => {
    expect(DEFECT_TYPES).toHaveLength(10);
    expect(DEFECT_TYPES).toContain('Gas Hole Cope');
    expect(DEFECT_TYPES).toContain('Kandama Rear');
  });

  it('has exactly the 11 repair types from the original app', () => {
    expect(REPAIR_TYPES).toHaveLength(11);
    expect(REPAIR_TYPES).toContain('Mejashi Bore 1');
    expect(REPAIR_TYPES).toContain('Dakon');
  });

  it('has the two fixed shifts', () => {
    expect(SHIFTS).toEqual(['Shift Red', 'Shift White']);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run tests/unit/utils/constants.test.ts`
Expected: FAIL — `Cannot find module '@/utils/constants'`.

- [ ] **Step 7: Create `utils/constants.ts`**

```ts
export const DEFECT_TYPES = [
  'Gas Hole Cope',
  'Gas Hole Drag',
  'Gomi Drag',
  'Gomi Cope',
  'Pin Hole Cope',
  'Kake Headment',
  'Tsurikomi Oil Pan',
  'Tsurikomi Front',
  'Kandama Front',
  'Kandama Rear',
] as const;

export const REPAIR_TYPES = [
  'Mejashi Bore 1',
  'Mejashi Bore 2',
  'Mejashi Bore 3',
  'Mejashi Bore 4',
  'Gomi Drag',
  'Gomi Cope',
  'Gomi Front',
  'Gomi Rear',
  'Pin Hole Cope',
  'Kake',
  'Dakon',
] as const;

export const SHIFTS = ['Shift Red', 'Shift White'] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];
export type RepairType = (typeof REPAIR_TYPES)[number];
export type Shift = (typeof SHIFTS)[number];
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run tests/unit/utils/constants.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add utils/rates.ts utils/constants.ts tests/unit/utils/rates.test.ts tests/unit/utils/constants.test.ts
git commit -m "feat: add production rate/total and constant utilities"
```

---

### Task 4: `/api/state` — get and save live production state

**Files:**
- Create: `lib/productionState.ts`
- Create: `app/api/state/route.ts`
- Test: `tests/unit/lib/productionState.test.ts`
- Test: `tests/unit/api/state.test.ts`

**Interfaces:**
- Consumes: `sql` from `lib/db.ts` (Task 2), `ProductionState` from `lib/types.ts` (Task 2).
- Produces: `getProductionState(): Promise<ProductionState | null>` and `saveProductionState(state: Partial<ProductionState>): Promise<void>` from `lib/productionState.ts` — consumed by `lib/reset.ts` (Task 5). `GET`/`POST` handlers at `app/api/state/route.ts` — consumed by `hooks/useProductionState.ts` (Task 11) via `fetch('/api/state')`.

- [ ] **Step 1: Write the failing tests for `lib/productionState.ts`**

Create `tests/unit/lib/productionState.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { getProductionState, saveProductionState } from '@/lib/productionState';

describe('getProductionState', () => {
  beforeEach(() => mockSql.mockReset());

  it('returns null when no row exists', async () => {
    mockSql.mockResolvedValueOnce([]);
    const result = await getProductionState();
    expect(result).toBeNull();
  });

  it('maps a DB row to camelCase ProductionState', async () => {
    mockSql.mockResolvedValueOnce([{
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
      defect_data: { 'Gas Hole Cope': 1 }, repair_data: {}, hourly_data: {},
      saved_at: '2026-08-05T07:00:00.000Z',
    }]);
    const result = await getProductionState();
    expect(result).toEqual({
      date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {},
      savedAt: '2026-08-05T07:00:00.000Z',
    });
  });
});

describe('saveProductionState', () => {
  beforeEach(() => mockSql.mockReset());

  it('calls sql with defaults for missing fields', async () => {
    mockSql.mockResolvedValueOnce([]);
    await saveProductionState({ operator: 'Siti' });
    expect(mockSql).toHaveBeenCalledTimes(1);
    const [strings, ...values] = mockSql.mock.calls[0];
    expect(strings.join('?')).toContain('UPDATE production_state');
    expect(values).toContain('Siti');
  });

  it('rejects a negative counter value instead of writing it', async () => {
    await expect(saveProductionState({ ok1: -1 })).rejects.toThrow(
      'Counter values cannot be negative',
    );
    expect(mockSql).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/lib/productionState.test.ts`
Expected: FAIL — `Cannot find module '@/lib/productionState'`.

- [ ] **Step 3: Create `lib/productionState.ts`**

```ts
import { sql } from './db';
import type { ProductionState } from './types';

interface ProductionStateRow {
  date: string;
  shift: string;
  operator: string;
  target: number;
  ok1: number;
  repair1: number;
  ng1: number;
  ok2: number;
  repair2: number;
  ng2: number;
  defect_data: Record<string, number>;
  repair_data: Record<string, number>;
  hourly_data: Record<string, { ok: number; repair: number; ng: number }>;
  saved_at: string;
}

function rowToState(row: ProductionStateRow): ProductionState {
  return {
    date: row.date,
    shift: row.shift,
    operator: row.operator,
    target: row.target,
    ok1: row.ok1,
    repair1: row.repair1,
    ng1: row.ng1,
    ok2: row.ok2,
    repair2: row.repair2,
    ng2: row.ng2,
    defectData: row.defect_data ?? {},
    repairData: row.repair_data ?? {},
    hourlyData: row.hourly_data ?? {},
    savedAt: row.saved_at,
  };
}

export async function getProductionState(): Promise<ProductionState | null> {
  const rows = (await sql`SELECT * FROM production_state WHERE id = 1`) as ProductionStateRow[];
  const row = rows[0];
  return row ? rowToState(row) : null;
}

const COUNTER_FIELDS = ['ok1', 'repair1', 'ng1', 'ok2', 'repair2', 'ng2'] as const;

export async function saveProductionState(state: Partial<ProductionState>): Promise<void> {
  for (const field of COUNTER_FIELDS) {
    const value = state[field];
    if (value !== undefined && value < 0) {
      throw new Error('Counter values cannot be negative');
    }
  }

  await sql`
    UPDATE production_state SET
      date = ${state.date ?? ''},
      shift = ${state.shift ?? 'Shift Red'},
      operator = ${state.operator ?? ''},
      target = ${state.target ?? 0},
      ok1 = ${state.ok1 ?? 0},
      repair1 = ${state.repair1 ?? 0},
      ng1 = ${state.ng1 ?? 0},
      ok2 = ${state.ok2 ?? 0},
      repair2 = ${state.repair2 ?? 0},
      ng2 = ${state.ng2 ?? 0},
      defect_data = ${JSON.stringify(state.defectData ?? {})}::jsonb,
      repair_data = ${JSON.stringify(state.repairData ?? {})}::jsonb,
      hourly_data = ${JSON.stringify(state.hourlyData ?? {})}::jsonb,
      saved_at = now()
    WHERE id = 1
  `;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/lib/productionState.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing tests for the `/api/state` route**

Create `tests/unit/api/state.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetState = vi.fn();
const mockSaveState = vi.fn();
vi.mock('@/lib/productionState', () => ({
  getProductionState: (...args: any[]) => mockGetState(...args),
  saveProductionState: (...args: any[]) => mockSaveState(...args),
}));

import { GET, POST } from '@/app/api/state/route';

describe('GET /api/state', () => {
  beforeEach(() => { mockGetState.mockReset(); mockSaveState.mockReset(); });

  it('returns the current state wrapped in a success envelope', async () => {
    mockGetState.mockResolvedValueOnce({ operator: 'Budi' });
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { operator: 'Budi' } });
  });

  it('returns a 500 error envelope when the DB call throws', async () => {
    mockGetState.mockRejectedValueOnce(new Error('connection refused'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'connection refused' });
  });
});

describe('POST /api/state', () => {
  beforeEach(() => { mockGetState.mockReset(); mockSaveState.mockReset(); });

  it('saves the posted state and returns success', async () => {
    mockSaveState.mockResolvedValueOnce(undefined);
    const request = new NextRequest('http://localhost/api/state', {
      method: 'POST',
      body: JSON.stringify({ operator: 'Siti', ok1: 5 }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSaveState).toHaveBeenCalledWith({ operator: 'Siti', ok1: 5 });
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/api/state.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/state/route'`.

- [ ] **Step 7: Create `app/api/state/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getProductionState, saveProductionState } from '@/lib/productionState';

export async function GET() {
  try {
    const data = await getProductionState();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await saveProductionState(body);
    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/api/state.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/productionState.ts app/api/state/route.ts tests/unit/lib/productionState.test.ts tests/unit/api/state.test.ts
git commit -m "feat: add GET/POST /api/state for live production state"
```

---

### Task 5: `/api/reset` — password-gated reset with archive-then-zero transaction

**Files:**
- Create: `lib/reset.ts`
- Create: `app/api/reset/route.ts`
- Test: `tests/unit/lib/reset.test.ts`
- Test: `tests/unit/api/reset.test.ts`

**Interfaces:**
- Consumes: `sql` from `lib/db.ts` (Task 2), `getProductionState` from `lib/productionState.ts` (Task 4), `ProductionState` from `lib/types.ts` (Task 2).
- Produces: `checkResetPassword(candidate: string): void`, `resetProductionState(): Promise<ProductionState>`, `InvalidResetPasswordError` from `lib/reset.ts` — consumed by `app/api/cron/shift-reset/route.ts` (Task 6, only `resetProductionState`) and the `/api/reset` route below. `POST` handler at `app/api/reset/route.ts` — consumed by `hooks/useReset.ts` (Task 14).

- [ ] **Step 1: Write the failing tests for `lib/reset.ts`**

Create `tests/unit/lib/reset.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock factories are hoisted above top-level const declarations, so a
// factory that directly returns a plain reference (not wrapped in a lazy
// arrow function) must declare that reference via vi.hoisted() or it throws
// "Cannot access 'mockSql' before initialization".
const { mockSql } = vi.hoisted(() => {
  const fn = vi.fn() as any;
  fn.transaction = vi.fn();
  return { mockSql: fn };
});
vi.mock('@/lib/db', () => ({ sql: mockSql }));

const mockGetProductionState = vi.fn();
vi.mock('@/lib/productionState', () => ({
  getProductionState: (...args: any[]) => mockGetProductionState(...args),
}));

import { checkResetPassword, resetProductionState, InvalidResetPasswordError } from '@/lib/reset';

describe('checkResetPassword', () => {
  const originalPassword = process.env.RESET_PASSWORD;
  beforeEach(() => { process.env.RESET_PASSWORD = '1234'; });
  afterEach(() => { process.env.RESET_PASSWORD = originalPassword; });

  it('does not throw for the correct password', () => {
    expect(() => checkResetPassword('1234')).not.toThrow();
  });

  it('throws InvalidResetPasswordError for the wrong password', () => {
    expect(() => checkResetPassword('0000')).toThrow(InvalidResetPasswordError);
  });
});

describe('resetProductionState', () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockSql.transaction.mockReset();
    mockGetProductionState.mockReset();
  });

  it('archives to history in a transaction when there is production data', async () => {
    mockGetProductionState
      .mockResolvedValueOnce({
        date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
        ok1: 10, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:00.000Z',
      })
      .mockResolvedValueOnce({
        date: '', shift: 'Shift Red', operator: '', target: 0,
        ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T19:00:00.000Z',
      });
    mockSql.transaction.mockResolvedValueOnce([]);

    const result = await resetProductionState();

    expect(mockSql.transaction).toHaveBeenCalledTimes(1);
    expect(result.ok1).toBe(0);
  });

  it('skips the archive when there is no production data yet', async () => {
    mockGetProductionState
      .mockResolvedValueOnce({
        date: '', shift: 'Shift Red', operator: '', target: 0,
        ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:00.000Z',
      })
      .mockResolvedValueOnce({
        date: '', shift: 'Shift Red', operator: '', target: 0,
        ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
        defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:01.000Z',
      });
    mockSql.mockResolvedValueOnce([]);

    await resetProductionState();

    expect(mockSql.transaction).not.toHaveBeenCalled();
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/lib/reset.test.ts`
Expected: FAIL — `Cannot find module '@/lib/reset'`.

- [ ] **Step 3: Create `lib/reset.ts`**

```ts
import { sql } from './db';
import { getProductionState } from './productionState';
import type { ProductionState } from './types';

export class InvalidResetPasswordError extends Error {
  constructor() {
    super('Invalid reset password');
    this.name = 'InvalidResetPasswordError';
  }
}

export function checkResetPassword(candidate: string): void {
  const expected = process.env.RESET_PASSWORD;
  if (!expected || candidate !== expected) {
    throw new InvalidResetPasswordError();
  }
}

function hasAnyProduction(state: ProductionState): boolean {
  return (
    state.ok1 + state.repair1 + state.ng1 +
    state.ok2 + state.repair2 + state.ng2
  ) > 0;
}

export async function resetProductionState(): Promise<ProductionState> {
  const current = await getProductionState();

  if (current && hasAnyProduction(current)) {
    // sql.transaction() batches these two statements into one atomic
    // round-trip — see https://neon.tech/docs/serverless/serverless-driver
    await sql.transaction([
      sql`
        INSERT INTO history
          (date, shift, operator, target, ok1, repair1, ng1, ok2, repair2, ng2,
           defect_data, repair_data, hourly_data, saved_at)
        VALUES (
          ${current.date}, ${current.shift}, ${current.operator}, ${current.target},
          ${current.ok1}, ${current.repair1}, ${current.ng1},
          ${current.ok2}, ${current.repair2}, ${current.ng2},
          ${JSON.stringify(current.defectData)}::jsonb,
          ${JSON.stringify(current.repairData)}::jsonb,
          ${JSON.stringify(current.hourlyData)}::jsonb,
          now()
        )
      `,
      sql`
        UPDATE production_state SET
          date = '', shift = 'Shift Red', operator = '', target = 0,
          ok1 = 0, repair1 = 0, ng1 = 0, ok2 = 0, repair2 = 0, ng2 = 0,
          defect_data = '{}'::jsonb, repair_data = '{}'::jsonb, hourly_data = '{}'::jsonb,
          saved_at = now()
        WHERE id = 1
      `,
    ]);
  } else {
    await sql`
      UPDATE production_state SET
        date = '', shift = 'Shift Red', operator = '', target = 0,
        ok1 = 0, repair1 = 0, ng1 = 0, ok2 = 0, repair2 = 0, ng2 = 0,
        defect_data = '{}'::jsonb, repair_data = '{}'::jsonb, hourly_data = '{}'::jsonb,
        saved_at = now()
      WHERE id = 1
    `;
  }

  const fresh = await getProductionState();
  if (!fresh) {
    throw new Error('production_state row missing after reset');
  }
  return fresh;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/lib/reset.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing tests for the `/api/reset` route**

Create `tests/unit/api/reset.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Same vi.hoisted() requirement as reset.test.ts above — the factory
// returns MockInvalidResetPasswordError directly.
const { mockReset, mockCheckPassword, MockInvalidResetPasswordError } = vi.hoisted(() => {
  class MockInvalidResetPasswordError extends Error {}
  return {
    mockReset: vi.fn(),
    mockCheckPassword: vi.fn(),
    MockInvalidResetPasswordError,
  };
});

vi.mock('@/lib/reset', () => ({
  resetProductionState: (...args: any[]) => mockReset(...args),
  checkResetPassword: (...args: any[]) => mockCheckPassword(...args),
  InvalidResetPasswordError: MockInvalidResetPasswordError,
}));

import { POST } from '@/app/api/reset/route';

describe('POST /api/reset', () => {
  beforeEach(() => {
    mockReset.mockReset();
    mockCheckPassword.mockReset();
  });

  it('returns 401 when the password check throws', async () => {
    mockCheckPassword.mockImplementation(() => { throw new MockInvalidResetPasswordError('Invalid reset password'); });
    const request = new NextRequest('http://localhost/api/reset', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    });
    const res = await POST(request);
    expect(res.status).toBe(401);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('resets and returns the fresh state on a correct password', async () => {
    mockCheckPassword.mockImplementation(() => {});
    mockReset.mockResolvedValueOnce({ ok1: 0 });
    const request = new NextRequest('http://localhost/api/reset', {
      method: 'POST',
      body: JSON.stringify({ password: '1234' }),
    });
    const res = await POST(request);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, message: 'Data direset dan diarsipkan', data: { ok1: 0 } });
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/api/reset.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/reset/route'`.

- [ ] **Step 7: Create `app/api/reset/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { resetProductionState, checkResetPassword, InvalidResetPasswordError } from '@/lib/reset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    checkResetPassword(body?.password ?? '');
    const data = await resetProductionState();
    return NextResponse.json({ success: true, message: 'Data direset dan diarsipkan', data });
  } catch (err) {
    if (err instanceof InvalidResetPasswordError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/api/reset.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/reset.ts app/api/reset/route.ts tests/unit/lib/reset.test.ts tests/unit/api/reset.test.ts
git commit -m "feat: add password-gated /api/reset with archive-then-zero transaction"
```

---

### Task 6: `/api/history` — list archived shifts with optional filters

**Files:**
- Create: `lib/history.ts`
- Create: `app/api/history/route.ts`
- Test: `tests/unit/lib/history.test.ts`
- Test: `tests/unit/api/history.test.ts`

**Interfaces:**
- Consumes: `sql` from `lib/db.ts` (Task 2), `HistoryRecord` from `lib/types.ts` (Task 2).
- Produces: `getHistory(filters?: HistoryFilters): Promise<HistoryRecord[]>` from `lib/history.ts`. `GET` handler at `app/api/history/route.ts` — consumed by `hooks/useHistory.ts` (Task 21).

- [ ] **Step 1: Write the failing tests for `lib/history.ts`**

Create `tests/unit/lib/history.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({ sql: (...args: any[]) => mockSql(...args) }));

import { getHistory } from '@/lib/history';

describe('getHistory', () => {
  beforeEach(() => mockSql.mockReset());

  it('maps rows to camelCase HistoryRecord and defaults to limit 30', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 7, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
      defect_data: {}, repair_data: {}, hourly_data: {},
      saved_at: '2026-08-04T19:00:00.000Z',
    }]);

    const result = await getHistory();

    expect(result).toEqual([{
      id: 7, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
      defectData: {}, repairData: {}, hourlyData: {},
      savedAt: '2026-08-04T19:00:00.000Z',
    }]);
    const [, ...values] = mockSql.mock.calls[0];
    expect(values).toContain(30);
  });

  it('returns an empty array when there is no history yet', async () => {
    mockSql.mockResolvedValueOnce([]);
    const result = await getHistory({ shift: 'Shift White' });
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/lib/history.test.ts`
Expected: FAIL — `Cannot find module '@/lib/history'`.

- [ ] **Step 3: Create `lib/history.ts`**

```ts
import { sql } from './db';
import type { HistoryRecord } from './types';

interface HistoryRow {
  id: number;
  date: string;
  shift: string;
  operator: string;
  target: number;
  ok1: number; repair1: number; ng1: number;
  ok2: number; repair2: number; ng2: number;
  defect_data: Record<string, number>;
  repair_data: Record<string, number>;
  hourly_data: Record<string, { ok: number; repair: number; ng: number }>;
  saved_at: string;
}

function rowToHistory(row: HistoryRow): HistoryRecord {
  return {
    id: row.id,
    date: row.date,
    shift: row.shift,
    operator: row.operator,
    target: row.target,
    ok1: row.ok1, repair1: row.repair1, ng1: row.ng1,
    ok2: row.ok2, repair2: row.repair2, ng2: row.ng2,
    defectData: row.defect_data ?? {},
    repairData: row.repair_data ?? {},
    hourlyData: row.hourly_data ?? {},
    savedAt: row.saved_at,
  };
}

export interface HistoryFilters {
  limit?: number;
  date?: string;
  shift?: string;
}

export async function getHistory(filters: HistoryFilters = {}): Promise<HistoryRecord[]> {
  const limit = filters.limit ?? 30;
  const date = filters.date ?? null;
  const shift = filters.shift ?? null;

  const rows = (await sql`
    SELECT * FROM history
    WHERE (${date}::text IS NULL OR date = ${date})
      AND (${shift}::text IS NULL OR shift = ${shift})
    ORDER BY id DESC
    LIMIT ${limit}
  `) as HistoryRow[];

  return rows.map(rowToHistory);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/lib/history.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for the `/api/history` route**

Create `tests/unit/api/history.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetHistory = vi.fn();
vi.mock('@/lib/history', () => ({ getHistory: (...args: any[]) => mockGetHistory(...args) }));

import { GET } from '@/app/api/history/route';

describe('GET /api/history', () => {
  beforeEach(() => mockGetHistory.mockReset());

  it('forwards limit/date/shift query params as filters', async () => {
    mockGetHistory.mockResolvedValueOnce([]);
    const request = new NextRequest('http://localhost/api/history?limit=10&date=2026-08-05&shift=Shift+Red');
    await GET(request);
    expect(mockGetHistory).toHaveBeenCalledWith({ limit: 10, date: '2026-08-05', shift: 'Shift Red' });
  });

  it('returns the list wrapped in a success envelope', async () => {
    mockGetHistory.mockResolvedValueOnce([{ id: 1 }]);
    const request = new NextRequest('http://localhost/api/history');
    const res = await GET(request);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: [{ id: 1 }] });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run tests/unit/api/history.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/history/route'`.

- [ ] **Step 7: Create `app/api/history/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/history';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const data = await getHistory({
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      date: searchParams.get('date') ?? undefined,
      shift: searchParams.get('shift') ?? undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run tests/unit/api/history.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/history.ts app/api/history/route.ts tests/unit/lib/history.test.ts tests/unit/api/history.test.ts
git commit -m "feat: add GET /api/history with date/shift filtering"
```

---

### Task 7: Vercel Cron shift-reset endpoint

**Files:**
- Create: `app/api/cron/shift-reset/route.ts`
- Create: `vercel.json`
- Test: `tests/unit/api/cron-shift-reset.test.ts`

**Interfaces:**
- Consumes: `resetProductionState` from `lib/reset.ts` (Task 5).
- Produces: `GET` handler at `app/api/cron/shift-reset/route.ts`, invoked only by Vercel Cron (per `vercel.json`) with a bearer token equal to `CRON_SECRET`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/api/cron-shift-reset.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockReset = vi.fn();
vi.mock('@/lib/reset', () => ({ resetProductionState: (...args: any[]) => mockReset(...args) }));

import { GET } from '@/app/api/cron/shift-reset/route';

describe('GET /api/cron/shift-reset', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockReset.mockReset();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('rejects requests without the correct bearer token', async () => {
    const request = new NextRequest('http://localhost/api/cron/shift-reset');
    const res = await GET(request);
    expect(res.status).toBe(401);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('runs the reset when the bearer token matches CRON_SECRET', async () => {
    mockReset.mockResolvedValueOnce({ ok1: 0 });
    const request = new NextRequest('http://localhost/api/cron/shift-reset', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(request);
    expect(res.status).toBe(200);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/api/cron-shift-reset.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/cron/shift-reset/route'`.

- [ ] **Step 3: Create `app/api/cron/shift-reset/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { resetProductionState } from '@/lib/reset';

// Triggered by Vercel Cron at 00:00 and 12:00 UTC (07:00/19:00 WIB — see
// vercel.json). Vercel signs cron requests with a bearer token equal to
// CRON_SECRET so this endpoint can't be hit by anyone else.
// https://vercel.com/docs/cron-jobs
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await resetProductionState();
    return NextResponse.json({ success: true, message: 'Auto-reset pergantian shift', data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/api/cron-shift-reset.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Create `vercel.json`**

Vercel Cron schedules are always UTC. The factory runs on WIB (UTC+7), so 07:00 WIB = 00:00 UTC and 19:00 WIB = 12:00 UTC:

```json
{
  "crons": [
    { "path": "/api/cron/shift-reset", "schedule": "0 0 * * *" },
    { "path": "/api/cron/shift-reset", "schedule": "0 12 * * *" }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/shift-reset/route.ts vercel.json tests/unit/api/cron-shift-reset.test.ts
git commit -m "feat: add Vercel Cron shift-reset endpoint"
```

---

### Task 8: Global design tokens + TopNav + layout wiring

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/layout/TopNav.tsx`
- Create: `components/layout/TopNav.module.css`
- Test: `tests/components/TopNav.test.tsx`

**Interfaces:**
- Consumes: nothing (pure layout/presentation).
- Produces: CSS custom properties (`--bg-primary`, `--accent-red`, etc.) on `:root` in `app/globals.css`, used by every component's CSS Module from here on. `TopNav` component, wired into the root layout for all three routes.

- [ ] **Step 1: Write the failing test for `TopNav`**

Create `tests/components/TopNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { TopNav } from '@/components/layout/TopNav';

describe('TopNav', () => {
  it('renders links to all three routes', () => {
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Input' })).toHaveAttribute('href', '/input');
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
  });

  it('marks the current route as active', () => {
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' }).className).toMatch(/linkActive/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/TopNav.test.tsx`
Expected: FAIL — `Cannot find module '@/components/layout/TopNav'`.

- [ ] **Step 3: Replace `app/globals.css` with the full ported design tokens**

```css
:root {
  --bg-primary: #0f1117;
  --bg-secondary: #1a1d27;
  --bg-card: #21242f;
  --bg-card-hover: #282c3a;
  --border-color: #2e3346;
  --text-primary: #f0f1f5;
  --text-secondary: #9ca3b8;
  --text-muted: #6b7280;
  --accent-red: #dc2626;
  --accent-red-soft: #7f1d1d;
  --accent-green: #22c55e;
  --accent-green-soft: rgba(34,197,94,0.12);
  --accent-orange: #f59e0b;
  --accent-orange-soft: rgba(245,158,11,0.12);
  --accent-red-soft-bg: rgba(220,38,38,0.12);
  --accent-blue: #3b82f6;
  --accent-cyan: #06b6d4;
  --accent-bc1: #dc2626;
  --accent-bc2: #3b82f6;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-popup: 0 25px 50px -12px rgba(0,0,0,0.6);
  --transition: 0.2s ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  min-height: 100vh;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Create `components/layout/TopNav.module.css`**

```css
.header {
  background: linear-gradient(135deg, var(--accent-red) 0%, #991b1b 100%);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
}

.subtitle {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255,255,255,0.75);
  margin-top: 2px;
}

.nav {
  display: flex;
  gap: 8px;
}

.link, .linkActive {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: rgba(255,255,255,0.75);
  transition: background var(--transition);
}

.link:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.linkActive {
  background: rgba(255,255,255,0.18);
  color: #fff;
}
```

- [ ] **Step 5: Create `components/layout/TopNav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div>
        <div className={styles.title}>QC Gate Production</div>
        <div className={styles.subtitle}>Block Cylinder Line Finishing — Monitoring System</div>
      </div>
      <nav className={styles.nav}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname.startsWith(link.href) ? styles.linkActive : styles.link}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/components/TopNav.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Modify `app/layout.tsx` to use the Inter font and render TopNav**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TopNav } from '@/components/layout/TopNav';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'QC Gate Production',
  description: 'QC Gate Production Block Cylinder Line Finishing Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Run the full test suite and the build to make sure nothing broke**

Run: `npm test`
Run: `npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add app/globals.css app/layout.tsx components/layout/ tests/components/TopNav.test.tsx
git commit -m "feat: port design tokens and add TopNav across all routes"
```

---

### Task 9: Toast notification system

**Files:**
- Create: `components/ui/ToastProvider.tsx`
- Create: `components/ui/Toast.module.css`
- Test: `tests/components/ToastProvider.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ToastProvider` and `useToast(): { showToast: (message: string, type?: 'success'|'warning'|'error') => void }` from `components/ui/ToastProvider.tsx` — `ToastProvider` wraps the app in Task 11's `Providers`; `useToast` is consumed by the Input page (Task 16) and `ResetModal` (Task 14).

- [ ] **Step 1: Write the failing tests**

Create `tests/components/ToastProvider.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/ToastProvider';

function TriggerButton() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Data tersimpan', 'success')}>Trigger</button>;
}

describe('ToastProvider', () => {
  it('renders a toast after showToast is called', async () => {
    render(
      <ToastProvider>
        <TriggerButton />
      </ToastProvider>,
    );
    screen.getByRole('button', { name: 'Trigger' }).click();
    expect(await screen.findByText('Data tersimpan')).toBeInTheDocument();
  });

  it('throws when useToast is used outside a ToastProvider', () => {
    const Bad = () => { useToast(); return null; };
    expect(() => render(<Bad />)).toThrow('useToast must be used within a ToastProvider');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/ToastProvider.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/ToastProvider'`.

- [ ] **Step 3: Create `components/ui/Toast.module.css`**

```css
.container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  box-shadow: var(--shadow-popup);
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
}

.success { border-left: 3px solid var(--accent-green); }
.warning { border-left: 3px solid var(--accent-orange); }
.error { border-left: 3px solid var(--accent-red); }

.icon {
  font-weight: 700;
}
```

- [ ] **Step 4: Create `components/ui/ToastProvider.tsx`**

```tsx
'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'warning' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = { success: '✓', warning: '⚡', error: '✕' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            <span className={styles.icon}>{ICONS[toast.type]}</span> {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/ToastProvider.test.tsx`
Expected: PASS (2 tests — the second test logs a React error to the console, which is expected since it's testing an intentional throw)

- [ ] **Step 6: Commit**

```bash
git add components/ui/ToastProvider.tsx components/ui/Toast.module.css tests/components/ToastProvider.test.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 10: Generic Modal component

**Files:**
- Create: `components/ui/Modal.tsx`
- Create: `components/ui/Modal.module.css`
- Test: `tests/components/Modal.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Modal` component (`{ isOpen, onClose, title, children }`) from `components/ui/Modal.tsx` — consumed by `DefectModal`/`RepairModal` (Task 13) and `ResetModal` (Task 14).

- [ ] **Step 1: Write the failing tests**

Create `tests/components/Modal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test">content</Modal>);
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<Modal isOpen onClose={() => {}} title="Test">content</Modal>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test">content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay background is clicked', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test">content</Modal>);
    // getByText('content') matches the `.modal` div itself (RTL matches an
    // element whose direct text-node children equal the query), so its
    // parent is already the `.overlay` div — one level up, not two.
    const overlay = screen.getByText('content').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/Modal.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/Modal'`.

- [ ] **Step 3: Create `components/ui/Modal.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 28px;
  width: 400px;
  max-width: 90vw;
  box-shadow: var(--shadow-popup);
}

.title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
```

- [ ] **Step 4: Create `components/ui/Modal.tsx`**

```tsx
'use client';

import { type ReactNode, useEffect } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.title}>{title}</div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/Modal.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add components/ui/Modal.tsx components/ui/Modal.module.css tests/components/Modal.test.tsx
git commit -m "feat: add generic Modal component"
```

---

### Task 11: React Query provider + `useProductionState` hook

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`
- Create: `hooks/useProductionState.ts`
- Test: `tests/components/useProductionState.test.tsx`

**Interfaces:**
- Consumes: `ProductionState` from `lib/types.ts` (Task 2), `ToastProvider` from `components/ui/ToastProvider.tsx` (Task 9), `GET`/`POST /api/state` from Task 4 (via `fetch`, not a direct import).
- Produces: `Providers` component wrapping the whole app (React Query + Toast context). `useProductionState(): { state, isLoading, isError, isFetching, updateState, updateStateAsync }` from `hooks/useProductionState.ts` — consumed by the Input page (Task 16), Dashboard page (Task 20), `ResetModal` indirectly invalidates the same query key (Task 14).

- [ ] **Step 1: Create `app/providers.tsx`**

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 2 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Modify `app/layout.tsx` to wrap children with `Providers`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { TopNav } from '@/components/layout/TopNav';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'QC Gate Production',
  description: 'QC Gate Production Block Cylinder Line Finishing Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write the failing tests for `useProductionState`**

Create `tests/components/useProductionState.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import type { ProductionState } from '@/lib/types';

const baseState: ProductionState = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 1, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProductionState', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ success: true, data: baseState }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the initial state from GET /api/state', async () => {
    const { result } = renderHook(() => useProductionState(), { wrapper });
    await waitFor(() => expect(result.current.state).toEqual(baseState));
  });

  it('applies an optimistic update immediately when updateState is called', async () => {
    const { result } = renderHook(() => useProductionState(), { wrapper });
    await waitFor(() => expect(result.current.state).toEqual(baseState));

    const updated = { ...baseState, ok1: 2 };
    act(() => {
      result.current.updateState(updated);
    });

    await waitFor(() => expect(result.current.state?.ok1).toBe(2));
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run tests/components/useProductionState.test.tsx`
Expected: FAIL — `Cannot find module '@/hooks/useProductionState'`.

- [ ] **Step 5: Create `hooks/useProductionState.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductionState } from '@/lib/types';

const STATE_QUERY_KEY = ['productionState'] as const;
const POLL_INTERVAL_MS = 3000;
const OPTIMISTIC_GRACE_MS = 1500;

interface StateResponse {
  success: boolean;
  data: ProductionState | null;
  error?: string;
}

async function fetchState(): Promise<ProductionState | null> {
  const res = await fetch('/api/state');
  const json: StateResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load state');
  return json.data;
}

async function postState(state: ProductionState): Promise<void> {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  const json: StateResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to save state');
}

export function useProductionState() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: STATE_QUERY_KEY,
    queryFn: fetchState,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const mutation = useMutation({
    mutationFn: postState,
    onMutate: async (nextState) => {
      await queryClient.cancelQueries({ queryKey: STATE_QUERY_KEY });
      const previous = queryClient.getQueryData<ProductionState | null>(STATE_QUERY_KEY);
      queryClient.setQueryData(STATE_QUERY_KEY, nextState);
      return { previous };
    },
    onError: (_err, _nextState, context) => {
      if (context) queryClient.setQueryData(STATE_QUERY_KEY, context.previous);
    },
    onSuccess: () => {
      // Grace window: don't let an in-flight background poll immediately
      // overwrite the optimistic value we just applied (mirrors the old
      // Socket.IO `_lastUserAction` 1.5s safety lock).
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: STATE_QUERY_KEY });
      }, OPTIMISTIC_GRACE_MS);
    },
  });

  return {
    state: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    updateState: mutation.mutate,
    updateStateAsync: mutation.mutateAsync,
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/components/useProductionState.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Run the full suite and build**

Run: `npm test`
Run: `npm run build`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add app/providers.tsx app/layout.tsx hooks/useProductionState.ts tests/components/useProductionState.test.tsx
git commit -m "feat: add React Query provider and useProductionState polling hook"
```

---

### Task 12: `CounterCard` component

**Files:**
- Create: `components/production/CounterCard.tsx`
- Create: `components/production/CounterCard.module.css`
- Test: `tests/components/CounterCard.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CounterCard` (`{ label, variant: 'ok'|'repair'|'ng', value, onIncrement, onDecrement }`) — consumed by the Input page (Task 16).

- [ ] **Step 1: Write the failing tests**

Create `tests/components/CounterCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CounterCard } from '@/components/production/CounterCard';

describe('CounterCard', () => {
  it('shows the label and value', () => {
    render(<CounterCard label="OK" variant="ok" value={12} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onIncrement when + is clicked', async () => {
    const onIncrement = vi.fn();
    render(<CounterCard label="OK" variant="ok" value={0} onIncrement={onIncrement} onDecrement={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tambah OK' }));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('calls onDecrement when − is clicked', async () => {
    const onDecrement = vi.fn();
    render(<CounterCard label="OK" variant="ok" value={5} onIncrement={() => {}} onDecrement={onDecrement} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kurang OK' }));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/CounterCard.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/CounterCard'`.

- [ ] **Step 3: Create `components/production/CounterCard.module.css`**

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px;
  text-align: center;
}

.card.ok { border-top: 3px solid var(--accent-green); }
.card.repair { border-top: 3px solid var(--accent-orange); }
.card.ng { border-top: 3px solid var(--accent-red); }

.label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.card.ok .label { color: var(--accent-green); }
.card.repair .label { color: var(--accent-orange); }
.card.ng .label { color: var(--accent-red); }

.value {
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 14px;
  font-variant-numeric: tabular-nums;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.button {
  width: 44px;
  height: 38px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
}

.button:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-blue);
}

.button:active {
  transform: scale(0.93);
}
```

- [ ] **Step 4: Create `components/production/CounterCard.tsx`**

```tsx
'use client';

import styles from './CounterCard.module.css';

interface CounterCardProps {
  label: string;
  variant: 'ok' | 'repair' | 'ng';
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function CounterCard({ label, variant, value, onIncrement, onDecrement }: CounterCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onIncrement} aria-label={`Tambah ${label}`}>+</button>
        <button type="button" className={styles.button} onClick={onDecrement} aria-label={`Kurang ${label}`}>−</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/CounterCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add components/production/CounterCard.tsx components/production/CounterCard.module.css tests/components/CounterCard.test.tsx
git commit -m "feat: add CounterCard component"
```

---

### Task 13: `DefectModal` and `RepairModal`

**Files:**
- Create: `components/production/EntryModal.module.css`
- Create: `components/production/DefectModal.tsx`
- Create: `components/production/RepairModal.tsx`
- Test: `tests/components/DefectModal.test.tsx`
- Test: `tests/components/RepairModal.test.tsx`

**Interfaces:**
- Consumes: `Modal` from `components/ui/Modal.tsx` (Task 10), `DEFECT_TYPES`/`REPAIR_TYPES` from `utils/constants.ts` (Task 3).
- Produces: `DefectModal` (`{ isOpen, onClose, onSave: (defectType: string, qty: number) => void }`) and `RepairModal` (`{ isOpen, onClose, onSave: (repairType: string, qty: number) => void }`) — both consumed by the Input page (Task 16).

- [ ] **Step 1: Write the failing tests for `DefectModal`**

Create `tests/components/DefectModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefectModal } from '@/components/production/DefectModal';

describe('DefectModal', () => {
  it('lists all 10 fixed defect types', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(10);
  });

  it('calls onSave with the selected defect type and quantity', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Kandama Rear');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Kandama Rear', 3);
  });

  it('does not save when quantity is negative', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} />);
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/DefectModal.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/DefectModal'`.

- [ ] **Step 3: Create `components/production/EntryModal.module.css`** (shared by DefectModal, RepairModal, and ResetModal in Task 14)

```css
.field {
  display: block;
  margin-bottom: 16px;
}

.fieldLabel {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.select, .input {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
}

.input[type="number"] {
  text-align: center;
  font-weight: 700;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancelButton {
  padding: 9px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.saveButtonNg {
  padding: 9px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: var(--accent-red);
}

.saveButtonRepair {
  padding: 9px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: var(--accent-orange);
}
```

- [ ] **Step 4: Create `components/production/DefectModal.tsx`**

**Important:** hold the quantity field as a string, not a live-coerced number. A `parseInt(value) || 1` fallback on every keystroke snaps an emptied field straight back to `"1"`, so `clear()` never actually empties it and the next keystroke *appends* instead of *replacing* (`"1"` + typed `"3"` → `"13"`) — discovered by actually running the tests below, not by inspection. Parse to a number only at save time.

```tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEFECT_TYPES } from '@/utils/constants';
import styles from './EntryModal.module.css';

interface DefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (defectType: string, qty: number) => void;
}

export function DefectModal({ isOpen, onClose, onSave }: DefectModalProps) {
  const [defectType, setDefectType] = useState<string>(DEFECT_TYPES[0]);
  const [qtyInput, setQtyInput] = useState('1');

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty < 1) return;
    onSave(defectType, qty);
    setQtyInput('1');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Defect (NG)">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jenis Defect</span>
        <select
          className={styles.select}
          value={defectType}
          onChange={(event) => setDefectType(event.target.value)}
        >
          {DEFECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jumlah</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={999}
          value={qtyInput}
          onChange={(event) => setQtyInput(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>Batal</button>
        <button type="button" className={styles.saveButtonNg} onClick={handleSave}>Simpan</button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/DefectModal.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the failing tests for `RepairModal`**

Create `tests/components/RepairModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepairModal } from '@/components/production/RepairModal';

describe('RepairModal', () => {
  it('lists all 11 fixed repair types', () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(11);
  });

  it('calls onSave with the selected repair type and quantity', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Dakon');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Dakon', 2);
  });

  it('does not save when quantity is negative', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} />);
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '-1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npx vitest run tests/components/RepairModal.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/RepairModal'`.

- [ ] **Step 8: Create `components/production/RepairModal.tsx`**

Same string-held-quantity pattern as `DefectModal.tsx` above.

```tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { REPAIR_TYPES } from '@/utils/constants';
import styles from './EntryModal.module.css';

interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repairType: string, qty: number) => void;
}

export function RepairModal({ isOpen, onClose, onSave }: RepairModalProps) {
  const [repairType, setRepairType] = useState<string>(REPAIR_TYPES[0]);
  const [qtyInput, setQtyInput] = useState('1');

  function handleSave() {
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty < 1) return;
    onSave(repairType, qty);
    setQtyInput('1');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Repair">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jenis Repair</span>
        <select
          className={styles.select}
          value={repairType}
          onChange={(event) => setRepairType(event.target.value)}
        >
          {REPAIR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jumlah</span>
        <input
          type="number"
          className={styles.input}
          min={1}
          max={999}
          value={qtyInput}
          onChange={(event) => setQtyInput(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>Batal</button>
        <button type="button" className={styles.saveButtonRepair} onClick={handleSave}>Simpan</button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run tests/components/RepairModal.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add components/production/EntryModal.module.css components/production/DefectModal.tsx components/production/RepairModal.tsx tests/components/DefectModal.test.tsx tests/components/RepairModal.test.tsx
git commit -m "feat: add DefectModal and RepairModal components"
```

---

### Task 14: `useReset` hook + `ResetModal`

**Files:**
- Create: `hooks/useReset.ts`
- Create: `components/production/ResetModal.tsx`
- Test: `tests/components/ResetModal.test.tsx`

**Interfaces:**
- Consumes: `Modal` from `components/ui/Modal.tsx` (Task 10), `useToast` from `components/ui/ToastProvider.tsx` (Task 9), `EntryModal.module.css` from Task 13, `POST /api/reset` from Task 5 (via `fetch`).
- Produces: `useReset(): UseMutationResult<ProductionState, Error, string>` from `hooks/useReset.ts`. `ResetModal` (`{ isOpen, onClose }`) — consumed by the Input page (Task 16).

- [ ] **Step 1: Create `hooks/useReset.ts`**

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductionState } from '@/lib/types';

interface ResetResponse {
  success: boolean;
  data?: ProductionState;
  error?: string;
}

async function postReset(password: string): Promise<ProductionState> {
  const res = await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json: ResetResponse = await res.json();
  if (!json.success || !json.data) throw new Error(json.error ?? 'Reset failed');
  return json.data;
}

export function useReset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postReset,
    onSuccess: (freshState) => {
      queryClient.setQueryData(['productionState'], freshState);
    },
  });
}
```

- [ ] **Step 2: Write the failing tests for `ResetModal`**

Create `tests/components/ResetModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ResetModal } from '@/components/production/ResetModal';

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ResetModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows an error toast when the password is wrong', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Invalid reset password' }),
    });
    const onClose = vi.fn();
    renderWithProviders(<ResetModal isOpen onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('Masukkan password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Reset Data' }));

    expect(await screen.findByText('Password salah!')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes and shows a success toast when the password is correct', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { ok1: 0 } }),
    });
    const onClose = vi.fn();
    renderWithProviders(<ResetModal isOpen onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('Masukkan password'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Reset Data' }));

    expect(await screen.findByText('Data berhasil direset & diarsipkan')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/components/ResetModal.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/ResetModal'`.

- [ ] **Step 4: Create `components/production/ResetModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useReset } from '@/hooks/useReset';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './EntryModal.module.css';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetModal({ isOpen, onClose }: ResetModalProps) {
  const [password, setPassword] = useState('');
  const { showToast } = useToast();
  const reset = useReset();

  function handleConfirm() {
    reset.mutate(password, {
      onSuccess: () => {
        showToast('Data berhasil direset & diarsipkan', 'success');
        setPassword('');
        onClose();
      },
      onError: () => {
        showToast('Password salah!', 'error');
      },
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Konfirmasi Reset">
      <p className={styles.description}>
        Semua data produksi akan dihapus. Masukkan password untuk melanjutkan.
      </p>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Password</span>
        <input
          type="password"
          className={styles.input}
          placeholder="Masukkan password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>Batal</button>
        <button type="button" className={styles.saveButtonNg} onClick={handleConfirm}>Reset Data</button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/ResetModal.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add hooks/useReset.ts components/production/ResetModal.tsx tests/components/ResetModal.test.tsx
git commit -m "feat: add useReset hook and ResetModal"
```

---

### Task 15: `useHourlySnapshot` hook

**Files:**
- Create: `hooks/useHourlySnapshot.ts`
- Test: `tests/components/useHourlySnapshot.test.ts`

**Interfaces:**
- Consumes: `getOkTotal`, `getRepairTotal`, `getNgTotal`, `getGrandTotal` from `utils/rates.ts` (Task 3), `ProductionState` from `lib/types.ts` (Task 2).
- Produces: `useHourlySnapshot(current: ProductionState, updateState: (next: ProductionState) => void): void` — consumed by the Input page (Task 16).

- [ ] **Step 1: Write the failing tests**

Create `tests/components/useHourlySnapshot.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHourlySnapshot } from '@/hooks/useHourlySnapshot';
import type { ProductionState } from '@/lib/types';

const baseState: ProductionState = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 5, repair1: 1, ng1: 0, ok2: 3, repair2: 0, ng2: 1,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

describe('useHourlySnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a snapshot keyed by the current hour after 5 minutes', () => {
    const updateState = vi.fn();
    renderHook(() => useHourlySnapshot(baseState, updateState));

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(updateState).toHaveBeenCalledTimes(1);
    const [arg] = updateState.mock.calls[0];
    expect(arg.hourlyData).toEqual({ '14:00': { ok: 8, repair: 1, ng: 1 } });
  });

  it('does not record a snapshot while totals are still 0', () => {
    const updateState = vi.fn();
    const empty = { ...baseState, ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0 };
    renderHook(() => useHourlySnapshot(empty, updateState));

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(updateState).not.toHaveBeenCalled();
  });

  it('always reads the latest state even if it changed after mount', () => {
    const updateState = vi.fn();
    const { rerender } = renderHook(
      ({ state }) => useHourlySnapshot(state, updateState),
      { initialProps: { state: baseState } },
    );

    const updated = { ...baseState, ok1: 99 };
    rerender({ state: updated });

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(updateState).toHaveBeenCalledTimes(1);
    const [arg] = updateState.mock.calls[0];
    expect(arg.hourlyData['14:00'].ok).toBe(102);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/useHourlySnapshot.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useHourlySnapshot'`.

- [ ] **Step 3: Create `hooks/useHourlySnapshot.ts`**

```ts
'use client';

import { useEffect, useRef } from 'react';
import { getOkTotal, getRepairTotal, getNgTotal, getGrandTotal } from '@/utils/rates';
import type { ProductionState } from '@/lib/types';

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Records an hourly OK/Repair/NG snapshot every 5 minutes, keyed by the
 * current hour (e.g. "14:00") — matches the original app's
 * `setInterval(updateHourlyTable, 300000)` behavior. Skips recording while
 * totals are still 0 so idle hours don't pollute the table. Uses refs (not
 * effect dependencies) so the interval is set up exactly once and always
 * reads the freshest state/updateState, avoiding a stale-closure bug where
 * a snapshot would revert unrelated fields to whatever they were at mount.
 */
export function useHourlySnapshot(
  current: ProductionState,
  updateState: (next: ProductionState) => void,
): void {
  const currentRef = useRef(current);
  const updateStateRef = useRef(updateState);

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { updateStateRef.current = updateState; }, [updateState]);

  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = currentRef.current;
      const total = getGrandTotal(snapshot);
      if (total === 0) return;

      const now = new Date();
      const key = `${String(now.getHours()).padStart(2, '0')}:00`;

      updateStateRef.current({
        ...snapshot,
        hourlyData: {
          ...snapshot.hourlyData,
          [key]: { ok: getOkTotal(snapshot), repair: getRepairTotal(snapshot), ng: getNgTotal(snapshot) },
        },
      });
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/components/useHourlySnapshot.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useHourlySnapshot.ts tests/components/useHourlySnapshot.test.ts
git commit -m "feat: add useHourlySnapshot hook with stale-closure-safe interval"
```

---

### Task 16: `/input` page composition

**Files:**
- Create: `app/input/page.tsx`
- Create: `app/input/page.module.css`
- Test: `tests/components/InputPage.test.tsx`

**Interfaces:**
- Consumes: `useProductionState` (Task 11), `useToast` (Task 9), `CounterCard` (Task 12), `DefectModal`/`RepairModal` (Task 13), `ResetModal` (Task 14), `useHourlySnapshot` (Task 15), `getRates`/`getAchievementPercent`/`getProgressPercent`/`isNgAlarmActive` (Task 3), `SHIFTS` (Task 3), `ProductionState` (Task 2).
- Produces: the `/input` route. Nothing downstream consumes this directly — it's a leaf page.

- [ ] **Step 1: Create `app/input/page.module.css`**

```css
.page {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbarGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.toolbarLabel {
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toolbarInput, .toolbarSelect {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
}

.progressStrip {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.progressWrapper {
  flex: 1;
  min-width: 200px;
}

.progressLabel {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
}

.progressTrack {
  height: 10px;
  background: var(--bg-primary);
  border-radius: 99px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-green), #16a34a);
  border-radius: 99px;
}

.achievementBadge {
  background: var(--accent-green-soft);
  color: var(--accent-green);
  font-size: 14px;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 99px;
  font-variant-numeric: tabular-nums;
}

.productSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.productHeaderBc1, .productHeaderBc2 {
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
}

.productHeaderBc1::before, .productHeaderBc2::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 20px;
  border-radius: 2px;
}

.productHeaderBc1::before { background: var(--accent-bc1); }
.productHeaderBc2::before { background: var(--accent-bc2); }

.counterGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.rateStrip {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

.actionBar {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.btnDanger {
  padding: 9px 24px;
  border: 1px solid rgba(220,38,38,0.25);
  border-radius: var(--radius-sm);
  background: rgba(220,38,38,0.12);
  color: var(--accent-red);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 640px) {
  .counterGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Write the failing tests for the Input page**

Create `tests/components/InputPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/ToastProvider';

const updateStateMock = vi.fn();
const stateMock = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 5, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({ state: stateMock, updateState: updateStateMock }),
}));
vi.mock('@/hooks/useHourlySnapshot', () => ({ useHourlySnapshot: () => {} }));
vi.mock('@/hooks/useReset', () => ({ useReset: () => ({ mutate: vi.fn() }) }));

import InputPage from '@/app/input/page';

describe('InputPage', () => {
  // The mock is shared across tests (module-level `const`), so it must be
  // cleared between them — otherwise a later `not.toHaveBeenCalled()`
  // assertion sees a leftover call from an earlier test.
  beforeEach(() => {
    updateStateMock.mockClear();
  });

  it('renders the BC 1TR and BC 2TR OK counters with their current values', () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getAllByText('5')[0]).toBeInTheDocument();
  });

  it('calls updateState with an incremented OK count when + is clicked', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah OK' })[0]);
    expect(updateStateMock).toHaveBeenCalledWith(expect.objectContaining({ ok1: 6 }));
  });

  it('opens the Defect modal instead of incrementing directly when NG + is clicked', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah NG' })[0]);
    expect(screen.getByText('Input Defect (NG)')).toBeInTheDocument();
    expect(updateStateMock).not.toHaveBeenCalled();
  });

  it('opens the reset confirmation modal from the Reset button', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Konfirmasi Reset')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/components/InputPage.test.tsx`
Expected: FAIL — `Cannot find module '@/app/input/page'`.

- [ ] **Step 4: Create `app/input/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useHourlySnapshot } from '@/hooks/useHourlySnapshot';
import { useToast } from '@/components/ui/ToastProvider';
import { CounterCard } from '@/components/production/CounterCard';
import { DefectModal } from '@/components/production/DefectModal';
import { RepairModal } from '@/components/production/RepairModal';
import { ResetModal } from '@/components/production/ResetModal';
import {
  getRates, getAchievementPercent, getProgressPercent, isNgAlarmActive,
} from '@/utils/rates';
import { SHIFTS } from '@/utils/constants';
import type { ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

type CounterField = 'ok1' | 'repair1' | 'ng1' | 'ok2' | 'repair2' | 'ng2';

export default function InputPage() {
  const { state, updateState } = useProductionState();
  const { showToast } = useToast();
  const current = state ?? EMPTY_STATE;

  useHourlySnapshot(current, updateState);

  const [defectTarget, setDefectTarget] = useState<'ng1' | 'ng2' | null>(null);
  const [repairTarget, setRepairTarget] = useState<'repair1' | 'repair2' | null>(null);
  const [isResetOpen, setResetOpen] = useState(false);

  function commit(patch: Partial<ProductionState>) {
    const next = { ...current, ...patch };
    updateState(next);

    if (isNgAlarmActive(next)) {
      const { ngRate } = getRates(next);
      showToast(`⚠️ WARNING: NG Rate ${ngRate}% — melebihi batas 5%!`, 'error');
    }
  }

  function increment(field: CounterField) {
    commit({ [field]: current[field] + 1 } as Partial<ProductionState>);
  }

  function decrement(field: CounterField) {
    if (current[field] > 0) {
      commit({ [field]: current[field] - 1 } as Partial<ProductionState>);
    }
  }

  function handleSaveDefect(defectType: string, qty: number) {
    if (!defectTarget) return;
    commit({
      [defectTarget]: current[defectTarget] + qty,
      defectData: { ...current.defectData, [defectType]: (current.defectData[defectType] ?? 0) + qty },
    } as Partial<ProductionState>);
    showToast(`${qty}x ${defectType} ditambahkan`, 'error');
    setDefectTarget(null);
  }

  function handleSaveRepair(repairType: string, qty: number) {
    if (!repairTarget) return;
    commit({
      [repairTarget]: current[repairTarget] + qty,
      repairData: { ...current.repairData, [repairType]: (current.repairData[repairType] ?? 0) + qty },
    } as Partial<ProductionState>);
    showToast(`${qty}x ${repairType} ditambahkan`, 'warning');
    setRepairTarget(null);
  }

  const achievement = getAchievementPercent(current, current.target);
  const progress = getProgressPercent(current, current.target);
  const rates = getRates(current);

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Operator</span>
          <input
            className={styles.toolbarInput}
            value={current.operator}
            onChange={(event) => commit({ operator: event.target.value })}
            placeholder="Nama Operator"
          />
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Shift</span>
          <select
            className={styles.toolbarSelect}
            value={current.shift}
            onChange={(event) => commit({ shift: event.target.value })}
          >
            {SHIFTS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}
          </select>
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Target</span>
          <input
            type="number"
            className={styles.toolbarInput}
            value={current.target}
            min={0}
            onChange={(event) => commit({ target: parseInt(event.target.value, 10) || 0 })}
          />
        </label>
      </div>

      <div className={styles.progressStrip}>
        <div className={styles.progressWrapper}>
          <div className={styles.progressLabel}>
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={styles.achievementBadge}>Achievement: {achievement}%</div>
      </div>

      <section className={styles.productSection}>
        <h2 className={styles.productHeaderBc1}>BC 1TR</h2>
        <div className={styles.counterGrid}>
          <CounterCard label="OK" variant="ok" value={current.ok1} onIncrement={() => increment('ok1')} onDecrement={() => decrement('ok1')} />
          <CounterCard label="Repair" variant="repair" value={current.repair1} onIncrement={() => setRepairTarget('repair1')} onDecrement={() => decrement('repair1')} />
          <CounterCard label="NG" variant="ng" value={current.ng1} onIncrement={() => setDefectTarget('ng1')} onDecrement={() => decrement('ng1')} />
        </div>
      </section>

      <section className={styles.productSection}>
        <h2 className={styles.productHeaderBc2}>BC 2TR</h2>
        <div className={styles.counterGrid}>
          <CounterCard label="OK" variant="ok" value={current.ok2} onIncrement={() => increment('ok2')} onDecrement={() => decrement('ok2')} />
          <CounterCard label="Repair" variant="repair" value={current.repair2} onIncrement={() => setRepairTarget('repair2')} onDecrement={() => decrement('repair2')} />
          <CounterCard label="NG" variant="ng" value={current.ng2} onIncrement={() => setDefectTarget('ng2')} onDecrement={() => decrement('ng2')} />
        </div>
      </section>

      <div className={styles.rateStrip}>
        <span>OK Rate: {rates.okRate}%</span>
        <span>Repair Rate: {rates.repairRate}%</span>
        <span>NG Rate: {rates.ngRate}%</span>
      </div>

      <div className={styles.actionBar}>
        <button type="button" className={styles.btnDanger} onClick={() => setResetOpen(true)}>Reset</button>
      </div>

      <DefectModal
        isOpen={defectTarget !== null}
        onClose={() => setDefectTarget(null)}
        onSave={handleSaveDefect}
      />
      <RepairModal
        isOpen={repairTarget !== null}
        onClose={() => setRepairTarget(null)}
        onSave={handleSaveRepair}
      />
      <ResetModal isOpen={isResetOpen} onClose={() => setResetOpen(false)} />
    </main>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/InputPage.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Run the full suite and build**

Run: `npm test`
Run: `npm run build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add app/input/ tests/components/InputPage.test.tsx
git commit -m "feat: compose /input page (toolbar, counters, modals, reset)"
```

---

### Task 17: Chart.js setup + `ProductionChart` + `ParetoChart`

**Files:**
- Create: `lib/chartSetup.ts`
- Create: `components/production/ProductionChart.tsx`
- Create: `components/production/ParetoChart.tsx`
- Test: `tests/components/ProductionChart.test.tsx`
- Test: `tests/components/ParetoChart.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ProductionChart` (`{ ok, repair, ng }`) and `ParetoChart` (`{ data: Record<string, number>, color: string }`) — both consumed by the Dashboard page (Task 20) and `HistoryDetail` (Task 22).

- [ ] **Step 1: Create `lib/chartSetup.ts`**

```ts
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.color = '#9ca3b8';
ChartJS.defaults.font.family = "'Inter', sans-serif";
```

- [ ] **Step 2: Write the failing tests for `ProductionChart`**

Create `tests/components/ProductionChart.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const doughnutSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: any) => { doughnutSpy(props); return <div data-testid="doughnut-chart" />; },
  Bar: () => null,
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { ProductionChart } from '@/components/production/ProductionChart';

describe('ProductionChart', () => {
  // Clear between tests — otherwise mock.calls[0] in a later test still
  // refers to an earlier test's render.
  beforeEach(() => {
    doughnutSpy.mockClear();
  });

  it('passes OK/Repair/NG totals as the doughnut dataset', () => {
    render(<ProductionChart ok={10} repair={2} ng={1} />);
    const [props] = doughnutSpy.mock.calls[0];
    expect(props.data.datasets[0].data).toEqual([10, 2, 1]);
  });

  it('hides datalabels for zero-value slices', () => {
    render(<ProductionChart ok={0} repair={0} ng={0} />);
    const [props] = doughnutSpy.mock.calls[0];
    const formatted = props.options.plugins.datalabels.formatter(0);
    expect(formatted).toBe('');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/components/ProductionChart.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/ProductionChart'`.

- [ ] **Step 4: Create `components/production/ProductionChart.tsx`**

```tsx
'use client';

import '@/lib/chartSetup';
import { Doughnut } from 'react-chartjs-2';

interface ProductionChartProps {
  ok: number;
  repair: number;
  ng: number;
}

export function ProductionChart({ ok, repair, ng }: ProductionChartProps) {
  const total = ok + repair + ng;

  return (
    <Doughnut
      data={{
        labels: ['OK', 'Repair', 'NG'],
        datasets: [{
          data: [ok, repair, ng],
          backgroundColor: ['#22c55e', '#f59e0b', '#dc2626'],
          borderColor: 'transparent',
          borderWidth: 0,
        }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 13 },
            formatter: (value: number) => (total === 0 || value === 0 ? '' : value),
          },
        },
      }}
    />
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/ProductionChart.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the failing tests for `ParetoChart`**

Create `tests/components/ParetoChart.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const barSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Bar: (props: any) => { barSpy(props); return <div data-testid="bar-chart" />; },
  Doughnut: () => null,
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { ParetoChart } from '@/components/production/ParetoChart';

describe('ParetoChart', () => {
  beforeEach(() => {
    barSpy.mockClear();
  });

  it('sorts entries by count descending before charting', () => {
    render(<ParetoChart data={{ 'Gomi Drag': 2, Kake: 5 }} color="#dc2626" />);
    const [props] = barSpy.mock.calls[0];
    expect(props.data.labels).toEqual(['Kake', 'Gomi Drag']);
    expect(props.data.datasets[0].data).toEqual([5, 2]);
  });

  it('renders an empty chart when there is no data', () => {
    render(<ParetoChart data={{}} color="#dc2626" />);
    const [props] = barSpy.mock.calls[0];
    expect(props.data.labels).toEqual([]);
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npx vitest run tests/components/ParetoChart.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/ParetoChart'`.

- [ ] **Step 8: Create `components/production/ParetoChart.tsx`**

```tsx
'use client';

import '@/lib/chartSetup';
import { Bar } from 'react-chartjs-2';

interface ParetoChartProps {
  data: Record<string, number>;
  color: string;
}

export function ParetoChart({ data, color }: ParetoChartProps) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <Bar
      data={{
        labels: sorted.map(([name]) => name),
        datasets: [{ data: sorted.map(([, count]) => count), backgroundColor: color, borderRadius: 4 }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { color: '#f0f1f5', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45, color: '#9ca3b8' } },
          y: { grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true, ticks: { color: '#9ca3b8', stepSize: 1 } },
        },
      }}
    />
  );
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run tests/components/ParetoChart.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add lib/chartSetup.ts components/production/ProductionChart.tsx components/production/ParetoChart.tsx tests/components/ProductionChart.test.tsx tests/components/ParetoChart.test.tsx
git commit -m "feat: add Chart.js setup, ProductionChart, and ParetoChart components"
```

---

### Task 18: `HourlyTable` + `DefectRepairSummary`

**Files:**
- Create: `components/production/HourlyTable.tsx`
- Create: `components/production/HourlyTable.module.css`
- Create: `components/production/DefectRepairSummary.tsx`
- Create: `components/production/DefectRepairSummary.module.css`
- Test: `tests/components/HourlyTable.test.tsx`
- Test: `tests/components/DefectRepairSummary.test.tsx`

**Interfaces:**
- Consumes: `ProductionState` from `lib/types.ts` (Task 2).
- Produces: `HourlyTable` (`{ hourlyData: ProductionState['hourlyData'] }`) — consumed by Dashboard (Task 20) and `HistoryDetail` (Task 22). `DefectRepairSummary` (`{ title: string, data: Record<string, number> }`) — consumed by Dashboard (Task 20).

- [ ] **Step 1: Write the failing tests for `HourlyTable`**

Create `tests/components/HourlyTable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HourlyTable } from '@/components/production/HourlyTable';

describe('HourlyTable', () => {
  it('renders rows sorted by hour', () => {
    render(<HourlyTable hourlyData={{ '15:00': { ok: 2, repair: 0, ng: 0 }, '07:00': { ok: 5, repair: 1, ng: 0 } }} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows[0]).toHaveTextContent('07:00');
    expect(rows[1]).toHaveTextContent('15:00');
  });

  it('renders an empty body when there is no hourly data', () => {
    render(<HourlyTable hourlyData={{}} />);
    expect(screen.getAllByRole('row')).toHaveLength(1); // header row only
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/HourlyTable.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/HourlyTable'`.

- [ ] **Step 3: Create `components/production/HourlyTable.module.css`**

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.table th {
  background: var(--bg-card);
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  padding: 8px 10px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
}

.table td {
  padding: 7px 10px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Create `components/production/HourlyTable.tsx`**

```tsx
import type { ProductionState } from '@/lib/types';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
}

export function HourlyTable({ hourlyData }: HourlyTableProps) {
  const sortedHours = Object.keys(hourlyData).sort();

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Jam</th><th>OK</th><th>Repair</th><th>NG</th></tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => (
          <tr key={hour}>
            <td>{hour}</td>
            <td>{hourlyData[hour].ok}</td>
            <td>{hourlyData[hour].repair}</td>
            <td>{hourlyData[hour].ng}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/HourlyTable.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the failing tests for `DefectRepairSummary`**

Create `tests/components/DefectRepairSummary.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';

describe('DefectRepairSummary', () => {
  it('sorts entries by count descending', () => {
    render(<DefectRepairSummary title="Defect Details" data={{ 'Gomi Drag': 1, Kake: 5 }} />);
    const items = screen.getAllByText(/Gomi Drag|Kake/);
    expect(items[0]).toHaveTextContent('Kake');
  });

  it('shows an empty-state message when there is no data', () => {
    render(<DefectRepairSummary title="Defect Details" data={{}} />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npx vitest run tests/components/DefectRepairSummary.test.tsx`
Expected: FAIL — `Cannot find module '@/components/production/DefectRepairSummary'`.

- [ ] **Step 8: Create `components/production/DefectRepairSummary.module.css`**

```css
.title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
}

.count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--bg-card);
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 11px;
}

.empty {
  color: var(--text-muted);
  font-size: 12px;
}
```

- [ ] **Step 9: Create `components/production/DefectRepairSummary.tsx`**

```tsx
import styles from './DefectRepairSummary.module.css';

interface DefectRepairSummaryProps {
  title: string;
  data: Record<string, number>;
}

export function DefectRepairSummary({ title, data }: DefectRepairSummaryProps) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className={styles.title}>{title}</div>
      {sorted.length === 0 ? (
        <div className={styles.empty}>Belum ada data</div>
      ) : (
        sorted.map(([name, count]) => (
          <div key={name} className={styles.item}>
            <span>{name}</span>
            <span className={styles.count}>{count}</span>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run tests/components/DefectRepairSummary.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 11: Commit**

```bash
git add components/production/HourlyTable.tsx components/production/HourlyTable.module.css components/production/DefectRepairSummary.tsx components/production/DefectRepairSummary.module.css tests/components/HourlyTable.test.tsx tests/components/DefectRepairSummary.test.tsx
git commit -m "feat: add HourlyTable and DefectRepairSummary components"
```

---

### Task 19: Excel export utility

**Files:**
- Create: `utils/excelExport.ts`
- Test: `tests/unit/utils/excelExport.test.ts`

**Interfaces:**
- Consumes: `ProductionState` from `lib/types.ts` (Task 2).
- Produces: `buildShiftWorkbook(state)`, `buildShiftFileName(state)`, `exportShiftToExcel(state)` from `utils/excelExport.ts` — consumed by the Dashboard page (Task 20) and History page (Task 22).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/utils/excelExport.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildShiftWorkbook, buildShiftFileName } from '@/utils/excelExport';
import type { ProductionState } from '@/lib/types';

const state: ProductionState = {
  date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
  defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: { '07:00': { ok: 15, repair: 1, ng: 1 } },
  savedAt: '',
};

describe('buildShiftWorkbook', () => {
  it('always includes a Production sheet with OK/Repair/NG per product plus a total row', () => {
    const workbook = buildShiftWorkbook(state);
    expect(workbook.SheetNames).toContain('Production');
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Production']) as any[];
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ Produk: 'TOTAL', OK: 15, Repair: 1, NG: 1 });
  });

  it('only includes a Defect sheet when there is defect data', () => {
    expect(buildShiftWorkbook(state).SheetNames).toContain('Defect');
    expect(buildShiftWorkbook({ ...state, defectData: {} }).SheetNames).not.toContain('Defect');
  });

  it('only includes an Hourly sheet when there is hourly data', () => {
    expect(buildShiftWorkbook(state).SheetNames).toContain('Hourly');
    expect(buildShiftWorkbook({ ...state, hourlyData: {} }).SheetNames).not.toContain('Hourly');
  });
});

describe('buildShiftFileName', () => {
  it('replaces spaces in the shift name with underscores', () => {
    expect(buildShiftFileName(state)).toMatch(/^QC_Gate_Shift_Red_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/utils/excelExport.test.ts`
Expected: FAIL — `Cannot find module '@/utils/excelExport'`.

- [ ] **Step 3: Create `utils/excelExport.ts`**

```ts
import * as XLSX from 'xlsx';
import type { ProductionState } from '@/lib/types';

export function buildShiftWorkbook(state: ProductionState) {
  const prodData = [
    { Produk: 'BC 1TR', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok1, Repair: state.repair1, NG: state.ng1 },
    { Produk: 'BC 2TR', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok2, Repair: state.repair2, NG: state.ng2 },
    { Produk: 'TOTAL', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok1 + state.ok2, Repair: state.repair1 + state.repair2, NG: state.ng1 + state.ng2 },
  ];

  const defectDetail = Object.entries(state.defectData).sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ 'Jenis Defect': name, Jumlah: count }));

  const repairDetail = Object.entries(state.repairData).sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ 'Jenis Repair': name, Jumlah: count }));

  const hourlyDetail = Object.keys(state.hourlyData).sort()
    .map((key) => ({ Jam: key, OK: state.hourlyData[key].ok, Repair: state.hourlyData[key].repair, NG: state.hourlyData[key].ng }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(prodData), 'Production');
  if (defectDetail.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(defectDetail), 'Defect');
  if (repairDetail.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(repairDetail), 'Repair');
  if (hourlyDetail.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hourlyDetail), 'Hourly');

  return workbook;
}

export function buildShiftFileName(state: ProductionState): string {
  const shiftPart = state.shift.replace(/\s/g, '_');
  const datePart = new Date().toISOString().slice(0, 10);
  return `QC_Gate_${shiftPart}_${datePart}.xlsx`;
}

export function exportShiftToExcel(state: ProductionState): void {
  const workbook = buildShiftWorkbook(state);
  XLSX.writeFile(workbook, buildShiftFileName(state));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/utils/excelExport.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add utils/excelExport.ts tests/unit/utils/excelExport.test.ts
git commit -m "feat: add multi-sheet Excel export utility"
```

---

### Task 20: `/dashboard` page composition

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/page.module.css`
- Test: `tests/components/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `useProductionState` (Task 11), `ProductionChart`/`ParetoChart` (Task 17), `HourlyTable`/`DefectRepairSummary` (Task 18), `exportShiftToExcel` (Task 19), `getOkTotal`/`getRepairTotal`/`getNgTotal`/`getRates`/`getAchievementPercent`/`getProgressPercent` (Task 3), `ProductionState` (Task 2).
- Produces: the `/dashboard` route. Nothing downstream consumes this directly.

- [ ] **Step 1: Create `app/dashboard/page.module.css`**

```css
.page {
  padding: 24px 32px;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.statusBar {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.statusOnline { color: var(--accent-green); }
.statusOffline { color: var(--accent-red); }

.progressStrip {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.progressLabel {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.progressTrack {
  height: 10px;
  background: var(--bg-primary);
  border-radius: 99px;
  overflow: hidden;
  flex: 1;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-green), #16a34a);
  border-radius: 99px;
}

.achievementBadge {
  background: var(--accent-green-soft);
  color: var(--accent-green);
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 99px;
}

.rateStrip {
  grid-column: 1 / -1;
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

.chartsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.chartCard {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
}

.chartTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
}

.chartWrapper {
  position: relative;
  height: 220px;
}

.actionBar {
  display: flex;
  justify-content: flex-end;
}

.btnSuccess {
  padding: 9px 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent-green);
  color: #000;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.sidebar {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebarTitle {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 14px;
}

@media (max-width: 1024px) {
  .page { grid-template-columns: 1fr; }
  .chartsGrid { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/components/DashboardPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({
    state: {
      date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 40, repair1: 2, ng1: 1, ok2: 30, repair2: 1, ng2: 0,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {}, savedAt: '',
    },
    isFetching: false,
    isError: false,
  }),
}));
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null, Bar: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));

import DashboardPage from '@/app/dashboard/page';

describe('DashboardPage', () => {
  it('shows the current operator and shift', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Budi — Shift Red')).toBeInTheDocument();
  });

  it('shows computed achievement percentage', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Achievement: 74%')).toBeInTheDocument();
  });

  it('shows connection status from the hook', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Real-time Connected')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/components/DashboardPage.test.tsx`
Expected: FAIL — `Cannot find module '@/app/dashboard/page'`.

- [ ] **Step 4: Create `app/dashboard/page.tsx`**

```tsx
'use client';

import { useProductionState } from '@/hooks/useProductionState';
import { ProductionChart } from '@/components/production/ProductionChart';
import { ParetoChart } from '@/components/production/ParetoChart';
import { HourlyTable } from '@/components/production/HourlyTable';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';
import { getOkTotal, getRepairTotal, getNgTotal, getRates, getAchievementPercent, getProgressPercent } from '@/utils/rates';
import { exportShiftToExcel } from '@/utils/excelExport';
import type { ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

export default function DashboardPage() {
  const { state, isFetching, isError } = useProductionState();
  const current = state ?? EMPTY_STATE;

  const ok = getOkTotal(current);
  const repair = getRepairTotal(current);
  const ng = getNgTotal(current);
  const rates = getRates(current);
  const achievement = getAchievementPercent(current, current.target);
  const progress = getProgressPercent(current, current.target);

  return (
    <main className={styles.page}>
      <div className={styles.statusBar}>
        <span>{current.operator || 'Belum ada operator'} — {current.shift}</span>
        <span className={isError ? styles.statusOffline : styles.statusOnline}>
          {isError ? 'Disconnected' : isFetching ? 'Syncing…' : 'Real-time Connected'}
        </span>
      </div>

      <div className={styles.progressStrip}>
        <div style={{ flex: 1 }}>
          <div className={styles.progressLabel}><span>Progress</span><span>{progress}%</span></div>
          <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
        </div>
        <div className={styles.achievementBadge}>Achievement: {achievement}%</div>
      </div>

      <div className={styles.rateStrip}>
        <span>OK Rate: {rates.okRate}%</span>
        <span>Repair Rate: {rates.repairRate}%</span>
        <span>NG Rate: {rates.ngRate}%</span>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Production Distribution</div>
          <div className={styles.chartWrapper}><ProductionChart ok={ok} repair={repair} ng={ng} /></div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Pareto Defect (NG)</div>
          <div className={styles.chartWrapper}><ParetoChart data={current.defectData} color="#dc2626" /></div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Pareto Repair</div>
          <div className={styles.chartWrapper}><ParetoChart data={current.repairData} color="#f59e0b" /></div>
        </div>
      </div>

      <div className={styles.actionBar}>
        <button type="button" className={styles.btnSuccess} onClick={() => exportShiftToExcel(current)}>
          Save Data
        </button>
      </div>

      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sidebarTitle}>Hourly Production</div>
          <HourlyTable hourlyData={current.hourlyData} />
        </div>
        <DefectRepairSummary title="Defect Details" data={current.defectData} />
        <DefectRepairSummary title="Repair Details" data={current.repairData} />
      </aside>
    </main>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/DashboardPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Run the full suite and build**

Run: `npm test`
Run: `npm run build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/ tests/components/DashboardPage.test.tsx
git commit -m "feat: compose /dashboard page (charts, hourly table, summaries, export)"
```

---

### Task 21: `useHistory` hook + `HistoryFilterBar` + `HistoryTable`

**Files:**
- Create: `hooks/useHistory.ts`
- Create: `components/history/HistoryFilterBar.tsx`
- Create: `components/history/HistoryFilterBar.module.css`
- Create: `components/history/HistoryTable.tsx`
- Create: `components/history/HistoryTable.module.css`
- Test: `tests/components/HistoryFilterBar.test.tsx`
- Test: `tests/components/HistoryTable.test.tsx`

**Interfaces:**
- Consumes: `HistoryRecord` from `lib/types.ts` (Task 2), `SHIFTS` from `utils/constants.ts` (Task 3), `GET /api/history` from Task 6 (via `fetch`).
- Produces: `useHistory(filters): UseQueryResult<HistoryRecord[]>` — consumed by the History page (Task 22). `HistoryFilterBar` (`{ date, shift, onDateChange, onShiftChange }`) and `HistoryTable` (`{ records, expandedId, onToggle, renderDetail, onExport }`) — both consumed by the History page (Task 22).

- [ ] **Step 1: Create `hooks/useHistory.ts`**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import type { HistoryRecord } from '@/lib/types';

export interface HistoryFilters {
  date?: string;
  shift?: string;
}

interface HistoryResponse {
  success: boolean;
  data: HistoryRecord[];
  error?: string;
}

async function fetchHistory(filters: HistoryFilters): Promise<HistoryRecord[]> {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.shift) params.set('shift', filters.shift);

  const res = await fetch(`/api/history?${params.toString()}`);
  const json: HistoryResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load history');
  return json.data;
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ['history', filters],
    queryFn: () => fetchHistory(filters),
  });
}
```

- [ ] **Step 2: Write the failing tests for `HistoryFilterBar`**

Create `tests/components/HistoryFilterBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar';

describe('HistoryFilterBar', () => {
  it('calls onShiftChange when a shift is selected', async () => {
    const onShiftChange = vi.fn();
    render(<HistoryFilterBar date="" shift="" onDateChange={() => {}} onShiftChange={onShiftChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Shift White');
    expect(onShiftChange).toHaveBeenCalledWith('Shift White');
  });

  it('includes an "all shifts" option', () => {
    render(<HistoryFilterBar date="" shift="" onDateChange={() => {}} onShiftChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'Semua Shift' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/components/HistoryFilterBar.test.tsx`
Expected: FAIL — `Cannot find module '@/components/history/HistoryFilterBar'`.

- [ ] **Step 4: Create `components/history/HistoryFilterBar.module.css`**

```css
.bar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.field input, .field select {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
}
```

- [ ] **Step 5: Create `components/history/HistoryFilterBar.tsx`**

```tsx
'use client';

import { SHIFTS } from '@/utils/constants';
import styles from './HistoryFilterBar.module.css';

interface HistoryFilterBarProps {
  date: string;
  shift: string;
  onDateChange: (date: string) => void;
  onShiftChange: (shift: string) => void;
}

export function HistoryFilterBar({ date, shift, onDateChange, onShiftChange }: HistoryFilterBarProps) {
  return (
    <div className={styles.bar}>
      <label className={styles.field}>
        <span>Tanggal</span>
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Shift</span>
        <select value={shift} onChange={(event) => onShiftChange(event.target.value)}>
          <option value="">Semua Shift</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/components/HistoryFilterBar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Write the failing tests for `HistoryTable`**

Create `tests/components/HistoryTable.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryTable } from '@/components/history/HistoryTable';
import type { HistoryRecord } from '@/lib/types';

const record: HistoryRecord = {
  id: 1, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

describe('HistoryTable', () => {
  it('shows an empty state when there are no records', () => {
    render(<HistoryTable records={[]} expandedId={null} onToggle={() => {}} renderDetail={() => null} onExport={() => {}} />);
    expect(screen.getByText('Belum ada histori shift')).toBeInTheDocument();
  });

  it('renders one row per record with OK/Repair/NG totals summed across both products', () => {
    render(<HistoryTable records={[record]} expandedId={null} onToggle={() => {}} renderDetail={() => null} onExport={() => {}} />);
    const row = screen.getByText('Budi').closest('tr')!;
    expect(row).toHaveTextContent('90'); // ok1 + ok2
    expect(row).toHaveTextContent('3');  // repair1 + repair2
    expect(row).toHaveTextContent('1');  // ng1 + ng2
  });

  it('renders the detail row only for the expanded record', () => {
    render(
      <HistoryTable
        records={[record]}
        expandedId={1}
        onToggle={() => {}}
        renderDetail={() => <div data-testid="detail">detail content</div>}
        onExport={() => {}}
      />,
    );
    expect(screen.getByTestId('detail')).toBeInTheDocument();
  });

  it('calls onExport without triggering onToggle when Export is clicked', async () => {
    const onToggle = vi.fn();
    const onExport = vi.fn();
    render(<HistoryTable records={[record]} expandedId={null} onToggle={onToggle} renderDetail={() => null} onExport={onExport} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith(record);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run the tests to verify they fail**

Run: `npx vitest run tests/components/HistoryTable.test.tsx`
Expected: FAIL — `Cannot find module '@/components/history/HistoryTable'`.

- [ ] **Step 9: Create `components/history/HistoryTable.module.css`**

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th {
  text-align: left;
  padding: 10px 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: 11px;
  text-transform: uppercase;
}

.table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}

.row {
  cursor: pointer;
}

.row:hover {
  background: var(--bg-card-hover);
}

.empty {
  color: var(--text-muted);
  padding: 20px;
  text-align: center;
}
```

- [ ] **Step 10: Create `components/history/HistoryTable.tsx`**

```tsx
import { Fragment, type ReactNode } from 'react';
import type { HistoryRecord } from '@/lib/types';
import styles from './HistoryTable.module.css';

interface HistoryTableProps {
  records: HistoryRecord[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  renderDetail: (record: HistoryRecord) => ReactNode;
  onExport: (record: HistoryRecord) => void;
}

export function HistoryTable({ records, expandedId, onToggle, renderDetail, onExport }: HistoryTableProps) {
  if (records.length === 0) {
    return <div className={styles.empty}>Belum ada histori shift</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Tanggal</th><th>Shift</th><th>Operator</th><th>Target</th>
          <th>OK</th><th>Repair</th><th>NG</th><th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <Fragment key={record.id}>
            <tr onClick={() => onToggle(record.id)} className={styles.row}>
              <td>{record.date}</td>
              <td>{record.shift}</td>
              <td>{record.operator}</td>
              <td>{record.target}</td>
              <td>{record.ok1 + record.ok2}</td>
              <td>{record.repair1 + record.repair2}</td>
              <td>{record.ng1 + record.ng2}</td>
              <td>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onExport(record); }}
                >
                  Export
                </button>
              </td>
            </tr>
            {expandedId === record.id && (
              <tr>
                <td colSpan={8}>{renderDetail(record)}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 11: Run the tests to verify they pass**

Run: `npx vitest run tests/components/HistoryTable.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 12: Commit**

```bash
git add hooks/useHistory.ts components/history/HistoryFilterBar.tsx components/history/HistoryFilterBar.module.css components/history/HistoryTable.tsx components/history/HistoryTable.module.css tests/components/HistoryFilterBar.test.tsx tests/components/HistoryTable.test.tsx
git commit -m "feat: add useHistory hook, HistoryFilterBar, and HistoryTable"
```

---

### Task 22: `HistoryDetail` + `/history` page composition

**Files:**
- Create: `components/history/HistoryDetail.tsx`
- Create: `components/history/HistoryDetail.module.css`
- Create: `app/history/page.tsx`
- Create: `app/history/page.module.css`
- Test: `tests/components/HistoryPage.test.tsx`

**Interfaces:**
- Consumes: `ParetoChart` (Task 17), `HourlyTable` (Task 18), `useHistory` (Task 21), `HistoryFilterBar`/`HistoryTable` (Task 21), `exportShiftToExcel` (Task 19), `HistoryRecord` (Task 2).
- Produces: `HistoryDetail` (`{ record: HistoryRecord }`) — consumed only by the History page below. The `/history` route.

- [ ] **Step 1: Create `components/history/HistoryDetail.module.css`**

```css
.detail {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chartsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chartTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.chartWrapper {
  position: relative;
  height: 180px;
}
```

- [ ] **Step 2: Create `components/history/HistoryDetail.tsx`**

```tsx
import type { HistoryRecord } from '@/lib/types';
import { ParetoChart } from '@/components/production/ParetoChart';
import { HourlyTable } from '@/components/production/HourlyTable';
import styles from './HistoryDetail.module.css';

export function HistoryDetail({ record }: { record: HistoryRecord }) {
  return (
    <div className={styles.detail}>
      <div className={styles.chartsGrid}>
        <div>
          <div className={styles.chartTitle}>Pareto Defect (NG)</div>
          <div className={styles.chartWrapper}><ParetoChart data={record.defectData} color="#dc2626" /></div>
        </div>
        <div>
          <div className={styles.chartTitle}>Pareto Repair</div>
          <div className={styles.chartWrapper}><ParetoChart data={record.repairData} color="#f59e0b" /></div>
        </div>
      </div>
      <HourlyTable hourlyData={record.hourlyData} />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/history/page.module.css`**

```css
.page {
  padding: 24px 32px;
}

.error {
  color: var(--accent-red);
}
```

- [ ] **Step 4: Write the failing tests for the History page**

Create `tests/components/HistoryPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const useHistoryMock = vi.fn();
vi.mock('@/hooks/useHistory', () => ({ useHistory: (...args: any[]) => useHistoryMock(...args) }));

const exportMock = vi.fn();
vi.mock('@/utils/excelExport', () => ({ exportShiftToExcel: (...args: any[]) => exportMock(...args) }));

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));

import HistoryPage from '@/app/history/page';

const record = {
  id: 1, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

describe('HistoryPage', () => {
  it('renders a row per history record', () => {
    useHistoryMock.mockReturnValue({ data: [record], isLoading: false, isError: false });
    render(<HistoryPage />);
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('2026-08-04')).toBeInTheDocument();
  });

  it('shows an empty state when there is no history yet', () => {
    useHistoryMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<HistoryPage />);
    expect(screen.getByText('Belum ada histori shift')).toBeInTheDocument();
  });

  it('exports a record to Excel when its Export button is clicked', async () => {
    useHistoryMock.mockReturnValue({ data: [record], isLoading: false, isError: false });
    render(<HistoryPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(exportMock).toHaveBeenCalledWith(record);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run tests/components/HistoryPage.test.tsx`
Expected: FAIL — `Cannot find module '@/app/history/page'`.

- [ ] **Step 6: Create `app/history/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar';
import { HistoryTable } from '@/components/history/HistoryTable';
import { HistoryDetail } from '@/components/history/HistoryDetail';
import { exportShiftToExcel } from '@/utils/excelExport';
import styles from './page.module.css';

export default function HistoryPage() {
  const [date, setDate] = useState('');
  const [shift, setShift] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: records = [], isLoading, isError } = useHistory({ date: date || undefined, shift: shift || undefined });

  return (
    <main className={styles.page}>
      <HistoryFilterBar date={date} shift={shift} onDateChange={setDate} onShiftChange={setShift} />

      {isLoading && <p>Memuat histori…</p>}
      {isError && <p className={styles.error}>Gagal memuat histori.</p>}

      {!isLoading && !isError && (
        <HistoryTable
          records={records}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
          renderDetail={(record) => <HistoryDetail record={record} />}
          onExport={exportShiftToExcel}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run tests/components/HistoryPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 8: Run the full suite and build**

Run: `npm test`
Run: `npm run build`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add components/history/HistoryDetail.tsx components/history/HistoryDetail.module.css app/history/ tests/components/HistoryPage.test.tsx
git commit -m "feat: compose /history page (filters, table, expandable detail, export)"
```

---

### Task 23: Playwright end-to-end smoke test

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the running app (`/input`, `/dashboard`, `/history` routes) against a real Neon database. Requires `RESET_PASSWORD` set in the environment the dev server runs under.
- Produces: nothing consumed elsewhere — this is the final verification layer.

**Note:** this test needs a running dev server connected to a real (ideally a disposable Neon branch, not your main data) database, since Playwright drives the actual browser and actual API routes. `playwright.config.ts` (Task 1) already starts `npm run dev` for you.

- [ ] **Step 1: Create `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('operator enters counts on Input, sees them on Dashboard, resets, and finds the shift in History', async ({ page, context }) => {
  await page.goto('/input');

  await page.getByPlaceholder('Nama Operator').fill('Budi Santoso');
  await page.getByRole('button', { name: 'Tambah OK' }).first().click();
  await page.getByRole('button', { name: 'Tambah OK' }).first().click();

  const dashboard = await context.newPage();
  await dashboard.goto('/dashboard');
  await expect(dashboard.getByText(/Budi Santoso/)).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByPlaceholder('Masukkan password').fill(process.env.RESET_PASSWORD ?? '1234');
  await page.getByRole('button', { name: 'Reset Data' }).click();
  await expect(page.getByText('Data berhasil direset & diarsipkan')).toBeVisible();

  await page.goto('/history');
  await expect(page.getByText('Budi Santoso')).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test against your dev database**

Run: `npm run test:e2e`
Expected: PASS (1 test) — if it fails on the Dashboard visibility check, increase the `timeout` slightly above; the 3s poll interval plus network latency should still land well within 10s.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: add Playwright E2E smoke test across Input/Dashboard/History"
```

---

### Task 24: Cleanup, environment docs, and cutover

**Files:**
- Create: `README.md`
- Delete: `server.js`
- Delete: `database.js`
- Delete: `index.html`
- Delete: `qcgate.db`
- Delete: `package-lock.json` (regenerated fresh by `npm install` against the new `package.json`)

**Interfaces:**
- Consumes: nothing (documentation + repo cleanup).
- Produces: a repo where the Next.js app is the only implementation — no leftover vanilla-JS server to cause confusion about which one is "live".

- [ ] **Step 1: Create `README.md`**

```markdown
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
- `npm run test:e2e` — Playwright smoke test (requires a running dev server against a real/test Neon database)

## Migration history

This app was migrated from a single-page vanilla JS + Express/Socket.IO + sql.js implementation. See `docs/superpowers/specs/2026-08-05-web-react-neon-migration-design.md` and `docs/superpowers/plans/2026-08-05-web-react-neon-migration.md` for the full design and implementation history.
```

- [ ] **Step 2: Remove the obsolete vanilla-JS implementation**

Run:

```bash
git rm server.js database.js index.html qcgate.db package-lock.json
```

- [ ] **Step 3: Regenerate `package-lock.json` against the new `package.json`**

Run: `npm install`

- [ ] **Step 4: Run the full test suite and build one final time**

Run: `npm test`
Run: `npm run build`
Expected: all green — this is the final gate before considering the migration done.

- [ ] **Step 5: Commit**

```bash
git add README.md package-lock.json
git commit -m "chore: remove obsolete vanilla-JS server/frontend, add README for the Next.js app"
```

---

## Post-plan manual steps (not automatable, do these before relying on the app)

1. Set `DATABASE_URL`, `RESET_PASSWORD`, `CRON_SECRET` as environment variables in your Vercel project settings (not just `.env.local`), so the deployed app has them.
2. Deploy to Vercel and confirm the Cron entries in `vercel.json` show up under the project's Cron Jobs tab.
3. Do one real walkthrough on the deployed URL: enter a few counts on `/input`, watch them show up on `/dashboard` within ~3s from a second device/browser, reset, and confirm the shift appears on `/history`.
4. Optional UI polish pass: invoke the `impeccable` skill against the deployed app to review visual hierarchy, spacing, and accessibility now that the structural implementation is complete — the design spec calls this out as a deliberate follow-up rather than something to interleave with the functional build above.

