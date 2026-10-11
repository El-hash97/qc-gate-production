// Layout of the BC finishing line for /visualisasi, plus the pure outcome
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
  // Drawn as a simple prop only where the Blender layout has no model.
  prop?: { size: readonly [number, number, number]; color: number };
}

// GLB placement: Blender units are 10 cm, its floor sits at z = -5.6.
export const MODEL_URL = '/models/finishing-line.glb';
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
  { id: 'final', label: 'Final Proses', pos: b(6.5, -202), labelY: 2.9 },
  { id: 'qc1', label: 'QC Gate 1', pos: b(6.5, -232), labelY: 2.6 },
  { id: 'qc2', label: 'QC Gate 2', pos: b(6.5, -263), labelY: 2.6 },
  { id: 'spray', label: 'Spray Booth', pos: b(-5, -295), labelY: 3.8 },
  { id: 'junbiki', label: 'Junbiki', pos: b(-89, -295), labelY: 3.2 },
  { id: 'ngBox', label: 'Box Merah (NG)', pos: b(36, -262), labelY: 2, prop: { size: [1.2, 0.8, 1.2], color: 0xb91c1c } },
  { id: 'lineRepair', label: 'Line Repair', pos: b(27, -242), labelY: 2.2 },
];

// Waypoints per route, Blender coordinates, in the order the block visits them.
const PATHS = {
  // Baritori → HSB05 (via hoist) → HSB06 → across to Grinding → back to the
  // main conveyor → Hanten → Final → QC Gate 1 → QC Gate 2.
  main: [
    [23.4, -28.6], [10.1, -13.8], [0.2, -13.8], [-0.7, -16.9], [-0.7, -50.8], [7, -62.4],
    [18.2, -70.5], [27.2, -73.5], [12.4, -73.1], [2.5, -82.4], [-3.8, -100], [20.1, -121.5],
    [14.9, -133.1], [9.2, -128.5], [9.6, -116.4], [-3.7, -123.3], [-31.2, -118.7],
    [-9.8, -138.7], [6.5, -145.1], [6.5, -175], [6.5, -202], [6.5, -232], [6.5, -263],
  ],
  // QC Gate 2 → Spray Booth → round the corner → hoist into the Junbiki rack lane.
  ok: [
    [6.5, -263], [7, -292], [-41.1, -303.4], [-69.9, -302.6], [-71.9, -274.3], [-72.7, -262.5],
    [-89.3, -262.5], [-89.3, -323],
  ],
  ng: [[6.5, -263], [36, -262]],
} as const;

export const ROUTES = {
  main: PATHS.main.map(([x, y]) => b(x, y)),
  ok: PATHS.ok.map(([x, y]) => b(x, y)),
  ng: PATHS.ng.map(([x, y]) => b(x, y)),
};

export const REPAIR_PALLET: Vec2 = b(22, -268);
export const FORKLIFT_HOME: Vec2 = b(22, -273);
export const TRUCK_DOCK: Vec2 = b(-85, -348);

// BC block as modelled in the Blender file: 47.5 x 37.1 x 33.6 cm (L x W x H).
export const BLOCK_SIZE = [0.475, 0.336, 0.371] as const;

// Tuning knobs (seconds, floor units per second).
// Blocks crawl at real conveyor pace so several stations work in parallel;
// the Blender operator animation plays faster than recorded to match.
export const SPAWN_INTERVAL_S = 3;
export const BLOCK_SPEED = 1.2;
export const OPERATOR_ANIM_SPEED = 2;
export const FORKLIFT_SPEED = 2;
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
