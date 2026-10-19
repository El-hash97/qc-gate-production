// Framework-free simulation of the finishing line. step() mutates the sim
// and leaves every block's world position in `pos` (and, while it rides a
// recorded station segment, its rotation in `quat`); the Three.js renderer
// only mirrors it. Called only while production is running.
//
// Stations are the SEGMENTS of the Blender timeline: one block per station,
// replaying the recorded path; a finished block waits in its station until
// the next one is free, and Baritori only releases a block when it is empty.
import {
  ANIM_FPS, BLOCK_SIZE, BLOCK_SPEED, FORKLIFT_BACK, FORKLIFT_BATCH, FORKLIFT_HOME, FORKLIFT_OUT,
  FORKLIFT_SPEED, JUNBIKI_SEGMENT, NG_PALLET_CAPACITY, NG_PALLET_TOP, QC2_SEGMENT, REPAIR_STUB, REPAIR_TIME_S, SEGMENTS,
  TRUCK_AWAY_OFFSET, TRUCK_CAPACITY, TRUCK_DOCK, TRUCK_SPEED,
  pickOutcome, pickReinspect, routePoints, segmentSeconds, stationPos, trackAt,
  type Counts, type Hold, type Leg, type Outcome, type Quat, type Vec2,
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

export type ForkliftState = 'idle' | 'toRepair' | 'repairing' | 'toGate' | 'unloading';

export interface Sim {
  blocks: Block[];
  nextId: number;
  // which block holds each station segment, and how far in it is
  segments: { busy: number | null; t: number }[];
  // heading: three.js yaw, forks point along it; leg: index into the current
  // route; forkY: height of the forks' top face above the floor
  forklift: {
    state: ForkliftState; pos: [number, number]; heading: number; leg: number;
    timer: number; load: number[]; forkY: number;
  };
  truck: { state: 'docked' | 'leaving' | 'returning'; offset: number; load: number };
  // NG blocks put on the pallet so far (picks the next pallet spot)
  ngPile: number;
}

// Block centre height on the conveyors (Blender block z ≈ 6.2 above a -5.6 floor).
const BELT_Y = 1.18;
const BLOCK = BLOCK_SIZE[1];
const HALF = BLOCK / 2;

// Cargo floor height of the box truck drawn by the renderer.
export const TRUCK_BED_Y = 1.05;

// Fork heights: level with the stub conveyor to pick/drop at QC Gate 2, low
// while driving, level with the repair bench top while repairing.
export const FORK_STUB_Y = BELT_Y - HALF;
export const FORK_CARRY_Y = 0.3;
export const FORK_BENCH_Y = 0.78;
const FORK_TARGET: Record<ForkliftState, number> = {
  idle: FORK_STUB_Y, toRepair: FORK_CARRY_Y, repairing: FORK_BENCH_Y, toGate: FORK_CARRY_Y, unloading: FORK_STUB_Y,
};
const FORK_LIFT_SPEED = 0.4;
// blocks ride this far ahead of the forklift's centre
const FORK_AHEAD = 1.15;
const TURN_RATE = 1.6; // rad/s
// Parked at home it faces the stub end (west).
const HOME_HEADING = Math.PI;

export function createSim(): Sim {
  return {
    blocks: [],
    nextId: 1,
    segments: SEGMENTS.map(() => ({ busy: null, t: 0 })),
    forklift: {
      state: 'idle', pos: [FORKLIFT_HOME[0], FORKLIFT_HOME[1]], heading: HOME_HEADING, leg: 0,
      timer: 0, load: [], forkY: FORK_STUB_Y,
    },
    truck: { state: 'docked', offset: 0, load: 0 },
    ngPile: 0,
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

// Drives one step along a route of legs, turning toward the direction of
// travel (backwards on reverse legs). True once the last leg is done.
function drive(f: Sim['forklift'], legs: readonly Leg[], dt: number): boolean {
  const leg = legs[f.leg];
  const dx = leg.to[0] - f.pos[0];
  const dz = leg.to[1] - f.pos[1];
  if (dx * dx + dz * dz > 1e-9) {
    const want = Math.atan2(-dz, dx) + (leg.reverse ? Math.PI : 0);
    const diff = Math.atan2(Math.sin(want - f.heading), Math.cos(want - f.heading));
    f.heading += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, diff));
  }
  if (!moveTo(f.pos, leg.to, FORKLIFT_SPEED * dt)) return false;
  f.leg += 1;
  if (f.leg < legs.length) return false;
  f.leg = 0;
  return true;
}

function stepForklift(sim: Sim, dt: number, counts: Counts, rand: () => number, hold: Hold | null): void {
  const f = sim.forklift;
  const target = FORK_TARGET[f.state];
  const lift = FORK_LIFT_SPEED * dt;
  f.forkY = Math.abs(target - f.forkY) <= lift ? target : f.forkY + Math.sign(target - f.forkY) * lift;
  const forksReady = f.forkY === target;
  if (f.state === 'idle') {
    // forks wait level with the stub end, so loading is a straight slide
    const waiting = sim.blocks.filter((b) => b.phase === 'atPallet').slice(0, FORKLIFT_BATCH);
    if (waiting.length === 0 || !forksReady) return;
    for (const b of waiting) b.phase = 'onForklift';
    f.load = waiting.map((b) => b.id);
    f.state = 'toRepair';
  } else if (f.state === 'toRepair') {
    if (drive(f, FORKLIFT_OUT, dt)) {
      f.state = 'repairing';
      f.timer = REPAIR_TIME_S;
    }
  } else if (f.state === 'repairing') {
    if (forksReady && !(hold && 'repair' in hold)) f.timer -= dt;
    if (f.timer <= 0) f.state = 'toGate';
  } else if (f.state === 'toGate') {
    if (drive(f, FORKLIFT_BACK, dt)) f.state = 'unloading';
  } else if (forksReady) {
    // Back at the stub end: re-inspect every repaired block, roll it to QC Gate 2.
    for (const id of f.load) {
      const b = sim.blocks.find((x) => x.id === id);
      if (!b) continue;
      const o = pickReinspect(counts, rand());
      b.color = o;
      if (o === 'ng') send(b, 'ng', [REPAIR_STUB, ...routePoints('ng')]);
      else send(b, 'toQc2', [REPAIR_STUB, stationPos('qc2')]);
    }
    f.load = [];
    f.state = 'idle';
  }
}

function stepBlock(sim: Sim, b: Block, dt: number, counts: Counts, rand: () => number, hold: Hold | null): void {
  switch (b.phase) {
    case 'seg': {
      const seg = SEGMENTS[b.seg];
      // line stop: held blocks stop at the station (see stationHold)
      const h = hold && 'seg' in hold && hold.seg === b.seg && (hold.at === null || b.t <= hold.at) ? hold : null;
      b.t = h ? (h.at === null ? b.t : Math.min(b.t + dt, h.at)) : Math.min(b.t + dt, segmentSeconds(seg));
      sim.segments[b.seg].t = b.t;
      const at = trackAt(seg.from + b.t * ANIM_FPS);
      b.pos = at.pos;
      b.quat = at.quat;
      if (h || b.t < segmentSeconds(seg)) break;
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
          if (b.color === 'repair') send(b, 'toPallet', [stationPos('qc2'), REPAIR_STUB]);
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
        // onto the next spot of the NG pallet; a full pallet drops its oldest
        b.phase = 'binned';
        b.slot = sim.ngPile++ % NG_PALLET_CAPACITY;
        sim.blocks = sim.blocks.filter((o) => o === b || o.phase !== 'binned' || o.slot !== b.slot);
      }
      break;
    case 'toPallet':
      if (travel(b, dt)) b.phase = 'atPallet';
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
      // waiting at the end of the stub conveyor (stacked if more than one)
      b.pos = [REPAIR_STUB[0], BELT_Y + BLOCK * pallet++, REPAIR_STUB[1]];
    } else if (b.phase === 'onForklift') {
      const f = sim.forklift;
      const i = f.load.indexOf(b.id);
      b.pos = [
        f.pos[0] + FORK_AHEAD * Math.cos(f.heading),
        f.forkY + HALF + BLOCK * i,
        f.pos[1] - FORK_AHEAD * Math.sin(f.heading),
      ];
      b.quat = null;
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
      // 2 x 2 per layer on the pallet, square to it
      const i = b.slot % 4;
      b.pos = [
        ngX + (i % 2 ? 0.25 : -0.25),
        NG_PALLET_TOP + HALF + BLOCK * Math.floor(b.slot / 4),
        ngZ + (i < 2 ? -0.2 : 0.2),
      ];
      b.quat = [0, 0, 0, 1];
    }
  }
}

export function step(
  sim: Sim, dt: number, counts: Counts, rand: () => number = Math.random, hold: Hold | null = null,
): void {
  spawn(sim);
  stepTruck(sim, dt);
  stepForklift(sim, dt, counts, rand, hold);
  for (const b of sim.blocks) stepBlock(sim, b, dt, counts, rand, hold);
  layout(sim);
}

// How long a station's hoist/operator takes to glide back to its start pose
// after a block leaves. It runs alongside the next block, never delays it:
// in the recording the equipment only grabs the block ~1 s into a segment.
export const RETURN_S = 1.2;

export interface ReturnState {
  last: number | null;
  w: number;
}

// Per frame and station: `release` = the previous block just left (freeze its
// end pose); `weight` = how much of that frozen pose still shows, eased 1 → 0.
export function stepReturn(st: ReturnState, busy: number | null, dt: number): { release: boolean; weight: number } {
  const release = st.last !== null && busy !== st.last;
  if (release) st.w = 1;
  st.last = busy;
  st.w = Math.max(0, st.w - dt / RETURN_S);
  return { release, weight: st.w * st.w * (3 - 2 * st.w) };
}
