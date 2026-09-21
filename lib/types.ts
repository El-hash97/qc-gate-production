// 'bc' = BC 1TR + BC 2TR (Block Cylinder). 'shaft' = Camshaft + Crankshaft.
// The dashboard toggle scopes every panel to one of these groups (or shows
// both merged).
export type ProductGroup = 'bc' | 'shaft';

// The four production lines, by counter index (ok1/repair1/ng1 … ok4/…).
export type ProductLine = 1 | 2 | 3 | 4;

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  1: 'BC 1TR',
  2: 'BC 2TR',
  3: 'Camshaft',
  4: 'Crankshaft',
};

// Product identity colours (match the --accent-* vars in globals.css):
// BC 1TR red, BC 2TR blue, Camshaft yellow, Crankshaft green.
export const PRODUCT_LINE_COLOR: Record<ProductLine, string> = {
  1: '#dc2626',
  2: '#3b82f6',
  3: '#eab308',
  4: '#22c55e',
};

export function lineGroup(line: ProductLine): ProductGroup {
  return line <= 2 ? 'bc' : 'shaft';
}

export interface OverDimensiDetail {
  dieMould: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  coreCombo: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  crankCaseNo: string;
  slubWjNo: string;
  position: 'Front' | 'Rear';
}

export interface EntryLog {
  kind: 'defect' | 'repair';
  // Optional so logs written before the split still parse — they are always
  // Block Cylinder, so every read site treats a missing group as 'bc'.
  group?: ProductGroup;
  // Which of the four lines the entry was logged against. Optional for the
  // same back-compat reason; the log list shows the product name when set.
  line?: ProductLine;
  type: string;
  qty: number;
  lot: string;
  flask: string;
  // Die (mould) number 1-4 the piece came from. Only ever set for Mejashi
  // Bore repairs (see DIE_NUMBER_REPAIR_TYPES in utils/constants.ts); every
  // other entry, and every log written before this field existed, omits it.
  die?: 1 | 2 | 3 | 4;
  // Over Dimensi detail — only set when type === 'Over Dimensi' (BC 1TR/2TR).
  overDimensi?: OverDimensiDetail;
}

// A plant-wide line stop logged during the shift. start/end are "HH:MM"
// (24h). category is an OEE loss bucket: AV (availability), PE (performance),
// RQ (rate/quality).
export interface LineStop {
  start: string;
  end: string;
  problem: string;
  category: 'AV' | 'PE' | 'RQ';
}

export interface HourlySnapshot {
  ok: number;
  repair: number;
  ng: number;
}

// The actual worked window of one hour, start/end as "HH:MM" (24h). A break at
// the start, end, or middle of the hour is recorded by narrowing this range.
export interface HourWindow {
  start: string;
  end: string;
}

export interface ProductionState {
  date: string;
  shift: string;
  operator: string;
  // PIC / Group Leader key: 'suryo' | 'koewatno' | ''. Optional for
  // back-compat; every read site defaults a missing value to ''.
  pic?: string;
  // Grand-shift target (kept as targetBc + targetCam + targetCrank). Older
  // rows without the per-group columns below still read this as the total.
  target: number;
  // Per-product-group targets: BC = BC 1TR + BC 2TR, Cam = Camshaft, Crank =
  // Crankshaft. Optional for back-compat; every read site defaults to 0.
  targetBc?: number;
  targetCam?: number;
  targetCrank?: number;
  ok1: number;
  repair1: number;
  ng1: number;
  ok2: number;
  repair2: number;
  ng2: number;
  // Camshaft (yellow) and Crankshaft (green) — optional so older
  // rows/fixtures without these columns still satisfy the type; every read
  // site defaults missing values to 0.
  ok3?: number;
  repair3?: number;
  ng3?: number;
  ok4?: number;
  repair4?: number;
  ng4?: number;
  // Block Cylinder (BC 1TR + BC 2TR) breakdowns. Historically these held all
  // production, so older rows without the *Shaft siblings below still read
  // correctly as pure BC data.
  defectData: Record<string, number>;
  repairData: Record<string, number>;
  hourlyData: Record<string, HourlySnapshot>;
  // Camshaft + Crankshaft breakdowns. Optional for back-compat; every read
  // site defaults a missing value to an empty map.
  defectDataShaft?: Record<string, number>;
  repairDataShaft?: Record<string, number>;
  hourlyDataShaft?: Record<string, HourlySnapshot>;
  // Per-line hourly for Camshaft (line 3) / Crankshaft (line 4). hourlyDataShaft
  // stays as their sum for the merged view; every read site defaults to {}.
  hourlyDataCam?: Record<string, HourlySnapshot>;
  hourlyDataCrank?: Record<string, HourlySnapshot>;
  // Per-hour production target (pcs) per product group, keyed "HH:00". Edited in
  // the dashboard Hourly table; the "Semua" view shows the per-hour sum of the
  // three. Optional for back-compat; every read site defaults to {}.
  hourlyTargetBc?: Record<string, number>;
  hourlyTargetCam?: Record<string, number>;
  hourlyTargetCrank?: Record<string, number>;
  // Actual worked window per hour, keyed "HH:00". Plant-wide (a break hits every
  // line), edited in the dashboard Hourly table. An hour with no entry means the
  // full clock hour (HH:00 -> HH+1:00). Feeds the OEE availability/performance
  // factors: a narrower window is fewer minutes of capacity for that hour.
  // Optional for back-compat; every read site defaults to {}.
  hourlyWindow?: Record<string, HourWindow>;
  // Cycle time in seconds for Block Cylinder, the basis of the OEE
  // availability factor (3600 / ct = pcs an uninterrupted hour yields).
  // Optional for back-compat; every read site falls back to
  // DEFAULT_CYCLE_TIME_SEC.
  cycleTimeBc?: number;
  entryLogs: EntryLog[];
  // Plant-wide line stops. Optional for back-compat; every read site defaults
  // a missing value to [].
  lineStops?: LineStop[];
  savedAt: string;
}

export interface HistoryRecord extends ProductionState {
  id: number;
}

// Suspect Defect Line master data — which foundry process stage(s) a defect
// name is suspected to originate from. Many-to-many (see defect_lines table);
// the four line names themselves are fixed, not part of the editable data.
export const DEFECT_LINE_NAMES = ['Melting', 'Moulding', 'Core Making', 'Finishing'] as const;
export type DefectLineName = (typeof DEFECT_LINE_NAMES)[number];

export interface DefectLineMapping {
  id: number;
  line: DefectLineName;
  defectName: string;
}
