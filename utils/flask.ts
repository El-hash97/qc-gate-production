import type { EntryLog } from '@/lib/types';

// Block Cylinder flask numbers offered as boxes on the NG/Repair input. Matches
// the flask heatmap's minimum rows (FLASK_MIN_ROWS in utils/charts.ts).
export const FLASK_NUMBERS = ['1', '2', '3', '4', '5'] as const;

function normalizeLot(lot: string): string {
  return lot.trim().toLowerCase();
}

// Flasks already logged under this lot this shift — any NG or Repair entry on
// either BC line — so the input can grey them out and block a second entry
// for the same piece. Camshaft/Crankshaft are skipped: their slot holds cavity
// specs ("1-6"), not flask numbers.
export function takenFlasks(logs: EntryLog[], lot: string): string[] {
  const key = normalizeLot(lot);
  if (!key) return [];
  const taken: string[] = [];
  for (const log of logs) {
    if ((log.group ?? 'bc') !== 'bc') continue;
    if (normalizeLot(log.lot) !== key) continue;
    if (!taken.includes(log.flask)) taken.push(log.flask);
  }
  return taken;
}
