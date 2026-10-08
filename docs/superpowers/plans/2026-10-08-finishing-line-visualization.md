# Finishing Line Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public `/visualisasi` page that shows a looping low-poly Three.js animation of the BC finishing line (OK → truck, Repair → forklift round trip, NG → red box) plus OK/Repair/NG count tiles.

**Architecture:** Three layers. `utils/finishingFlow.ts` = static layout table + pure outcome pickers. `utils/finishingSim.ts` = a framework-free, step-based simulation (blocks, forklift, truck) that only produces positions/colours — fully unit-tested without WebGL. `components/visual/FinishingLine3D.tsx` = a thin Three.js renderer that steps the sim each frame and mirrors it into meshes. The page reads counts from the existing `useProductionState()` poll.

**Tech Stack:** Next.js 14 app router, React 18, TypeScript, `three@0.186.1` (+ `@types/three@0.186.0`), Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-08-finishing-line-visualization-design.md`

## Global Constraints

- Three.js only — no `@react-three/fiber`, no GLB/`.blend` import.
- Scope = Block Cylinder: counts are `getOkTotal/getRepairTotal/getNgTotal(state, 'bc')` from `utils/rates.ts` (line 1 + line 2).
- Running = `ok + repair + ng > 0`; reset zeroes them → animation clears and stops.
- Outcome at QC Gate 2 proportional to actual counts; repaired block NG probability = `ng / (ok + ng)`.
- `TRUCK_CAPACITY = 10`, `FORKLIFT_BATCH = 3`, spawn every `2` s.
- Page is public (do NOT add it to `PROTECTED_PATHS` in `components/layout/AuthGate.tsx`).
- No DB / API changes.
- UI copy in Indonesian; commit messages in the repo's style (`feat(visualisasi): …`), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commit locally after every task; do not push.

## Review Focus

1. **Shift reset while blocks are mid-flight** — scene must clear to empty and show "Produksi belum berjalan", not freeze with stale blocks. (Task 3 renderer: `!running` → `createSim()`; Task 4 browser step 8.)
2. **Only Repair entered so far (ok = ng = 0)** — re-inspection must not divide by zero; repaired blocks continue as OK. (Task 1 `pickReinspect` zero test; Task 2 repair round-trip test.)
3. **Truck away while OK blocks keep arriving** — blocks wait at Junbiki, truck never holds more than 10, live blocks stay bounded. (Task 2 truck test.)
4. **3 s poll updates counts** — must not rebuild the scene / restart the animation. (Task 3: counts read through a ref; Task 4 browser step 4.)
5. **Theme toggle and narrow screens** — background/floor follow theme; canvas resizes without horizontal page scroll. (Task 3 theme effect + ResizeObserver; Task 4 browser steps 5–6.)

---

### Task 1: Layout table and outcome pickers

**Files:**
- Create: `utils/finishingFlow.ts`
- Test: `tests/unit/utils/finishingFlow.test.ts`

**Interfaces:**
- Produces:
  - `type Vec2 = readonly [number, number]`, `type Outcome = 'ok' | 'repair' | 'ng'`
  - `interface Counts { ok: number; repair: number; ng: number }`
  - `type StationId`, `interface Station { id: StationId; label: string; pos: Vec2; shape: 'box' | 'cylinder'; size: readonly [number, number, number] }`
  - `STATIONS: readonly Station[]`, `ROUTES: { main; ok; ng }` (station-id tuples)
  - `stationPos(id: StationId): Vec2`, `routePoints(route: 'main' | 'ok' | 'ng'): Vec2[]`
  - `REPAIR_PALLET: Vec2`, `FORKLIFT_HOME: Vec2`, `TRUCK_DOCK: Vec2`
  - `isRunning(c: Counts): boolean`, `pickOutcome(c: Counts, r: number): Outcome`, `pickReinspect(c: Counts, r: number): 'ok' | 'ng'`
  - Constants: `SPAWN_INTERVAL_S, BLOCK_SPEED, FORKLIFT_SPEED, REPAIR_TIME_S, NG_LINGER_S, TRUCK_SPEED, TRUCK_AWAY_OFFSET, TRUCK_CAPACITY, FORKLIFT_BATCH`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/utils/finishingFlow.test.ts
import { describe, it, expect } from 'vitest';
import {
  STATIONS, ROUTES, stationPos, routePoints, isRunning, pickOutcome, pickReinspect,
} from '@/utils/finishingFlow';

describe('finishing line layout', () => {
  it('has unique station ids', () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('runs the main route in process order and splits at QC Gate 2', () => {
    expect(ROUTES.main).toEqual(['baritori', 'hsb05', 'hsb06', 'grinding', 'hanten', 'final', 'qc1', 'qc2']);
    expect(ROUTES.ok).toEqual(['qc2', 'spray', 'junbiki']);
    expect(ROUTES.ng).toEqual(['qc2', 'ngBox']);
  });

  it('resolves routes to station positions', () => {
    expect(routePoints('ng')).toEqual([stationPos('qc2'), stationPos('ngBox')]);
  });
});

describe('isRunning', () => {
  it('is false right after a reset (all zero)', () => {
    expect(isRunning({ ok: 0, repair: 0, ng: 0 })).toBe(false);
  });
  it('is true once anything is counted', () => {
    expect(isRunning({ ok: 0, repair: 1, ng: 0 })).toBe(true);
  });
});

describe('pickOutcome', () => {
  const c = { ok: 80, repair: 15, ng: 5 };
  it('splits r proportionally: ng band, then repair, then ok', () => {
    expect(pickOutcome(c, 0)).toBe('ng');
    expect(pickOutcome(c, 0.049)).toBe('ng');
    expect(pickOutcome(c, 0.05)).toBe('repair');
    expect(pickOutcome(c, 0.199)).toBe('repair');
    expect(pickOutcome(c, 0.2)).toBe('ok');
    expect(pickOutcome(c, 0.999)).toBe('ok');
  });
  it('defaults to ok with no counts', () => {
    expect(pickOutcome({ ok: 0, repair: 0, ng: 0 }, 0)).toBe('ok');
  });
});

describe('pickReinspect', () => {
  it('fails at ng / (ok + ng)', () => {
    const c = { ok: 90, repair: 50, ng: 10 };
    expect(pickReinspect(c, 0.099)).toBe('ng');
    expect(pickReinspect(c, 0.1)).toBe('ok');
  });
  it('passes as ok when only repairs exist (no divide by zero)', () => {
    expect(pickReinspect({ ok: 0, repair: 3, ng: 0 }, 0)).toBe('ok');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/finishingFlow.test.ts`
