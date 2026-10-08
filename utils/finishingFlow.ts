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

// ponytail: positions are a best guess from the Blender layout (objects are
// unnamed); correct a row here once the real station spots are pointed out.
export const STATIONS: readonly Station[] = [
  { id: 'baritori', label: 'Baritori', pos: b(0, 8), labelY: 2.2 },
  { id: 'hsb05', label: 'HSB05', pos: b(18, -65), labelY: 4.4 },
  { id: 'hsb06', label: 'HSB06', pos: b(18, -117), labelY: 4.4 },
  { id: 'grinding', label: 'Grinding', pos: b(6, -150), labelY: 2.6 },
  { id: 'hanten', label: 'Hanten MC', pos: b(6.5, -174), labelY: 2.6 },
  { id: 'final', label: 'Final Proses', pos: b(6.5, -201), labelY: 2.9 },
  { id: 'qc1', label: 'QC Gate 1', pos: b(6.5, -231), labelY: 2.6 },
  { id: 'qc2', label: 'QC Gate 2', pos: b(6.4, -262), labelY: 2.6 },
  { id: 'spray', label: 'Spray Booth', pos: b(-5, -295), labelY: 3.8 },
  { id: 'junbiki', label: 'Junbiki', pos: b(-60, -300), labelY: 2.4 },
  { id: 'ngBox', label: 'Box Merah (NG)', pos: b(30, -275), labelY: 2, prop: { size: [1.2, 0.8, 1.2], color: 0xb91c1c } },
  { id: 'lineRepair', label: 'Line Repair', pos: b(48, -215), labelY: 2.2, prop: { size: [2.4, 0.9, 1.6], color: 0xd6c4a1 } },
];

export const ROUTES = {
  main: ['baritori', 'hsb05', 'hsb06', 'grinding', 'hanten', 'final', 'qc1', 'qc2'],
  ok: ['qc2', 'spray', 'junbiki'],
  ng: ['qc2', 'ngBox'],
} as const satisfies Record<string, readonly StationId[]>;

export const REPAIR_PALLET: Vec2 = b(24, -250);
export const FORKLIFT_HOME: Vec2 = b(30, -245);
export const TRUCK_DOCK: Vec2 = b(-75, -350);

// Tuning knobs (seconds, floor units per second).
export const SPAWN_INTERVAL_S = 2;
export const BLOCK_SPEED = 4;
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
