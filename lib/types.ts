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
  defectData: Record<string, number>;
  repairData: Record<string, number>;
  hourlyData: Record<string, { ok: number; repair: number; ng: number }>;
  savedAt: string;
}

export interface HistoryRecord extends ProductionState {
  id: number;
}