Expected: FAIL — cannot resolve `@/utils/finishingFlow`.

- [ ] **Step 3: Write minimal implementation**

```ts
// utils/finishingFlow.ts
// Static layout of the BC finishing line for /visualisasi, plus the pure
// outcome pickers. Positions are [x, z] on the floor; move a station by
// editing its row here (the real layout will be pointed out later).

export type Vec2 = readonly [number, number];
export type Outcome = 'ok' | 'repair' | 'ng';

export interface Counts {
  ok: number;
  repair: number;
  ng: number;
}

export type StationId =
  | 'baritori' | 'hsb05' | 'hsb06' | 'grinding' | 'hanten' | 'final'
  | 'qc1' | 'qc2' | 'spray' | 'junbiki' | 'ngBox' | 'lineRepair';

export interface Station {
  id: StationId;
  label: string;
  pos: Vec2;
  shape: 'box' | 'cylinder';
  // [width, height, depth]; a cylinder uses width as its diameter.
  size: readonly [number, number, number];
}

// Tall stations hide the block "inside the machine"; low ones (QC gates,
// Junbiki) stay under belt height so blocks ride visibly over them.
export const STATIONS: readonly Station[] = [
  { id: 'baritori', label: 'Baritori', pos: [-16, 6], shape: 'box', size: [3, 2, 3] },
  { id: 'hsb05', label: 'HSB05', pos: [-11, 6], shape: 'cylinder', size: [3.5, 3, 3.5] },
  { id: 'hsb06', label: 'HSB06', pos: [-6, 6], shape: 'cylinder', size: [3.5, 3, 3.5] },
  { id: 'grinding', label: 'Grinding', pos: [-1, 6], shape: 'box', size: [3, 2.2, 2.5] },
  { id: 'hanten', label: 'Hanten MC', pos: [4, 6], shape: 'box', size: [3, 2.5, 2.5] },
  { id: 'final', label: 'Final Proses', pos: [9, 6], shape: 'box', size: [3.5, 2.2, 2.5] },
  { id: 'qc1', label: 'QC Gate 1', pos: [14, 6], shape: 'box', size: [2.5, 0.6, 2] },
  { id: 'qc2', label: 'QC Gate 2', pos: [14, 0], shape: 'box', size: [2.5, 0.6, 2] },
  { id: 'spray', label: 'Spray Booth', pos: [8, -4], shape: 'box', size: [4, 3, 3] },
  { id: 'junbiki', label: 'Junbiki', pos: [0, -4], shape: 'box', size: [3, 0.6, 2.5] },
  { id: 'ngBox', label: 'Box Merah (NG)', pos: [19, 0], shape: 'box', size: [2, 1, 2] },
  { id: 'lineRepair', label: 'Line Repair', pos: [20, -8], shape: 'box', size: [4, 1.5, 3] },
];

export const ROUTES = {
  main: ['baritori', 'hsb05', 'hsb06', 'grinding', 'hanten', 'final', 'qc1', 'qc2'],
  ok: ['qc2', 'spray', 'junbiki'],
  ng: ['qc2', 'ngBox'],
} as const satisfies Record<string, readonly StationId[]>;

export const REPAIR_PALLET: Vec2 = [16.5, -2.5];
export const FORKLIFT_HOME: Vec2 = [16.5, -4.5];
export const TRUCK_DOCK: Vec2 = [-5, -4];

// Tuning knobs (seconds, floor units per second).
export const SPAWN_INTERVAL_S = 2;
export const BLOCK_SPEED = 4;
export const FORKLIFT_SPEED = 5;
export const REPAIR_TIME_S = 4;
export const NG_LINGER_S = 3;
export const TRUCK_SPEED = 10;
export const TRUCK_AWAY_OFFSET = -40;
export const TRUCK_CAPACITY = 10;
export const FORKLIFT_BATCH = 3;

export function stationPos(id: StationId): Vec2 {
  const s = STATIONS.find((st) => st.id === id);
  if (!s) throw new Error(`Unknown station: ${id}`);
  return s.pos;
}

export function routePoints(route: keyof typeof ROUTES): Vec2[] {
  return ROUTES[route].map(stationPos);
}

export function isRunning(c: Counts): boolean {
  return c.ok + c.repair + c.ng > 0;
}

// r in [0, 1). NG band first, then Repair, rest OK.
export function pickOutcome(c: Counts, r: number): Outcome {
  const total = c.ok + c.repair + c.ng;
  if (total === 0) return 'ok';
  const x = r * total;
  if (x < c.ng) return 'ng';
  if (x < c.ng + c.repair) return 'repair';
  return 'ok';
}

// No post-repair data exists, so a repaired block fails at the overall
// NG share of decided blocks.
export function pickReinspect(c: Counts, r: number): 'ok' | 'ng' {
  const decided = c.ok + c.ng;
  if (decided === 0) return 'ok';
  return r * decided < c.ng ? 'ng' : 'ok';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/finishingFlow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/finishingFlow.ts tests/unit/utils/finishingFlow.test.ts
git commit -m "feat(visualisasi): layout stasiun line finishing dan pemilih outcome

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Step-based simulation (blocks, forklift, truck)

**Files:**
- Create: `utils/finishingSim.ts`
- Test: `tests/unit/utils/finishingSim.test.ts`

**Interfaces:**
- Consumes (Task 1): `Vec2, Counts, Outcome, routePoints, stationPos, pickOutcome, pickReinspect, REPAIR_PALLET, FORKLIFT_HOME, TRUCK_DOCK` and all tuning constants.
- Produces:
  - `type Vec3 = [number, number, number]`, `type BlockColor = 'raw' | Outcome`
  - `type Phase = 'main' | 'ok' | 'ng' | 'toPallet' | 'atPallet' | 'onForklift' | 'waitJunbiki' | 'loaded' | 'binned'`
  - `interface Block { id: number; color: BlockColor; phase: Phase; path: Vec2[]; dist: number; timer: number; slot: number; pos: Vec3 }`
  - `interface Sim { blocks: Block[]; nextId: number; spawnTimer: number; forklift: { state: 'idle' | 'toRepair' | 'repairing' | 'toGate'; pos: [number, number]; timer: number; load: number[] }; truck: { state: 'docked' | 'leaving' | 'returning'; offset: number; load: number } }`
  - `createSim(): Sim`
  - `step(sim: Sim, dt: number, counts: Counts, rand?: () => number): void` — mutates `sim`; afterwards every block's `pos` is its world position.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/utils/finishingSim.test.ts
import { describe, it, expect } from 'vitest';
import { createSim, step, type Sim } from '@/utils/finishingSim';
import { stationPos, TRUCK_CAPACITY, type Counts } from '@/utils/finishingFlow';

// Advance in 0.1 s ticks; `watch` sees the sim after every tick.
function run(sim: Sim, seconds: number, counts: Counts, rand: () => number, watch?: (s: Sim) => void) {
  for (let t = 0; t < seconds; t += 0.1) {
    step(sim, 0.1, counts, rand);
    watch?.(sim);
  }
}

// Exactly one block in flight: spawn it, then disable further spawns.
function single(): Sim {
  const sim = createSim();
  step(sim, 2, { ok: 1, repair: 0, ng: 0 }, () => 0.5);
  sim.spawnTimer = -1e9;
  return sim;
}

describe('finishing simulation', () => {
  it('spawns a raw block at Baritori every 2 s', () => {
    const sim = createSim();
    step(sim, 1.9, { ok: 1, repair: 0, ng: 0 });
    expect(sim.blocks).toHaveLength(0);
    step(sim, 0.1, { ok: 1, repair: 0, ng: 0 });
    expect(sim.blocks).toHaveLength(1);
    expect(sim.blocks[0].color).toBe('raw');
    expect(sim.blocks[0].path[0]).toEqual(stationPos('baritori'));
  });

  it('sends NG to the red box, piles it, then removes it', () => {
    const sim = single();
    let sawBinned = false;
    run(sim, 20, { ok: 0, repair: 0, ng: 1 }, () => 0, (s) => {
      if (s.blocks[0]?.phase === 'binned') {
        sawBinned = true;
        expect(s.blocks[0].color).toBe('ng');
      }
    });
    expect(sawBinned).toBe(true);
    expect(sim.blocks).toHaveLength(0);
  });

  it('takes a repair block by forklift to Line Repair and back, then onto the truck', () => {
    const sim = single();
    const forkStates = new Set<string>();
    run(sim, 40, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => forkStates.add(s.forklift.state));
    expect([...forkStates]).toEqual(expect.arrayContaining(['toRepair', 'repairing', 'toGate', 'idle']));
    expect(sim.blocks[0].phase).toBe('loaded');
    expect(sim.blocks[0].color).toBe('ok');
  });

  it('re-inspects a repaired block as NG and bins it', () => {
    const sim = single();
    // 1st draw at QC Gate 2: 0.75 → repair band for {ok:0, repair:1, ng:1}
    // 2nd draw at re-inspection: 0 → ng (ng / (ok + ng) = 1)
    const draws = [0.75, 0];
    let i = 0;
    const rand = () => draws[Math.min(i++, draws.length - 1)];
    let sawForklift = false;
    let sawBinnedAfter = false;
    run(sim, 40, { ok: 0, repair: 1, ng: 1 }, rand, (s) => {
      const b = s.blocks[0];
      if (b?.phase === 'onForklift') sawForklift = true;
      if (sawForklift && b?.phase === 'binned') sawBinnedAfter = true;
    });
    expect(sawForklift).toBe(true);
    expect(sawBinnedAfter).toBe(true);
  });

  it('ships the truck at capacity, never overloads it, keeps blocks bounded', () => {
    const sim = createSim();
    const states = new Set<string>();
    let maxLoaded = 0;
    let maxBlocks = 0;
    run(sim, 90, { ok: 1, repair: 0, ng: 0 }, () => 0.5, (s) => {
      states.add(s.truck.state);
      maxLoaded = Math.max(maxLoaded, s.blocks.filter((b) => b.phase === 'loaded').length);
      maxBlocks = Math.max(maxBlocks, s.blocks.length);
    });
    expect([...states]).toEqual(expect.arrayContaining(['docked', 'leaving', 'returning']));
    expect(maxLoaded).toBe(TRUCK_CAPACITY);
    expect(maxBlocks).toBeLessThan(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/finishingSim.test.ts`
