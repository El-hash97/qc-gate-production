import TRACK from './finishingTrack.json';

// Layout of the BC finishing line for /overview, plus the pure outcome
// pickers. The 3D layout itself is the GLB exported from the user's Blender
// file (scripts/export-finishing-glb.py); stations below are the waypoints
// blocks travel through, read off that file in Blender coordinates.

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
  // Height of the floating name tag.
  labelY: number;
}

// GLB placement: Blender units are 10 cm, its floor sits at z = -5.6.
export const MODEL_URL = '/models/finishing-line.glb';
// Same plant with `Layout` cut into one node per machine (MC_<station>) by scripts/split-layout.py
export const MODEL_SPLIT_URL = '/models/finishing-line-split.glb';
export const MODEL_SCALE = 0.1;
export const MODEL_LIFT = 0.56;

// Blender top view (x, y) → scene floor [x, z] (glTF turns Blender -y into +z).
const b = (x: number, y: number): Vec2 => [x * MODEL_SCALE, -y * MODEL_SCALE];

// Station spots and block paths are read off the block's own keyframed path
// in the Blender animation (Cube.019 → Cube.563 → Cube.564).
export const STATIONS: readonly Station[] = [
  { id: 'baritori', label: 'Baritori', pos: b(20, -15), labelY: 3.4 },
  { id: 'hsb05', label: 'HSB05', pos: b(18, -68), labelY: 4.4 },
  { id: 'hsb06', label: 'HSB06', pos: b(18, -118), labelY: 4.4 },
  { id: 'grinding', label: 'Grinding', pos: b(-31, -120), labelY: 3.2 },
  { id: 'hanten', label: 'Hanten MC', pos: b(6.5, -175), labelY: 2.6 },
  { id: 'final', label: 'Final Process', pos: b(6.5, -202), labelY: 2.9 },
  { id: 'qc1', label: 'QC Gate 1', pos: b(6.5, -232), labelY: 2.6 },
  { id: 'qc2', label: 'QC Gate 2', pos: b(6.5, -263), labelY: 2.6 },
  { id: 'spray', label: 'Spray Booth', pos: b(-5, -295), labelY: 3.8 },
  { id: 'junbiki', label: 'Junbiki', pos: b(-89, -295), labelY: 3.2 },
  // red plastic pallet the NG blocks are stacked on (the renderer draws it)
  { id: 'ngBox', label: 'NG Pallet', pos: b(24, -283), labelY: 2 },
  // repair benches in the fenced area across the factory road
  { id: 'lineRepair', label: 'Line Repair', pos: b(164, -391), labelY: 2.6 },
];

// Station segments of the Blender timeline (24 fps). A block entering a
// segment replays the recorded block path over [from, to] while the clips
// listed (operator rigs, hoists, grippers) replay the same frames, so the
// block always rides on whatever carries it. One block per segment at a time.
// `remap` (optional, absolute frames) plays a clip's keyframe window from
// elsewhere on the timeline across [from, to] instead — for motion recorded
// outside the segment the block actually travels through.
export interface Segment {
  id: string;
  from: number;
  to: number;
  clips: readonly string[];
  remap?: Readonly<Record<string, readonly [number, number]>>;
}

export const ANIM_FPS = 24;

export const SEGMENTS: readonly Segment[] = [
  { id: 'baritori', from: 1, to: 301, clips: ['metarig.001', 'Cylinder.007', 'Cylinder.035'] },
  { id: 'hsb05', from: 301, to: 551, clips: ['Hoist HSB', 'metarig.003', 'Cylinder.117'] },
  { id: 'hsb06', from: 551, to: 676, clips: ['Hoist HSB.002', 'metarig.015', 'Cylinder.104'] },
  { id: 'grinding', from: 676, to: 801, clips: ['Cylinder.099', 'metarig.005'] },
  // Hanten → Final → QC Gate 1 → QC Gate 2, where the outcome is decided.
  // The operators and fixtures at these posts were recorded moving at other
  // timeline moments (58–102, 994–1094, 1082–1162, 1198–1270), not while a
  // block passes the gates, so their keyframe windows are remapped here: one
  // pass of the recorded motion plays across the segment.
  {
    id: 'line', from: 801, to: 976,
    clips: ['Cube.097', 'metarig.002', 'metarig.006', 'metarig.007', 'metarig.012', 'metarig.009', 'metarig.011', 'Cube.132', 'Cylinder.100', 'HANTEN VISUAL.002'],
    remap: {
      'metarig.002': [878, 1146],
      'metarig.006': [60, 101],
      'metarig.007': [60, 101],
      'metarig.009': [60, 101],
      'metarig.011': [1082, 1094],
      'metarig.012': [1142, 1162],
      'Cube.132': [1199, 1269],
      'Cylinder.100': [1066, 1094],
      'HANTEN VISUAL.002': [994, 1010],
    },
  },
  // OK only: Spray Booth → round the corner → hoist into the Junbiki rack
  { id: 'toJunbiki', from: 1351, to: 1660, clips: ['motorreductor.002', 'motorreductor.025'] },
];
export const HSB06_SEGMENT = 2;
export const QC2_SEGMENT = 4;
export const JUNBIKI_SEGMENT = 5;

export function segmentSeconds(s: Segment): number {
  return (s.to - s.from) / ANIM_FPS;
}

export type Quat = [number, number, number, number];

