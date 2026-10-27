import { PRODUCT_LINE_LABELS, type DefectLineMapping, type DefectProduct, type EntryLog } from '@/lib/types';
import { suspectLinesFor } from '@/utils/defectLines';

// A repair repeats when this many repair inputs in a row (log order) come
// from the same die and lot, whatever their repair type.
export const MIN_RUN = 2;
export const NO_LINE = 'Belum dipetakan';

export interface SuspectRow {
  lines: string[];
  product: string;
  type: string;
  die: number;
  lot: string;
  // inputs of this repair type in the run, and of the whole run
  inputs: number;
  runInputs: number;
  qty: number;
  // the run's place in the log, 1-based
  from: number;
  to: number;
}

export interface RepairSuspect {
  rows: SuspectRow[];
  // pcs in all runs (each piece once), runs found, distinct suspect lines
  pcs: number;
  runs: number;
  lines: number;
  // pcs per suspect line; a repair suspect for two lines counts for both
  byLine: Record<string, number>;
}

// Only repairs with a die number take part (Mejashi Bore, every Camshaft
// entry); other inputs in between don't break a run.
export function repairSuspects(logs: readonly EntryLog[], mappings: DefectLineMapping[], product?: DefectProduct): RepairSuspect {
  const runs: { log: EntryLog; at: number }[][] = [];
  logs.forEach((log, i) => {
    if (log.kind !== 'repair' || !log.die || !log.lot.trim()) return;
    const run = runs.at(-1);
    const prev = run?.at(-1)?.log;
    const same = prev && prev.die === log.die && prev.lot.trim() === log.lot.trim() && prev.line === log.line;
    if (run && same) run.push({ log, at: i + 1 });
    else runs.push([{ log, at: i + 1 }]);
  });

  const rows: SuspectRow[] = [];
  const byLine: Record<string, number> = {};
  let pcs = 0;
  const repeated = runs.filter((run) => run.length >= MIN_RUN);
  for (const run of repeated) {
    const first = run[0].log;
    const byType = new Map<string, { inputs: number; qty: number }>();
    for (const { log } of run) {
      const t = byType.get(log.type) ?? { inputs: 0, qty: 0 };
      t.inputs += 1;
      t.qty += log.qty;
      byType.set(log.type, t);
    }
    for (const [type, t] of byType) {
      const found = suspectLinesFor(type, mappings, product);
      const lines = found.length ? found : [NO_LINE];
      for (const line of lines) byLine[line] = (byLine[line] ?? 0) + t.qty;
      pcs += t.qty;
      rows.push({
        lines, type, die: first.die!, lot: first.lot.trim(),
        product: first.line ? PRODUCT_LINE_LABELS[first.line] : '—',
        inputs: t.inputs, runInputs: run.length, qty: t.qty, from: run[0].at, to: run.at(-1)!.at,
      });
    }
  }
  const lines = Object.keys(byLine).filter((l) => l !== NO_LINE).length;
  return { rows, pcs, runs: repeated.length, lines, byLine };
}
