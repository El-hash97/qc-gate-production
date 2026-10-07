import type { EntryLog, ProductLine } from '@/lib/types';

// Block Cylinder flask numbers offered as boxes on the NG/Repair input. Matches
// the flask heatmap's minimum rows (FLASK_MIN_ROWS in utils/charts.ts).
export const FLASK_NUMBERS = ['1', '2', '3', '4', '5'] as const;

function normalizeLot(lot: string): string {
  return lot.trim().toLowerCase();
}

// Flasks already logged under this lot this shift for the same product — any
// NG or Repair entry — so the input can grey them out and block a second
// entry for the same piece. BC 1TR and BC 2TR are different products, so the
// same lot/flask on the other line is a different piece and stays free.
export function takenFlasks(logs: EntryLog[], lot: string, line: ProductLine): string[] {
  const key = normalizeLot(lot);
  if (!key) return [];
  const taken: string[] = [];
  for (const log of logs) {
    if (log.line !== line) continue;
    if (normalizeLot(log.lot) !== key) continue;
    if (!taken.includes(log.flask)) taken.push(log.flask);
  }
  return taken;
}
