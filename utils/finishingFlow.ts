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
