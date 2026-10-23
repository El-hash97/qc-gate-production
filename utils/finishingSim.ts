// Framework-free simulation of the finishing line. step() mutates the sim
// and leaves every block's world position in `pos` (and, while it rides a
// recorded station segment, its rotation in `quat`); the Three.js renderer
// only mirrors it. Called only while production is running.
//
// Stations are the SEGMENTS of the Blender timeline: one block per station,
// replaying the recorded path; a finished block waits in its station until
// the next one is free, and Baritori only releases a block when it is empty.
//
// Repair blocks collect on a yellow pallet at QC Gate 2; a full pallet (9, or
// fewer on the manual button) goes by forklift to Line Repair and, repaired,
// onto the stand beside Grinding. HSB06 takes them back one at a time, taking
// turns with the production blocks from HSB05; they skip Grinding straight to
// Hanten MC and are re-inspected at QC Gate 2 (OK on to Junbiki, NG to the NG pallet).
import {
  ANIM_FPS, BLOCK_SIZE, BLOCK_SPEED, FORKLIFT_FROM_PALLET, FORKLIFT_HOME, FORKLIFT_OUT,
  FORKLIFT_SPEED, FORKLIFT_TO_PALLET, HSB06_SEGMENT, JUNBIKI_SEGMENT, NG_PALLET_CAPACITY, NG_PALLET_TOP, QC2_SEGMENT,
  PALLET_DECK, PALLET_PITCH, REPAIR_BATCH, REPAIR_PALLET,
  REPAIR_STUB, REPAIR_TIME_S, REWORK_DWELL_S, REWORK_PALLET, REWORK_PALLET_TOP, SEGMENTS,
  TRUCK_AWAY_OFFSET, TRUCK_CAPACITY, TRUCK_DOCK, TRUCK_SPEED,
  pickOutcome, pickReinspect, routePoints, segmentSeconds, stationPos, trackAt,
  type Counts, type Hold, type Leg, type Outcome, type Quat, type Vec2,
} from './finishingFlow';

export type Vec3 = [number, number, number];
export type BlockColor = 'raw' | Outcome;
export type Phase =
  | 'seg' | 'ng' | 'toPallet' | 'dropping' | 'atPallet' | 'onForklift' | 'onReworkPallet' | 'toHsb06' | 'toHanten'
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
  // repaired and back on the line: re-inspected (not re-decided) at QC Gate 2
  rework: boolean;
  // start/end height of an off-record glide (phases 'dropping', 'toHsb06', 'toHanten')
  glideY: [number, number];
}

export type ForkliftState = 'idle' | 'toRepair' | 'repairing' | 'toPallet' | 'unloading' | 'returning';

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
  // manual button: send the yellow pallet to Line Repair before it is full
  dispatch: boolean;
  // HSB06 alternates between a repaired block and a production block
  hsb06Turn: 'rework' | 'line';
}

// Block centre height on the conveyors (Blender block z ≈ 6.2 above a -5.6 floor).
const BELT_Y = 1.18;
const BLOCK = BLOCK_SIZE[1];
const HALF = BLOCK / 2;

// Cargo floor height of the box truck drawn by the renderer.
export const TRUCK_BED_Y = 1.05;

// Fork heights (top face): inside the yellow pallet lying on the floor to
// pick it, low while driving, the pallet up at the repair bench while
// repairing, the pallet set on the stand beside Grinding to unload. The
// pallet's deck sits PALLET_DECK - FORK_FLOOR_Y above the forks.
export const FORK_FLOOR_Y = 0.08;
export const FORK_CARRY_Y = 0.3;
export const FORK_BENCH_Y = 0.78;
export const FORK_PALLET_Y = REWORK_PALLET_TOP + FORK_FLOOR_Y;
const FORK_TARGET: Record<ForkliftState, number> = {
  idle: FORK_FLOOR_Y, toRepair: FORK_CARRY_Y, repairing: FORK_BENCH_Y,
  toPallet: FORK_CARRY_Y, unloading: FORK_PALLET_Y, returning: FORK_CARRY_Y,
};
const FORK_LIFT_SPEED = 0.4;
// the pallet (and its blocks) ride this far ahead of the forklift's centre
export const FORK_AHEAD = 1.15;
const TURN_RATE = 1.6; // rad/s
// Parked at home it faces the stub end (west).
export const HOME_HEADING = Math.PI;

