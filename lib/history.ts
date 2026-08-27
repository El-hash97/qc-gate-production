import { sql } from './db';
import type { EntryLog, HistoryRecord } from './types';

interface HistoryRow {
  id: number;
  date: string;
  shift: string;
  operator: string;
  target: number;
  ok1: number; repair1: number; ng1: number;
  ok2: number; repair2: number; ng2: number;
  ok3?: number; repair3?: number; ng3?: number;
  ok4?: number; repair4?: number; ng4?: number;
  defect_data: Record<string, number>;
  repair_data: Record<string, number>;
  hourly_data: Record<string, { ok: number; repair: number; ng: number }>;
  entry_logs: EntryLog[];
  saved_at: string;
}

function rowToHistory(row: HistoryRow): HistoryRecord {
  return {
    id: row.id,
    date: row.date,
    shift: row.shift,
    operator: row.operator,
    target: row.target,
    ok1: row.ok1, repair1: row.repair1, ng1: row.ng1,
    ok2: row.ok2, repair2: row.repair2, ng2: row.ng2,
    ok3: row.ok3 ?? 0, repair3: row.repair3 ?? 0, ng3: row.ng3 ?? 0,
    ok4: row.ok4 ?? 0, repair4: row.repair4 ?? 0, ng4: row.ng4 ?? 0,
    defectData: row.defect_data ?? {},
    repairData: row.repair_data ?? {},
    hourlyData: row.hourly_data ?? {},
    entryLogs: row.entry_logs ?? [],
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