Expected: FAIL — cannot resolve `@/utils/finishingSim`.

- [ ] **Step 3: Write minimal implementation**

```ts
// utils/finishingSim.ts
// Framework-free simulation of the finishing line. step() mutates the sim
// and leaves every block's world position in `pos`; the Three.js renderer
// only mirrors it. Called only while production is running.
import {
  BLOCK_SPEED, FORKLIFT_BATCH, FORKLIFT_HOME, FORKLIFT_SPEED, NG_LINGER_S,
  REPAIR_PALLET, REPAIR_TIME_S, SPAWN_INTERVAL_S, TRUCK_AWAY_OFFSET,
  TRUCK_CAPACITY, TRUCK_DOCK, TRUCK_SPEED,
  pickOutcome, pickReinspect, routePoints, stationPos,
  type Counts, type Outcome, type Vec2,
} from './finishingFlow';

export type Vec3 = [number, number, number];
export type BlockColor = 'raw' | Outcome;
export type Phase =
  | 'main' | 'ok' | 'ng' | 'toPallet' | 'atPallet'
  | 'onForklift' | 'waitJunbiki' | 'loaded' | 'binned';

export interface Block {
  id: number;
  color: BlockColor;
  phase: Phase;
  path: Vec2[];
  dist: number;
  timer: number;
  slot: number;
  pos: Vec3;
}

export interface Sim {
  blocks: Block[];
  nextId: number;
  spawnTimer: number;
  forklift: { state: 'idle' | 'toRepair' | 'repairing' | 'toGate'; pos: [number, number]; timer: number; load: number[] };
  truck: { state: 'docked' | 'leaving' | 'returning'; offset: number; load: number };
}

const BELT_Y = 1;
const BLOCK = 0.6;

export function createSim(): Sim {
  return {
    blocks: [],
    nextId: 1,
    spawnTimer: 0,
    forklift: { state: 'idle', pos: [FORKLIFT_HOME[0], FORKLIFT_HOME[1]], timer: 0, load: [] },
    truck: { state: 'docked', offset: 0, load: 0 },
  };
}

function pointAlong(path: Vec2[], dist: number): { p: Vec2; done: boolean } {
  let left = dist;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const len = Math.hypot(bx - ax, bz - az);
    if (left <= len) {
      const t = len === 0 ? 1 : left / len;
      return { p: [ax + (bx - ax) * t, az + (bz - az) * t], done: false };
    }
    left -= len;
  }
  return { p: path[path.length - 1], done: true };
}

// Moves `pos` toward `target` by at most `maxStep`; true once arrived.
function moveTo(pos: [number, number], target: Vec2, maxStep: number): boolean {
  const dx = target[0] - pos[0];
  const dz = target[1] - pos[1];
  const d = Math.hypot(dx, dz);
  if (d <= maxStep) {
    pos[0] = target[0];
    pos[1] = target[1];
    return true;
  }
  pos[0] += (dx / d) * maxStep;
  pos[1] += (dz / d) * maxStep;
  return false;
}

function send(b: Block, phase: Phase, path: Vec2[]): void {
  b.phase = phase;
  b.path = path;
  b.dist = 0;
}

function travel(b: Block, dt: number): boolean {
  b.dist += BLOCK_SPEED * dt;
  const { p, done } = pointAlong(b.path, b.dist);
  b.pos = [p[0], BELT_Y, p[1]];
  return done;
}

function spawn(sim: Sim): void {
  const path = routePoints('main');
  sim.blocks.push({
    id: sim.nextId++, color: 'raw', phase: 'main', path, dist: 0, timer: 0, slot: 0,
    pos: [path[0][0], BELT_Y, path[0][1]],
  });
}

function stepTruck(sim: Sim, dt: number): void {
  const t = sim.truck;
  if (t.state === 'docked') {
    if (t.load >= TRUCK_CAPACITY) t.state = 'leaving';
  } else if (t.state === 'leaving') {
    t.offset -= TRUCK_SPEED * dt;
    if (t.offset <= TRUCK_AWAY_OFFSET) {
      sim.blocks = sim.blocks.filter((b) => b.phase !== 'loaded');
      t.load = 0;
      t.state = 'returning';
    }
  } else {
    t.offset = Math.min(0, t.offset + TRUCK_SPEED * dt);
    if (t.offset === 0) t.state = 'docked';
  }
}

function stepForklift(sim: Sim, dt: number, counts: Counts, rand: () => number): void {
  const f = sim.forklift;
  if (f.state === 'idle') {
    const waiting = sim.blocks.filter((b) => b.phase === 'atPallet').slice(0, FORKLIFT_BATCH);
    if (waiting.length === 0) return;
    for (const b of waiting) b.phase = 'onForklift';
    f.load = waiting.map((b) => b.id);
    f.state = 'toRepair';
  } else if (f.state === 'toRepair') {
    if (moveTo(f.pos, stationPos('lineRepair'), FORKLIFT_SPEED * dt)) {
      f.state = 'repairing';
      f.timer = REPAIR_TIME_S;
    }
  } else if (f.state === 'repairing') {
    f.timer -= dt;
    if (f.timer <= 0) f.state = 'toGate';
  } else if (moveTo(f.pos, FORKLIFT_HOME, FORKLIFT_SPEED * dt)) {
    // Back at QC Gate 2: re-inspect every repaired block.
    for (const id of f.load) {
      const b = sim.blocks.find((x) => x.id === id);
      if (!b) continue;
      const o = pickReinspect(counts, rand());
      b.color = o;
      send(b, o, [FORKLIFT_HOME, ...routePoints(o)]);
    }
    f.load = [];
    f.state = 'idle';
  }
}

function stepBlock(sim: Sim, b: Block, dt: number, counts: Counts, rand: () => number): void {
  switch (b.phase) {
    case 'main':
      if (travel(b, dt)) {
        const o = pickOutcome(counts, rand());
        b.color = o;
        if (o === 'repair') send(b, 'toPallet', [stationPos('qc2'), REPAIR_PALLET]);
        else send(b, o, routePoints(o));
      }
      break;
    case 'ok':
      if (travel(b, dt)) b.phase = 'waitJunbiki';
      break;
    case 'ng':
      if (travel(b, dt)) {
        b.phase = 'binned';
        b.timer = NG_LINGER_S;
      }
      break;
    case 'toPallet':
      if (travel(b, dt)) b.phase = 'atPallet';
      break;
    case 'binned':
      b.timer -= dt;
      break;
    default:
      break;
  }
  if (b.phase === 'waitJunbiki' && sim.truck.state === 'docked' && sim.truck.load < TRUCK_CAPACITY) {
    b.phase = 'loaded';
    b.slot = sim.truck.load++;
  }
}

// Parked phases take their position from where they are parked.
function layout(sim: Sim): void {
  let pallet = 0;
  let queue = 0;
  const [ngX, ngZ] = stationPos('ngBox');
  const [jx, jz] = stationPos('junbiki');
  for (const b of sim.blocks) {
    if (b.phase === 'atPallet') {
      b.pos = [REPAIR_PALLET[0], 0.4 + BLOCK * pallet++, REPAIR_PALLET[1]];
    } else if (b.phase === 'onForklift') {
      const i = sim.forklift.load.indexOf(b.id);
      b.pos = [sim.forklift.pos[0], 1.2 + BLOCK * i, sim.forklift.pos[1] - 0.8];
    } else if (b.phase === 'waitJunbiki') {
      b.pos = [jx + 0.8 * queue++, BELT_Y, jz];
    } else if (b.phase === 'loaded') {
      b.pos = [
        TRUCK_DOCK[0] + sim.truck.offset - 1.4 + (b.slot % 5) * 0.7,
        1.6 + Math.floor(b.slot / 5) * BLOCK,
        TRUCK_DOCK[1],
      ];
    } else if (b.phase === 'binned') {
      b.pos = [ngX + ((b.id % 3) - 1) * 0.5, 1.3, ngZ];
    }
  }
}

export function step(sim: Sim, dt: number, counts: Counts, rand: () => number = Math.random): void {
  sim.spawnTimer += dt;
  while (sim.spawnTimer >= SPAWN_INTERVAL_S) {
    sim.spawnTimer -= SPAWN_INTERVAL_S;
    spawn(sim);
  }
  stepTruck(sim, dt);
  stepForklift(sim, dt, counts, rand);
  for (const b of sim.blocks) stepBlock(sim, b, dt, counts, rand);
  sim.blocks = sim.blocks.filter((b) => !(b.phase === 'binned' && b.timer <= 0));
  layout(sim);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/finishingSim.test.ts`
