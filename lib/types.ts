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

export function lineGroup(line: ProductLine): ProductGroup {
  return line <= 2 ? 'bc' : 'shaft';
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
}

export interface HourlySnapshot {
  ok: number;
  repair: number;
  ng: number;
}

export interface ProductionState {
  date: string;
  shift: string;
  operator: string;
  target: number;
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
  entryLogs: EntryLog[];
  savedAt: string;
}

export interface HistoryRecord extends ProductionState {
  id: number;
}
