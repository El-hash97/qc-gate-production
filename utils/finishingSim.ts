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
  const [jx, jz] = routePoints('ok').at(-1)!;
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