Expected: PASS (5 tests). If the spawn test is off by one tick due to float accumulation (`1.9 + 0.1`), change the first call to `step(sim, 1.5, …)` and the second to `step(sim, 0.5, …)` — the assertion intent (no block before 2 s, one block at 2 s) stays the same.

- [ ] **Step 5: Commit**

```bash
git add utils/finishingSim.ts tests/unit/utils/finishingSim.test.ts
git commit -m "feat(visualisasi): simulasi aliran block, forklift repair, dan truk

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Three.js renderer component

**Files:**
- Modify: `package.json`, `package-lock.json` (add `three`, dev `@types/three`)
- Create: `components/visual/FinishingLine3D.tsx`

**Interfaces:**
- Consumes (Task 1): `STATIONS, ROUTES, stationPos, REPAIR_PALLET, TRUCK_DOCK, type Counts, type Vec2`; (Task 2): `createSim, step, type BlockColor`; `type Theme` from `@/hooks/useTheme`.
- Produces: `export default function FinishingLine3D(props: { counts: Counts; running: boolean; theme: Theme })` — client-only, fills its parent.

No unit test: WebGL is unavailable in jsdom, and all the logic it mirrors is tested in Tasks 1–2. Verified in the browser in Task 4.

- [ ] **Step 1: Install dependencies**

Run: `npm install three@0.186.1 && npm install -D @types/three@0.186.0`
Expected: both added to `package.json`.

- [ ] **Step 2: Write the component**

```tsx
// components/visual/FinishingLine3D.tsx
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  REPAIR_PALLET, ROUTES, STATIONS, TRUCK_DOCK, stationPos,
  type Counts, type Vec2,
} from '@/utils/finishingFlow';
import { createSim, step, type BlockColor } from '@/utils/finishingSim';
import type { Theme } from '@/hooks/useTheme';

