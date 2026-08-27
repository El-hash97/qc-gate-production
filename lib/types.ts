export interface EntryLog {
  kind: 'defect' | 'repair';
  type: string;
  qty: number;
  lot: string;
  flask: string;
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
  defectData: Record<string, number>;
  repairData: Record<string, number>;
  hourlyData: Record<string, { ok: number; repair: number; ng: number }>;
  entryLogs: EntryLog[];
  savedAt: string;
}

export interface HistoryRecord extends ProductionState {
  id: number;
}
