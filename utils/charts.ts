import type { EntryLog, HourlySnapshot, ProductLine } from '@/lib/types';

// --- Hourly combo chart: per-hour OK/Repair/NG bars + a cumulative total line ---

export interface HourlySeries {
  hours: string[];
  ok: number[];
  repair: number[];
  ng: number[];
  cumulative: number[];
}

export function hourlySeries(hourly: Record<string, HourlySnapshot>): HourlySeries {
  const hours = Object.keys(hourly).sort();
  const series: HourlySeries = { hours, ok: [], repair: [], ng: [], cumulative: [] };
  let running = 0;
  for (const hour of hours) {
    const snap = hourly[hour];
    running += snap.ok + snap.repair + snap.ng;
    series.ok.push(snap.ok);
    series.repair.push(snap.repair);
    series.ng.push(snap.ng);
    series.cumulative.push(running);
  }
  return series;
}

// --- Pareto: counts sorted desc + running cumulative percentage ---

export interface Pareto {
  labels: string[];
  counts: number[];
  cumulativePct: number[];
}

export function pareto(data: Record<string, number>): Pareto {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, n]) => sum + n, 0);
  const result: Pareto = { labels: [], counts: [], cumulativePct: [] };
  let running = 0;
  for (const [label, count] of sorted) {
    running += count;
    result.labels.push(label);
    result.counts.push(count);
    result.cumulativePct.push(total === 0 ? 0 : Math.round((running / total) * 100));
  }
  return result;
}

// --- Flask/Cavity x defect-type heatmap ---

export interface FlaskMatrix {
  // Row labels, low->high. The chart reverses the axis so the first row sits at
  // the bottom.
  flasks: string[];
  types: string[];
  // One entry per non-empty cell. `lots` lists every lot number that fed it,
  // sorted numeric-aware — shown in the tooltip.
  cells: { x: string; y: string; v: number; lots: string[] }[];
  max: number;
}

// Camshaft/Crankshaft mould cavities are numbered 1 to 8.
export const CAVITY_COUNT = 8;

// A cavity entry may name a single cavity ("3"), a range ("1-6" covers 1..6), or
// a comma list ("1,4,7"). Anything outside 1..CAVITY_COUNT is dropped.
export function expandCavities(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(',')) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
      for (let n = a; n <= b; n++) if (n >= 1 && n <= CAVITY_COUNT) out.add(n);
    } else {
      const n = Number(part.trim());
      if (Number.isInteger(n) && n >= 1 && n <= CAVITY_COUNT) out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

function addLot(lots: Map<string, Set<string>>, key: string, lot: string): void {
  if (!lot) return;
  const set = lots.get(key) ?? new Set<string>();
  set.add(lot);
  lots.set(key, set);
}

function fillCells(
  flasks: string[],
  types: string[],
  totals: Map<string, number>,
  lots: Map<string, Set<string>>,
): Pick<FlaskMatrix, 'cells' | 'max'> {
  const cells: FlaskMatrix['cells'] = [];
  let max = 0;
  for (const flask of flasks) {
    for (const type of types) {
      const key = `${flask} ${type}`;
      const v = totals.get(key) ?? 0;
      if (v > 0) {
        const cellLots = [...(lots.get(key) ?? [])].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        );
        cells.push({ x: type, y: flask, v, lots: cellLots });
        if (v > max) max = v;
      }
    }
  }
  return { cells, max };
}

// Block Cylinder: one row per flask number seen, sorted low->high (numeric-aware,
// so "10" sorts after "2").
export function flaskTypeMatrix(logs: EntryLog[]): FlaskMatrix {
  const totals = new Map<string, number>();
  const lots = new Map<string, Set<string>>();
  const flasks: string[] = [];
  const types: string[] = [];
  for (const log of logs) {
    if (!flasks.includes(log.flask)) flasks.push(log.flask);
    if (!types.includes(log.type)) types.push(log.type);
    const key = `${log.flask} ${log.type}`;
    totals.set(key, (totals.get(key) ?? 0) + log.qty);
    addLot(lots, key, log.lot);
  }
  flasks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { flasks, types, ...fillCells(flasks, types, totals, lots) };
}

// Camshaft/Crankshaft: rows fixed at cavities 1..CAVITY_COUNT. A "1-6" entry adds
// its qty to every cavity 1..6; repeated entries stack (sum).
export function cavityTypeMatrix(logs: EntryLog[]): FlaskMatrix {
  const totals = new Map<string, number>();
  const lots = new Map<string, Set<string>>();
  const flasks = Array.from({ length: CAVITY_COUNT }, (_, i) => String(i + 1));
  const types: string[] = [];
  for (const log of logs) {
    if (!types.includes(log.type)) types.push(log.type);
    for (const cavity of expandCavities(log.flask)) {
      const key = `${cavity} ${log.type}`;
      totals.set(key, (totals.get(key) ?? 0) + log.qty);
      addLot(lots, key, log.lot);
    }
  }
  return { flasks, types, ...fillCells(flasks, types, totals, lots) };
}

// --- Lot x defect scatter: dot-with-line, one series per product line ---

export interface LotDefectPoint {
  x: string; // defect type (category axis)
  y: number; // lot number
  flask: string; // flask / cavity spec, for the tooltip
  qty: number;
}

export interface LotDefectSeries {
  line: ProductLine;
  points: LotDefectPoint[];
}

export interface LotDefectData {
  types: string[];
  maxLot: number;
  series: LotDefectSeries[];
}

export function lotDefectData(logs: EntryLog[]): LotDefectData {
  const types: string[] = [];
  const byLine = new Map<ProductLine, LotDefectPoint[]>();
  let maxLot = 0;
  for (const log of logs) {
    const y = Number(log.lot);
    if (!log.lot.trim() || !Number.isFinite(y)) continue; // non-numeric lot — can't place it on the axis
    if (!types.includes(log.type)) types.push(log.type);
    if (y > maxLot) maxLot = y;
    // Legacy logs without a line are always Block Cylinder line 1.
    const line = (log.line ?? 1) as ProductLine;
    const points = byLine.get(line) ?? [];
    points.push({ x: log.type, y, flask: log.flask, qty: log.qty });
    byLine.set(line, points);
  }
  const series: LotDefectSeries[] = [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([line, points]) => ({
      line,
      // Order the line left->right across defect categories, then by lot.
      points: points.sort((p, q) => types.indexOf(p.x) - types.indexOf(q.x) || p.y - q.y),
    }));
  return { types, maxLot, series };
}