const BLOCK_COLORS: Record<BlockColor, number> = {
  raw: 0x9ca3af, ok: 0x22c55e, repair: 0xf59e0b, ng: 0xdc2626,
};
const SCENE_BG: Record<Theme, number> = { dark: 0x0f1117, light: 0xf3f4f6 };
const FLOOR: Record<Theme, number> = { dark: 0x2e3346, light: 0xc9ccd3 };

interface Props {
  counts: Counts;
  running: boolean;
  theme: Theme;
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = 'rgba(15,17,23,0.82)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#ffffff';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }),
  );
  sprite.scale.set(4, 1, 1);
  return sprite;
}

function belt(a: Vec2, b: Vec2, mat: THREE.Material): THREE.Mesh {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dz), 0.2, 1.1), mat);
  mesh.position.set((a[0] + b[0]) / 2, 0.6, (a[1] + b[1]) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  return mesh;
}

function makeForklift(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 2), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  body.position.y = 0.7;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x374151 }));
  mast.position.set(0, 1.2, -1.05);
  g.add(body, mast);
  return g;
}

function makeTruck(): THREE.Group {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
  cab.position.set(-3.4, 1.4, 0);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 2.4), new THREE.MeshStandardMaterial({ color: 0x6b7280 }));
  bed.position.set(0, 1.15, 0);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-3.4, 1.2], [-3.4, -1.2], [1.2, 1.2], [1.2, -1.2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  g.add(cab, bed);
  return g;
}