export function createSim(): Sim {
  return {
    blocks: [],
    nextId: 1,
    segments: SEGMENTS.map(() => ({ busy: null, t: 0 })),
    forklift: {
      state: 'idle', pos: [FORKLIFT_HOME[0], FORKLIFT_HOME[1]], heading: HOME_HEADING, leg: 0,
      timer: 0, load: [], forkY: FORK_FLOOR_Y,
    },
    truck: { state: 'docked', offset: 0, load: 0 },
    ngPile: 0,
    dispatch: false,
    hsb06Turn: 'rework',
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

// Block centre on a 3 x 3 pallet deck: slot 0..8 per layer, `heading` = the
// pallet's yaw (its long side along the forks), extra layers stack on top.
export function palletSpot(center: Vec2, deckY: number, heading: number, slot: number): Vec3 {
  const i = slot % REPAIR_BATCH;
  const along = ((i % 3) - 1) * PALLET_PITCH[0];
  const across = (Math.floor(i / 3) - 1) * PALLET_PITCH[1];
  return [
    center[0] + along * Math.cos(heading) + across * Math.sin(heading),
    deckY + HALF + BLOCK * Math.floor(slot / REPAIR_BATCH),
    center[1] - along * Math.sin(heading) + across * Math.cos(heading),
  ];
}

function yaw(heading: number): Quat {
  return [0, Math.sin(heading / 2), 0, Math.cos(heading / 2)];
}

// Repair blocks on (or being set down on) the yellow pallet at QC Gate 2.
export function repairWaiting(sim: Sim): number {
  return sim.blocks.filter((b) => b.phase === 'atPallet' || b.phase === 'dropping').length;
}

// Manual button: the forklift takes the yellow pallet as soon as it is home.
export function dispatchRepair(sim: Sim): void {
  if (repairWaiting(sim) > 0) sim.dispatch = true;
}

// HSB06 takes turns: neither stream waits behind the other.
function productionWaiting(sim: Sim): boolean {
  const hsb05 = SEGMENTS[HSB06_SEGMENT - 1];
  return sim.blocks.some((b) => b.phase === 'seg' && b.seg === HSB06_SEGMENT - 1 && b.t >= segmentSeconds(hsb05));
}

function reworkReady(sim: Sim): boolean {
  return sim.blocks.some((b) => b.phase === 'onReworkPallet' && b.timer <= 0);
}

// Reserves segment k for a block that is still on its way in (pallet → HSB06,
// HSB06 → Hanten), so nothing else enters it meanwhile.
function claim(sim: Sim, b: Block, k: number): boolean {
  if (sim.segments[k].busy !== null) return false;
  sim.segments[k] = { busy: b.id, t: 0 };
  return true;
}

// Off-record move between two 3D points; the height eases between them.
function glide(b: Block, phase: Phase, from: Vec3, to: Vec3): void {
  send(b, phase, [[from[0], from[2]], [to[0], to[2]]]);
  b.glideY = [from[1], to[1]];
}

function glideStep(b: Block, dt: number): boolean {
  b.dist += BLOCK_SPEED * dt;
  const [[ax, az], [bx, bz]] = b.path;
  const k = Math.min(1, b.dist / (Math.hypot(bx - ax, bz - az) || 1));
  const [y0, y1] = b.glideY;
  b.pos = [ax + (bx - ax) * k, y0 + (y1 - y0) * k, az + (bz - az) * k];
  return k >= 1;
}

function spawn(sim: Sim): void {
  if (sim.segments[0].busy !== null) return;
  const b: Block = {
    id: sim.nextId++, color: 'raw', phase: 'seg', path: [], dist: 0, timer: 0, slot: 0,
    pos: trackAt(SEGMENTS[0].from).pos, seg: 0, t: 0, quat: null, rework: false, glideY: [0, 0],
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
    // forks inside the yellow pallet: lift it once it holds a full batch, or
    // on the manual button, never while a block is still being set down
    const onPallet = sim.blocks.filter((b) => b.phase === 'atPallet').sort((a, b) => a.slot - b.slot);
    const settling = sim.blocks.some((b) => b.phase === 'dropping');
    if (sim.dispatch && onPallet.length === 0 && !settling) sim.dispatch = false;
    if (!forksReady || settling || (onPallet.length < REPAIR_BATCH && !sim.dispatch)) return;
    const batch = onPallet.slice(0, REPAIR_BATCH);
    // seen from the forks (facing west) the deck is turned half round: same spots
    batch.forEach((b, i) => {
      b.phase = 'onForklift';
      b.slot = REPAIR_BATCH - 1 - i;
    });
    // anything past a full batch starts the next (spare) pallet
    onPallet.slice(REPAIR_BATCH).forEach((b, i) => { b.slot = i; });
    f.load = batch.map((b) => b.id);
    sim.dispatch = false;
    f.state = 'toRepair';
  } else if (f.state === 'toRepair') {
    if (drive(f, FORKLIFT_OUT, dt)) {
      f.state = 'repairing';
      f.timer = REPAIR_TIME_S;
    }
  } else if (f.state === 'repairing') {
    if (forksReady && !(hold && 'repair' in hold)) f.timer -= dt;
    if (f.timer <= 0) f.state = 'toPallet';
  } else if (f.state === 'toPallet') {
    if (drive(f, FORKLIFT_TO_PALLET, dt)) f.state = 'unloading';
  } else if (f.state === 'unloading') {
    // forks down on the pallet beside Grinding: the repaired blocks stay there
    // (still orange) until HSB06 takes them back into the line
    if (!forksReady) return;
    // the pallet stays on the stand; its blocks keep their spots on the deck
    const used = sim.blocks.filter((x) => x.phase === 'onReworkPallet').map((x) => x.slot);
    const base = used.length ? Math.max(...used) + 1 : 0;
    f.load.forEach((id, i) => {
      const b = sim.blocks.find((x) => x.id === id);
      if (!b) return;
      b.phase = 'onReworkPallet';
      b.rework = true;
      b.timer = REWORK_DWELL_S;
      b.slot = base + i;
    });
    f.load = [];
    f.state = 'returning';
  } else if (drive(f, FORKLIFT_FROM_PALLET, dt)) {
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
        // QC Gate 2: decide once (a repaired block is re-inspected: OK or NG),
        // then wait here until the next leg is free
        if (b.rework) {
          b.color = pickReinspect(counts, rand());
          b.rework = false;
        } else if (b.color === 'raw') b.color = pickOutcome(counts, rand());
        if (b.color === 'ok') enter(sim, b, JUNBIKI_SEGMENT);
        else {
          leaveSegment(sim, b);
          if (b.color === 'repair') send(b, 'toPallet', [stationPos('qc2'), REPAIR_STUB]);
          else send(b, 'ng', routePoints('ng'));
        }
      } else if (b.rework && b.seg === HSB06_SEGMENT) {
        // re-blasted: skip Grinding, straight to Hanten MC once its segment is free
        if (claim(sim, b, QC2_SEGMENT)) {
          sim.segments[HSB06_SEGMENT].busy = null;
          glide(b, 'toHanten', trackAt(seg.to).pos, trackAt(SEGMENTS[QC2_SEGMENT].from).pos);
        }
      } else if (b.seg + 1 === HSB06_SEGMENT) {
        // production into HSB06: wait a turn if a repaired block is ready
        if (!(sim.hsb06Turn === 'rework' && reworkReady(sim)) && enter(sim, b, HSB06_SEGMENT)) sim.hsb06Turn = 'rework';
      } else {
        enter(sim, b, b.seg + 1);
      }
      break;
    }
    case 'onReworkPallet': {
      // set down first, then first come first served: the oldest block on the pallet feeds HSB06
      b.timer -= dt;
      const first = sim.blocks.find((o) => o.phase === 'onReworkPallet');
      const myTurn = !(sim.hsb06Turn === 'line' && productionWaiting(sim));
      if (first === b && b.timer <= 0 && myTurn && claim(sim, b, HSB06_SEGMENT)) {
        sim.hsb06Turn = 'line';
        glide(b, 'toHsb06', b.pos, trackAt(SEGMENTS[HSB06_SEGMENT].from).pos);
      }
      break;
    }
    case 'toHsb06':
    case 'toHanten':
      if (glideStep(b, dt)) {
        // the segment was claimed when the move started: ride it from the top
        b.seg = b.phase === 'toHsb06' ? HSB06_SEGMENT : QC2_SEGMENT;
        b.phase = 'seg';
        b.t = 0;
      }
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
      if (travel(b, dt)) {
        // off the stub end onto the next free spot of the yellow pallet
        b.slot = repairWaiting(sim);
        glide(b, 'dropping', b.pos, palletSpot(REPAIR_PALLET, PALLET_DECK, 0, b.slot));
      }
      break;
    case 'dropping':
      if (glideStep(b, dt)) b.phase = 'atPallet';
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
  let queue = 0;
  const [ngX, ngZ] = stationPos('ngBox');
  const end = trackAt(SEGMENTS[JUNBIKI_SEGMENT].to).pos;
  for (const b of sim.blocks) {
    if (b.phase === 'atPallet' || b.phase === 'dropping') {
      // the yellow pallet at QC Gate 2 (a block being set down glides there)
      // filled from the stub side (slot 0 = west, nearest the conveyor end)
      if (b.phase === 'atPallet') b.pos = palletSpot(REPAIR_PALLET, PALLET_DECK, 0, b.slot);
      b.quat = yaw(HOME_HEADING);
    } else if (b.phase === 'onReworkPallet') {
      // the yellow pallet set on the stand beside Grinding (forks pointed east)
      b.pos = palletSpot(REWORK_PALLET, REWORK_PALLET_TOP + PALLET_DECK, 0, b.slot);
      b.quat = yaw(0);
    } else if (b.phase === 'onForklift') {
      const f = sim.forklift;
      const center: Vec2 = [f.pos[0] + FORK_AHEAD * Math.cos(f.heading), f.pos[1] - FORK_AHEAD * Math.sin(f.heading)];
      b.pos = palletSpot(center, f.forkY - FORK_FLOOR_Y + PALLET_DECK, f.heading, b.slot);
      b.quat = yaw(f.heading);
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
