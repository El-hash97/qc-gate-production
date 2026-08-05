import { sql } from './db';
import type { ProductionState } from './types';

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
  defect_data: Record<string, number>;
  repair_data: Record<string, number>;
  hourly_data: Record<string, { ok: number; repair: number; ng: number }>;
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
    defectData: row.defect_data ?? {},
    repairData: row.repair_data ?? {},
    hourlyData: row.hourly_data ?? {},
    savedAt: row.saved_at,
  };
}

export async function getProductionState(): Promise<ProductionState | null> {
  const rows = (await sql`SELECT * FROM production_state WHERE id = 1`) as ProductionStateRow[];
  const row = rows[0];
  return row ? rowToState(row) : null;
}

const COUNTER_FIELDS = ['ok1', 'repair1', 'ng1', 'ok2', 'repair2', 'ng2'] as const;

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
      defect_data = ${JSON.stringify(state.defectData ?? {})}::jsonb,
      repair_data = ${JSON.stringify(state.repairData ?? {})}::jsonb,
      hourly_data = ${JSON.stringify(state.hourlyData ?? {})}::jsonb,
      saved_at = now()
    WHERE id = 1
  `;
}