export default function FinishingLine3D({ counts, running, theme }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Read by the render loop, so a 3 s poll updates these without rebuilding the scene.
  const live = useRef({ counts, running });
  live.current = { counts, running };
  const applyTheme = useRef<(t: Theme) => void>(() => {});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    camera.position.set(10, 38, 34);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(2, 0, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 30, 15);
    scene.add(sun);

    const floorMat = new THREE.MeshStandardMaterial();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(2, 0, -1);
    scene.add(floor);

    // Beige machines, like the reference video.
    const machineMat = new THREE.MeshStandardMaterial({ color: 0xd6c4a1 });
    const ngMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c });
    for (const s of STATIONS) {
      const [w, h, d] = s.size;
      const geo = s.shape === 'cylinder'
        ? new THREE.CylinderGeometry(w / 2, w / 2, h, 32)
        : new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, s.id === 'ngBox' ? ngMat : machineMat);
      mesh.position.set(s.pos[0], h / 2, s.pos[1]);
      scene.add(mesh);
      const label = makeLabel(s.label);
      label.position.set(s.pos[0], Math.max(h, 1) + 1.4, s.pos[1]);
      scene.add(label);
    }

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x4b5563 });
    for (const route of [ROUTES.main, ROUTES.ok]) {
      for (let i = 1; i < route.length; i++) scene.add(belt(stationPos(route[i - 1]), stationPos(route[i]), beltMat));
    }

    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 1.4), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    pallet.position.set(REPAIR_PALLET[0], 0.08, REPAIR_PALLET[1]);
    scene.add(pallet);

    const forklift = makeForklift();
    scene.add(forklift);
    const truck = makeTruck();
    truck.position.set(TRUCK_DOCK[0], 0, TRUCK_DOCK[1]);
    scene.add(truck);

    const blockGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const blockMats = Object.fromEntries(
      Object.entries(BLOCK_COLORS).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c })]),
    ) as Record<BlockColor, THREE.MeshStandardMaterial>;
    const meshes = new Map<number, THREE.Mesh>();

    applyTheme.current = (t) => {
      scene.background = new THREE.Color(SCENE_BG[t]);
      floorMat.color.set(FLOOR[t]);
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let sim = createSim();
    let last = performance.now();
    let raf = 0;
    // requestAnimationFrame already pauses in hidden tabs; the dt clamp
    // stops a jump when the tab comes back.
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (live.current.running) step(sim, dt, live.current.counts);
      else if (sim.nextId > 1) sim = createSim();

      const seen = new Set<number>();
      for (const b of sim.blocks) {
        seen.add(b.id);
        let m = meshes.get(b.id);
        if (!m) {
          m = new THREE.Mesh(blockGeo, blockMats[b.color]);
          meshes.set(b.id, m);
          scene.add(m);
        }
        m.material = blockMats[b.color];
        m.position.set(b.pos[0], b.pos[1], b.pos[2]);
      }
      for (const [id, m] of meshes) {
        if (!seen.has(id)) {
          scene.remove(m);
          meshes.delete(id);
        }
      }
      forklift.position.set(sim.forklift.pos[0], 0, sim.forklift.pos[1]);
      truck.position.x = TRUCK_DOCK[0] + sim.truck.offset;

      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const m of meshes.values()) scene.remove(m);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        if (obj instanceof THREE.Sprite) obj.material.map?.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      });
      blockGeo.dispose();
      Object.values(blockMats).forEach((m) => m.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    applyTheme.current(theme);
  }, [theme]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/visual/FinishingLine3D.tsx
