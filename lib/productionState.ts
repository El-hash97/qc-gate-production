import { sql } from './db';
import type { EntryLog, ProductionState } from './types';

interface ProductionStateRow {
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
  ok3?: number;
  repair3?: number;
  ng3?: number;
  ok4?: number;
  repair4?: number;
  ng4?: number;
  defect_data: Record<string, number>;
  repair_data: Record<string, number>;
  hourly_data: Record<string, { ok: number; repair: number; ng: number }>;
  entry_logs: EntryLog[];
  saved_at: string;
}

function rowToState(row: ProductionStateRow): ProductionState {
  return {
    date: row.date,
    shift: row.shift,
    operator: row.operator,
    target: row.target,
    ok1: row.ok1,
    repair1: row.repair1,
    ng1: row.ng1,
    ok2: row.ok2,
    repair2: row.repair2,
    ng2: row.ng2,
    ok3: row.ok3 ?? 0,
    repair3: row.repair3 ?? 0,
    ng3: row.ng3 ?? 0,
    ok4: row.ok4 ?? 0,
    repair4: row.repair4 ?? 0,
    ng4: row.ng4 ?? 0,
    defectData: row.defect_data ?? {},
    repairData: row.repair_data ?? {},
    hourlyData: row.hourly_data ?? {},
    entryLogs: row.entry_logs ?? [],
    savedAt: row.saved_at,
  };
}

export async function getProductionState(): Promise<ProductionState | null> {
  const rows = (await sql`SELECT * FROM production_state WHERE id = 1`) as ProductionStateRow[];
  const row = rows[0];
  return row ? rowToState(row) : null;
}

const COUNTER_FIELDS = [
  'ok1', 'repair1', 'ng1', 'ok2', 'repair2', 'ng2',
  'ok3', 'repair3', 'ng3', 'ok4', 'repair4', 'ng4',
] as const;

export async function saveProductionState(state: Partial<ProductionState>): Promise<void> {
  for (const field of COUNTER_FIELDS) {
    const value = state[field];
    if (value !== undefined && value < 0) {
      throw new Error('Counter values cannot be negative');
    }
  }

  await sql`
    UPDATE production_state SET
      date = ${state.date ?? ''},
      shift = ${state.shift ?? 'Shift Red'},
      operator = ${state.operator ?? ''},
      target = ${state.target ?? 0},
      ok1 = ${state.ok1 ?? 0},
      repair1 = ${state.repair1 ?? 0},
      ng1 = ${state.ng1 ?? 0},
      ok2 = ${state.ok2 ?? 0},
      repair2 = ${state.repair2 ?? 0},
      ng2 = ${state.ng2 ?? 0},
      ok3 = ${state.ok3 ?? 0},
      repair3 = ${state.repair3 ?? 0},
      ng3 = ${state.ng3 ?? 0},
      ok4 = ${state.ok4 ?? 0},
      repair4 = ${state.repair4 ?? 0},
      ng4 = ${state.ng4 ?? 0},
      defect_data = ${JSON.stringify(state.defectData ?? {})}::jsonb,
      repair_data = ${JSON.stringify(state.repairData ?? {})}::jsonb,
      hourly_data = ${JSON.stringify(state.hourlyData ?? {})}::jsonb,
      entry_logs = ${JSON.stringify(state.entryLogs ?? [])}::jsonb,
      saved_at = now()
    WHERE id = 1
  `;
}