// Recorded block centre + rotation, already in scene coordinates
// (scripts/export-finishing-track.py).
export function trackAt(frame: number): { pos: [number, number, number]; quat: Quat } {
  const { start, step, frames } = TRACK;
  const x = Math.min(Math.max((frame - start) / step, 0), frames.length - 1);
  const i = Math.min(Math.floor(x), frames.length - 2);
  const t = x - i;
  const a = frames[i];
  const c = frames[i + 1];
  const lerp = (k: number) => a[k] + (c[k] - a[k]) * t;
  // nlerp, taking the short way round
  const sign = a[3] * c[3] + a[4] * c[4] + a[5] * c[5] + a[6] * c[6] < 0 ? -1 : 1;
  const q = [3, 4, 5, 6].map((k) => a[k] + (sign * c[k] - a[k]) * t);
  const n = Math.hypot(...q) || 1;
  return { pos: [lerp(0), lerp(1), lerp(2)], quat: [q[0] / n, q[1] / n, q[2] / n, q[3] / n] };
}

const PATHS = {
  ng: [[6.5, -263], [24, -283]],
} as const;

export const ROUTES = {
  ng: PATHS.ng.map(([x, y]) => b(x, y)),
};

// Repair blocks are pushed from QC Gate 2 along the stub conveyor (as in the
// recording) and wait at its end for the forklift, which parks facing it.
export const REPAIR_STUB: Vec2 = b(22, -263);
export const FORKLIFT_HOME: Vec2 = b(35, -263);
// Where the forklift stops with its forks over the repair bench.
export const REPAIR_DROP: Vec2 = b(150, -391);
// Forklift legs; `reverse` = backing up (it keeps facing the other way).
export interface Leg {
  to: Vec2;
  reverse?: boolean;
}
export const FORKLIFT_OUT: readonly Leg[] = [
  { to: b(46, -263), reverse: true },
  { to: b(72, -300) },
  { to: b(138, -391) },
  { to: REPAIR_DROP },
];
// Repaired blocks go back into the line at HSB06: the forklift takes them up
// the empty east side, round the head of the line past Baritori, down the
// west side and onto the low pallet beside Grinding (the stand at Blender
// (-35, -92), top ~0.42 m), forks pointing east. From there each block is
// fed into HSB06 when it is free.
export const REWORK_PALLET: Vec2 = b(-35, -92);
export const REWORK_PALLET_TOP = 0.42;
export const FORKLIFT_TO_PALLET: readonly Leg[] = [
  { to: b(136, -391), reverse: true },
  { to: b(70, -340) },
  { to: b(70, 40) },
  { to: b(-60, 40) },
  { to: b(-60, -92) },
  // forks (FORK_AHEAD = 11.5 units) over the pallet
  { to: b(-46.5, -92) },
];
export const FORKLIFT_FROM_PALLET: readonly Leg[] = [
  { to: b(-60, -92), reverse: true },
  { to: b(-60, 40) },
  { to: b(70, 40) },
  { to: b(70, -300) },
  { to: b(48, -263) },
  { to: FORKLIFT_HOME },
];
export const TRUCK_DOCK: Vec2 = b(-85, -348);

// BC block as modelled in the Blender file: 47.5 x 37.1 x 33.6 cm (L x W x H).
export const BLOCK_SIZE = [0.475, 0.336, 0.371] as const;
// BC 2TR mesh (public/models/bc-2tr.stl, exported from the user's Blender
// block asset): replaces the placeholder box on every block path.
export const BLOCK_URL = '/models/bc-2tr.stl';

// Tuning knobs (seconds, floor units per second). Station tempo comes from
// SEGMENTS; BLOCK_SPEED only covers the off-record moves (NG drop, repair return).
export const BLOCK_SPEED = 1.2;
export const FORKLIFT_SPEED = 2;
export const REPAIR_TIME_S = 4;
// how long a repaired block sits on the pallet by Grinding before HSB06 takes it
export const REWORK_DWELL_S = 2;
// NG pallet: deck height, and how many blocks it shows (2 x 2 a layer, 3 layers);
// past that the oldest block makes room for the newest.
export const NG_PALLET_TOP = 0.15;
export const NG_PALLET_CAPACITY = 12;
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
  return [...ROUTES[route]];
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

// Where a line stop at a station halts the line. A station with its own
// segment freezes its block wherever it is (at: null). Stations sharing one
// (Hanten → QC Gate 2, Spray → Junbiki) let a block ride up to the point of
// the recorded path closest to the station and hold it there (at: seconds
// into the segment); blocks already past it carry on. Line Repair halts the
// forklift's repair.
export type Hold = { seg: number; at: number | null } | { repair: true };

const SHARED_SEGMENT: Partial<Record<StationId, number>> = {
  hanten: QC2_SEGMENT, final: QC2_SEGMENT, qc1: QC2_SEGMENT, qc2: QC2_SEGMENT,
  spray: JUNBIKI_SEGMENT, junbiki: JUNBIKI_SEGMENT,
};

export function stationHold(id: StationId): Hold | null {
  if (id === 'lineRepair') return { repair: true };
  const own = SEGMENTS.findIndex((s) => s.id === id);
  if (own >= 0) return { seg: own, at: null };
  const seg = SHARED_SEGMENT[id];
  if (seg === undefined) return null;
  const [x, z] = stationPos(id);
  const { from, to } = SEGMENTS[seg];
  let best = from;
  let bestD = Infinity;
  for (let f = from; f <= to; f++) {
    const [px, , pz] = trackAt(f).pos;
    const d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bestD) [best, bestD] = [f, d];
  }
  return { seg, at: (best - from) / ANIM_FPS };
}