git commit -m "feat(visualisasi): renderer three.js line finishing, forklift, dan truk

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `/visualisasi` page, count tiles, nav link

**Files:**
- Create: `app/visualisasi/page.tsx`
- Create: `app/visualisasi/page.module.css`
- Modify: `components/layout/TopNav.tsx:13-18` (`LINKS`)

**Interfaces:**
- Consumes: `useProductionState()` → `{ state }` (`ProductionState | null | undefined`); `useTheme()` → `{ theme }`; `getOkTotal/getRepairTotal/getNgTotal(c, 'bc')` from `@/utils/rates`; `isRunning, type Counts` from `@/utils/finishingFlow`; default export of `@/components/visual/FinishingLine3D`.

- [ ] **Step 1: Add the nav link**

In `components/layout/TopNav.tsx`, change `LINKS` to:

```ts
const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/visualisasi', label: 'Visualisasi' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
  { href: '/master-data', label: 'Master Data' },
] as const;
```

- [ ] **Step 2: Write the page and styles**

```tsx
// app/visualisasi/page.tsx
'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useTheme } from '@/hooks/useTheme';
import { getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import { isRunning, type Counts } from '@/utils/finishingFlow';
import styles from './page.module.css';

const FinishingLine3D = dynamic(() => import('@/components/visual/FinishingLine3D'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Memuat 3D…</div>,
});

const TILES = [
  { key: 'ok', label: 'OK', color: 'var(--accent-green)' },
  { key: 'repair', label: 'Repair', color: 'var(--accent-orange)' },
  { key: 'ng', label: 'NG', color: 'var(--accent-red)' },
] as const;

export default function VisualisasiPage() {
  const { state } = useProductionState();
  const { theme } = useTheme();

  const counts: Counts = state
    ? { ok: getOkTotal(state, 'bc'), repair: getRepairTotal(state, 'bc'), ng: getNgTotal(state, 'bc') }
    : { ok: 0, repair: 0, ng: 0 };
  const total = counts.ok + counts.repair + counts.ng;
  const running = isRunning(counts);

  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        {TILES.map((t) => (
          <div key={t.key} className={styles.tile} style={{ '--tile-color': t.color } as CSSProperties}>
            <span className={styles.tileLabel}>{t.label}</span>
            <span className={styles.tileValue}>{counts[t.key]}</span>
            <span className={styles.tilePct}>
              {total ? `${((counts[t.key] / total) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.stage}>
        <FinishingLine3D counts={counts} running={running} theme={theme} />
        {!running && <div className={styles.overlay}>Produksi belum berjalan</div>}
      </div>
    </div>
  );
}
```

```css
/* app/visualisasi/page.module.css */
.page {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-left: 6px solid var(--tile-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.tileLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.tileValue {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--tile-color);
  font-variant-numeric: tabular-nums;
}

.tilePct {
  font-size: 13px;
  color: var(--text-muted);
}

.stage {
  position: relative;
  height: calc(100vh - 230px);
  min-height: 360px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-secondary);
}

