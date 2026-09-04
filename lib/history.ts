import { sql } from './db';
import { getProductionState } from './productionState';
import type { EntryLog, HourlySnapshot, LineStop, HistoryRecord, ProductionState } from './types';

interface HistoryRow {
  id: number;
  date: string;
  shift: string;
  operator: string;
  pic?: string;
  target: number;
  target_bc?: number;
  target_cam?: number;
  target_crank?: number;
  ok1: number; repair1: number; ng1: number;
  ok2: number; repair2: number; ng2: number;
  ok3?: number; repair3?: number; ng3?: number;
  ok4?: number; repair4?: number; ng4?: number;
  defect_data: Record<string, number>;
  repair_data: Record<string, number>;
  hourly_data: Record<string, HourlySnapshot>;
  defect_data_shaft?: Record<string, number>;
  repair_data_shaft?: Record<string, number>;
  hourly_data_shaft?: Record<string, HourlySnapshot>;
  hourly_data_cam?: Record<string, HourlySnapshot>;
  hourly_data_crank?: Record<string, HourlySnapshot>;
  hourly_target_bc?: Record<string, number>;
  hourly_target_cam?: Record<string, number>;
  hourly_target_crank?: Record<string, number>;
  entry_logs: EntryLog[];
  line_stops?: LineStop[];
  saved_at: string;
}

function rowToHistory(row: HistoryRow): HistoryRecord {
  return {
    id: row.id,
    date: row.date,
    shift: row.shift,
    operator: row.operator,
    pic: row.pic ?? '',
    target: row.target,
    targetBc: row.target_bc ?? 0,
    targetCam: row.target_cam ?? 0,
    targetCrank: row.target_crank ?? 0,
    ok1: row.ok1, repair1: row.repair1, ng1: row.ng1,
    ok2: row.ok2, repair2: row.repair2, ng2: row.ng2,
    ok3: row.ok3 ?? 0, repair3: row.repair3 ?? 0, ng3: row.ng3 ?? 0,
    ok4: row.ok4 ?? 0, repair4: row.repair4 ?? 0, ng4: row.ng4 ?? 0,
    defectData: row.defect_data ?? {},
    repairData: row.repair_data ?? {},
    hourlyData: row.hourly_data ?? {},
    defectDataShaft: row.defect_data_shaft ?? {},
    repairDataShaft: row.repair_data_shaft ?? {},
    hourlyDataShaft: row.hourly_data_shaft ?? {},
    hourlyDataCam: row.hourly_data_cam ?? {},
    hourlyDataCrank: row.hourly_data_crank ?? {},
    hourlyTargetBc: row.hourly_target_bc ?? {},
    hourlyTargetCam: row.hourly_target_cam ?? {},
    hourlyTargetCrank: row.hourly_target_crank ?? {},
    entryLogs: row.entry_logs ?? [],
    lineStops: row.line_stops ?? [],
    savedAt: row.saved_at,
  };
}

export interface HistoryFilters {
  limit?: number;
  date?: string;
  shift?: string;
}

export async function getHistory(filters: HistoryFilters = {}): Promise<HistoryRecord[]> {
  const limit = filters.limit ?? 30;
  const date = filters.date ?? null;
  const shift = filters.shift ?? null;

  const rows = (await sql`
    SELECT * FROM history
    WHERE (${date}::text IS NULL OR date = ${date})
      AND (${shift}::text IS NULL OR shift = ${shift})
    ORDER BY id DESC
    LIMIT ${limit}
  `) as HistoryRow[];

  return rows.map(rowToHistory);
}

export class HistoryRecordNotFoundError extends Error {
  constructor(id: number) {
    super(`History record ${id} not found`);
    this.name = 'HistoryRecordNotFoundError';
  }
}

// "Edit" in the History view: copy an archived shift back into the live
// production_state (id = 1) and remove it from history, so the operator can
// keep editing it on the Input page and it shows on the dashboard again. The
// next Reset re-archives it. Overwrites whatever is currently in production_state
// — the caller is expected to have confirmed that with the user.
export async function restoreHistoryToCurrent(id: number): Promise<ProductionState> {
  const rows = (await sql`SELECT * FROM history WHERE id = ${id}`) as HistoryRow[];
  const row = rows[0];
  if (!row) throw new HistoryRecordNotFoundError(id);

  await sql.transaction([
    sql`
      UPDATE production_state SET
        date = ${row.date}, shift = ${row.shift}, operator = ${row.operator}, pic = ${row.pic ?? ''}, target = ${row.target},
        target_bc = ${row.target_bc ?? 0}, target_cam = ${row.target_cam ?? 0}, target_crank = ${row.target_crank ?? 0},
        ok1 = ${row.ok1}, repair1 = ${row.repair1}, ng1 = ${row.ng1},
        ok2 = ${row.ok2}, repair2 = ${row.repair2}, ng2 = ${row.ng2},
        ok3 = ${row.ok3 ?? 0}, repair3 = ${row.repair3 ?? 0}, ng3 = ${row.ng3 ?? 0},
        ok4 = ${row.ok4 ?? 0}, repair4 = ${row.repair4 ?? 0}, ng4 = ${row.ng4 ?? 0},
        defect_data = ${JSON.stringify(row.defect_data ?? {})}::jsonb,
        repair_data = ${JSON.stringify(row.repair_data ?? {})}::jsonb,
        hourly_data = ${JSON.stringify(row.hourly_data ?? {})}::jsonb,
        defect_data_shaft = ${JSON.stringify(row.defect_data_shaft ?? {})}::jsonb,
        repair_data_shaft = ${JSON.stringify(row.repair_data_shaft ?? {})}::jsonb,
        hourly_data_shaft = ${JSON.stringify(row.hourly_data_shaft ?? {})}::jsonb,
        hourly_data_cam = ${JSON.stringify(row.hourly_data_cam ?? {})}::jsonb,
        hourly_data_crank = ${JSON.stringify(row.hourly_data_crank ?? {})}::jsonb,
        hourly_target_bc = ${JSON.stringify(row.hourly_target_bc ?? {})}::jsonb,
        hourly_target_cam = ${JSON.stringify(row.hourly_target_cam ?? {})}::jsonb,
        hourly_target_crank = ${JSON.stringify(row.hourly_target_crank ?? {})}::jsonb,
        entry_logs = ${JSON.stringify(row.entry_logs ?? [])}::jsonb,
        line_stops = ${JSON.stringify(row.line_stops ?? [])}::jsonb,
        saved_at = now()
      WHERE id = 1
    `,
    sql`DELETE FROM history WHERE id = ${id}`,
  ]);

  const fresh = await getProductionState();
  if (!fresh) throw new Error('production_state row missing after restore');
  return fresh;
}
