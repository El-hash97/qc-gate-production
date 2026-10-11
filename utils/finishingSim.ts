// Framework-free simulation of the finishing line. step() mutates the sim
// and leaves every block's world position in `pos` (and, while it rides a
// recorded station segment, its rotation in `quat`); the Three.js renderer
// only mirrors it. Called only while production is running.
//
// Stations are the SEGMENTS of the Blender timeline: one block per station,
// replaying the recorded path; a finished block waits in its station until
// the next one is free, and Baritori only releases a block when it is empty.
import {
  ANIM_FPS, BLOCK_SIZE, BLOCK_SPEED, FORKLIFT_BATCH, FORKLIFT_HOME, FORKLIFT_SPEED,
  JUNBIKI_SEGMENT, NG_LINGER_S, QC2_SEGMENT, REPAIR_PALLET, REPAIR_TIME_S, SEGMENTS,
  TRUCK_AWAY_OFFSET, TRUCK_CAPACITY, TRUCK_DOCK, TRUCK_SPEED,
  pickOutcome, pickReinspect, routePoints, segmentSeconds, stationPos, trackAt,
  type Counts, type Outcome, type Quat, type Vec2,
} from './finishingFlow';

export type Vec3 = [number, number, number];
export type BlockColor = 'raw' | Outcome;
export type Phase =
  | 'seg' | 'ng' | 'toPallet' | 'atPallet' | 'onForklift' | 'toQc2' | 'waitOk'
  | 'waitJunbiki' | 'loaded' | 'binned';

export interface Block {
  id: number;
  color: BlockColor;
  phase: Phase;
  path: Vec2[];
  dist: number;
  timer: number;
  slot: number;
  pos: Vec3;
  // station segment index and seconds into it (phase 'seg')
  seg: number;
  t: number;
  quat: Quat | null;
}

export interface Sim {
  blocks: Block[];
  nextId: number;
  // which block holds each station segment, and how far in it is
  segments: { busy: number | null; t: number }[];
  forklift: { state: 'idle' | 'toRepair' | 'repairing' | 'toGate'; pos: [number, number]; timer: number; load: number[] };
  truck: { state: 'docked' | 'leaving' | 'returning'; offset: number; load: number };
}

// Block centre height on the conveyors (Blender block z ≈ 6.2 above a -5.6 floor).
const BELT_Y = 1.18;
const BLOCK = BLOCK_SIZE[1];
const HALF = BLOCK / 2;

// Cargo floor height of the box truck drawn by the renderer.
export const TRUCK_BED_Y = 1.05;

export function createSim(): Sim {
  return {
    blocks: [],
    nextId: 1,
    segments: SEGMENTS.map(() => ({ busy: null, t: 0 })),
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
  b.quat = null;
}

// Takes segment k if it is free; the block's previous segment is released.
function enter(sim: Sim, b: Block, k: number): boolean {
  if (sim.segments[k].busy !== null) return false;
  if (b.phase === 'seg') sim.segments[b.seg].busy = null;
  sim.segments[k] = { busy: b.id, t: 0 };
  b.phase = 'seg';
  b.seg = k;
  b.t = 0;
  return true;
}

function leaveSegment(sim: Sim, b: Block): void {
  if (b.phase === 'seg') sim.segments[b.seg].busy = null;
}

function travel(b: Block, dt: number): boolean {
  b.dist += BLOCK_SPEED * dt;
  const { p, done } = pointAlong(b.path, b.dist);
  b.pos = [p[0], BELT_Y, p[1]];
  return done;
}

function spawn(sim: Sim): void {
  if (sim.segments[0].busy !== null) return;
  const b: Block = {
    id: sim.nextId++, color: 'raw', phase: 'waitOk', path: [], dist: 0, timer: 0, slot: 0,
    pos: trackAt(SEGMENTS[0].from).pos, seg: 0, t: 0, quat: null,
  };
  sim.blocks.push(b);
  enter(sim, b, 0);
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
      if (o === 'ng') send(b, 'ng', [FORKLIFT_HOME, ...routePoints('ng')]);
      else send(b, 'toQc2', [FORKLIFT_HOME, stationPos('qc2')]);
    }
    f.load = [];
    f.state = 'idle';
  }
}

function stepBlock(sim: Sim, b: Block, dt: number, counts: Counts, rand: () => number): void {
  switch (b.phase) {
    case 'seg': {
      const seg = SEGMENTS[b.seg];
      b.t = Math.min(b.t + dt, segmentSeconds(seg));
      sim.segments[b.seg].t = b.t;
      const at = trackAt(seg.from + b.t * ANIM_FPS);
      b.pos = at.pos;
      b.quat = at.quat;
      if (b.t < segmentSeconds(seg)) break;
      if (b.seg === JUNBIKI_SEGMENT) {
        leaveSegment(sim, b);
        b.phase = 'waitJunbiki';
        b.quat = null;
      } else if (b.seg === QC2_SEGMENT) {
        // QC Gate 2: decide once, then wait here until the next leg is free
        if (b.color === 'raw') b.color = pickOutcome(counts, rand());
        if (b.color === 'ok') enter(sim, b, JUNBIKI_SEGMENT);
        else {
          leaveSegment(sim, b);
          if (b.color === 'repair') send(b, 'toPallet', [stationPos('qc2'), REPAIR_PALLET]);
          else send(b, 'ng', routePoints('ng'));
        }
      } else {
        enter(sim, b, b.seg + 1);
      }
      break;
    }
    case 'toQc2':
      if (travel(b, dt)) b.phase = 'waitOk';
      break;
    case 'waitOk':
      enter(sim, b, JUNBIKI_SEGMENT);
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
  const end = trackAt(SEGMENTS[JUNBIKI_SEGMENT].to).pos;
  for (const b of sim.blocks) {
    if (b.phase === 'atPallet') {
      b.pos = [REPAIR_PALLET[0], 0.15 + HALF + BLOCK * pallet++, REPAIR_PALLET[1]];
    } else if (b.phase === 'onForklift') {
      const i = sim.forklift.load.indexOf(b.id);
      b.pos = [sim.forklift.pos[0], 0.5 + HALF + BLOCK * i, sim.forklift.pos[1] - 1.3];
    } else if (b.phase === 'waitJunbiki') {
      b.pos = [end[0], end[1], end[2] - 0.6 * queue++];
    } else if (b.phase === 'loaded') {
      b.pos = [
        // inside the cargo box: 5 along the bed x 2 across
        TRUCK_DOCK[0] + sim.truck.offset - 1.6 + (b.slot % 5) * 0.75,
        TRUCK_BED_Y + HALF,
        TRUCK_DOCK[1] - 0.45 + Math.floor(b.slot / 5) * 0.9,
      ];
    } else if (b.phase === 'binned') {
      b.pos = [ngX + ((b.id % 3) - 1) * 0.35, 0.8 + HALF, ngZ];
    }
  }
}

export function step(sim: Sim, dt: number, counts: Counts, rand: () => number = Math.random): void {
  spawn(sim);
  stepTruck(sim, dt);
  stepForklift(sim, dt, counts, rand);
  for (const b of sim.blocks) stepBlock(sim, b, dt, counts, rand);
  sim.blocks = sim.blocks.filter((b) => !(b.phase === 'binned' && b.timer <= 0));
  layout(sim);
}