.overlay,
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
  pointer-events: none;
}

.overlay {
  background: color-mix(in srgb, var(--bg-primary) 45%, transparent);
}

@media (max-width: 640px) {
  .page { padding: 16px; }
  .tiles { gap: 8px; }
  .tile { padding: 10px 12px; }
  .tileValue { font-size: 26px; }
}
```

- [ ] **Step 3: Typecheck and full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass except the known pre-existing TypeSelect ranking failure (unrelated — confirm it also fails without this branch's changes).

- [ ] **Step 4: Browser verification**

Start the preview (`preview_start` name `qc-gate-dev`), open `/visualisasi`, then check:
1. Tiles show BC OK/Repair/NG equal to the Dashboard's BC totals.
2. With counts > 0: blocks flow Baritori → … → QC Gate 2; green go Spray Booth → Junbiki → truck; yellow go to the pallet, the forklift carries them to Line Repair and back; red drop on Box Merah and vanish.
3. Truck leaves after 10 blocks and returns empty.
4. Waiting ≥ 6 s (two polls) does not restart the animation.
5. Theme toggle changes background/floor.
6. `resize_window` mobile: tiles fit, no horizontal page scroll; reset to `desktop` afterwards.
7. No console errors (`read_console_messages` with `onlyErrors`).
8. Running vs reset: observe whichever state the dev DB is in (counts > 0 → animation; all zero → overlay "Produksi belum berjalan" and no blocks). Do NOT reset or edit the real shift to test the other state; report it as unverified.

Take a screenshot as proof.

- [ ] **Step 5: Commit**

```bash
git add app/visualisasi components/layout/TopNav.tsx
git commit -m "feat(visualisasi): halaman visualisasi line finishing dengan blok OK/Repair/NG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
