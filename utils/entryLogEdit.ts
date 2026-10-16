import type { EntryLog, OverDimensiDetail, ProductionState } from '@/lib/types';
import { lineGroup } from '@/lib/types';
import { entryDie } from '@/utils/flask';
import { canonicalType } from '@/utils/typeName';

export interface EntryLogEdit {
  type: string;
  qty: number;
  lot: string;
  flask: string;
  die?: 1 | 2 | 3 | 4;
  overDimensi?: OverDimensiDetail;
}

// Correct one Lot/Flask log entry in place. Product and NG/Repair kind stay
// fixed; the line's NG/Repair counter moves by the qty change and the type
// tally moves from the old type to the new one, so counters, Pareto and the
// log stay consistent with each other.
export function editEntryLog(state: ProductionState, index: number, edit: EntryLogEdit): Partial<ProductionState> {
  const old = state.entryLogs[index];
  if (!old) return {};
  // Legacy logs without a line are always BC line 1.
  const line = old.line ?? 1;
  const counter = `${old.kind === 'defect' ? 'ng' : 'repair'}${line}` as keyof ProductionState;
  const dataKey = `${old.kind === 'defect' ? 'defectData' : 'repairData'}${lineGroup(line) === 'shaft' ? 'Shaft' : ''}` as
    'defectData' | 'repairData' | 'defectDataShaft' | 'repairDataShaft';

  const data = { ...(state[dataKey] ?? {}) };
  const left = (data[old.type] ?? 0) - old.qty;
  if (left > 0) data[old.type] = left;
  else delete data[old.type];
  const type = canonicalType(edit.type, Object.keys(data));
  data[type] = (data[type] ?? 0) + edit.qty;

  const { die: _die, overDimensi: _od, ...base } = old;
  const die = entryDie(line, edit.flask, edit.die);
  const next: EntryLog = {
    ...base,
    type,
    qty: edit.qty,
    lot: edit.lot,
    flask: edit.flask,
    ...(die ? { die } : {}),
    ...(edit.overDimensi ? { overDimensi: edit.overDimensi } : {}),
  };
  const entryLogs = state.entryLogs.map((log, i) => (i === index ? next : log));

  return {
    [counter]: Math.max(0, ((state[counter] as number) ?? 0) + edit.qty - old.qty),
    [dataKey]: data,
    entryLogs,
  } as Partial<ProductionState>;
}
