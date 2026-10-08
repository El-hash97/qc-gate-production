import * as XLSX from 'xlsx';
import type { EntryLog, HourlySnapshot, ProductionState, ProductLine } from '@/lib/types';
import { PRODUCT_LINE_LABELS } from '@/lib/types';
import { findPic } from '@/utils/constants';
import { sortHourKeys } from '@/utils/hourOrder';
import {
  getAchievementPercent, getGrandTotal, getNgTotal, getOkTotal, getRates, getRepairTotal,
} from '@/utils/rates';

type Row = (string | number)[];

// SheetJS community edition has no cell styling — "rapi" here means structure:
// one headline (merged across the table width), a meta block, then one table
// per section separated by a blank row, plus fitted column widths.
function sheetFromRows(rows: Row[], widths: number[]): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const lastCol = rows.reduce((max, row) => Math.max(max, row.length), 1) - 1;
  if (lastCol > 0) {
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
  }
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  return sheet;
}

function metaRows(state: ProductionState): Row[] {
  const pic = findPic(state.pic);
  const rows: Row[] = [
    ['Tanggal', state.date || '—'],
    ['Shift', state.shift],
    ['Operator', state.operator || '—'],
    ['PIC', pic?.name ?? state.pic ?? '—'],
  ];
  if (state.shiftTime === 'day' || state.shiftTime === 'night') {
    rows.splice(2, 0, ['Jam Shift', state.shiftTime === 'day' ? 'Day (07:00–19:00)' : 'Night (20:00–08:00)']);
  }
  return rows;
}

function sortedEntries(map: Record<string, number> | undefined): [string, number][] {
  return Object.entries(map ?? {}).sort((a, b) => b[1] - a[1]);
}

// Defect/repair per line read from the line-tagged entry logs (same source
// the dashboard's per-product views use) — the stored defectData buckets are
// per group (BC vs Shaft), so they can't be split per line.
function bucketFromLogs(logs: EntryLog[], line: ProductLine, kind: 'defect' | 'repair'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const log of logs) {
    if (log.line === line && log.kind === kind) out[log.type] = (out[log.type] ?? 0) + log.qty;
  }
  return out;
}

function countTable(title: string, map: Record<string, number> | undefined, labelCol: string): Row[] {
  const entries = sortedEntries(map);
  const rows: Row[] = [[title], [labelCol, 'Jumlah']];
  if (entries.length === 0) {
    rows.push(['(Belum ada data)', '']);
  } else {
    for (const [name, count] of entries) rows.push([name, count]);
  }
  return rows;
}

function hourlyTable(
  title: string, hourly: Record<string, HourlySnapshot> | undefined, targetByHour?: Record<string, number>,
): Row[] {
  const keys = sortHourKeys(Object.keys(hourly ?? {}));
  const withTarget = targetByHour !== undefined;
  const rows: Row[] = [[title], withTarget ? ['Jam', 'OK', 'Repair', 'NG', 'Total', 'Target'] : ['Jam', 'OK', 'Repair', 'NG', 'Total']];
  if (keys.length === 0) {
    rows.push(['(Belum ada data)', '', '', '', '']);
    if (withTarget) rows[rows.length - 1].push('');
  } else {
    for (const hour of keys) {
      const snap = (hourly ?? {})[hour];
      const total = snap.ok + snap.repair + snap.ng;
      const row: Row = [hour, snap.ok, snap.repair, snap.ng, total];
      if (withTarget) row.push(targetByHour?.[hour] ?? '');
      rows.push(row);
    }
  }
  return rows;
}

interface LineConfig {
  line: ProductLine;
  target?: number;
  hourly?: Record<string, HourlySnapshot>;
  hourlyTarget?: Record<string, number>;
}

function productSheet(state: ProductionState, config: LineConfig): XLSX.WorkSheet {
  const { line, target, hourly, hourlyTarget } = config;
  const label = PRODUCT_LINE_LABELS[line];
  const ok = getOkTotal(state, line);
  const repair = getRepairTotal(state, line);
  const ng = getNgTotal(state, line);
  const total = getGrandTotal(state, line);
  const rates = getRates(state, line);

  const rows: Row[] = [
    [`Laporan Shift — ${label}`],
    [],
    ...metaRows(state),
    [],
    ['Produksi'],
    ['OK', 'Repair', 'NG', 'Total', 'OK%', 'Repair%', 'NG%'],
    [ok, repair, ng, total, `${rates.okRate}%`, `${rates.repairRate}%`, `${rates.ngRate}%`],
  ];
  if (target !== undefined && target > 0) {
    rows.push(['Target', 'Tercapai', 'Achievement']);
    rows.push([target, total, `${getAchievementPercent(state, target, line)}%`]);
  }
  rows.push([], ...countTable('Defect (NG)', bucketFromLogs(state.entryLogs, line, 'defect'), 'Jenis Defect'));
  rows.push([], ...countTable('Repair', bucketFromLogs(state.entryLogs, line, 'repair'), 'Jenis Repair'));
  rows.push([], ...hourlyTable('Hourly', hourly, hourlyTarget));

  return sheetFromRows(rows, [22, 18, 14, 14, 14, 14, 14]);
}

function summarySheet(state: ProductionState): XLSX.WorkSheet {
  const groups: { label: string; scope: 1 | 2 | 3 | 4 | 'bc' | undefined; target: number }[] = [
    { label: 'BC 1TR + BC 2TR', scope: 'bc', target: state.targetBc ?? 0 },
    { label: 'Camshaft', scope: 3, target: state.targetCam ?? 0 },
    { label: 'Crankshaft', scope: 4, target: state.targetCrank ?? 0 },
  ];
  const rows: Row[] = [
    ['Ringkasan Shift'],
    [],
    ...metaRows(state),
    ['Target Total', state.target],
    [],
    ['Produksi per Produk'],
    ['Produk', 'Target', 'OK', 'Repair', 'NG', 'Total', 'OK%', 'Achievement%'],
  ];
  for (const group of groups) {
    const ok = getOkTotal(state, group.scope);
    const repair = getRepairTotal(state, group.scope);
    const ng = getNgTotal(state, group.scope);
    const total = getGrandTotal(state, group.scope);
    const rates = getRates(state, group.scope);
    rows.push([
      group.label,
      group.target > 0 ? group.target : '—',
      ok, repair, ng, total,
      `${rates.okRate}%`,
      group.target > 0 ? `${getAchievementPercent(state, group.target, group.scope)}%` : '—',
    ]);
  }
  const rates = getRates(state);
  rows.push([
    'TOTAL', state.target,
    getOkTotal(state), getRepairTotal(state), getNgTotal(state), getGrandTotal(state),
    `${rates.okRate}%`,
    state.target > 0 ? `${getAchievementPercent(state, state.target)}%` : '—',
  ]);
  return sheetFromRows(rows, [22, 14, 12, 12, 12, 12, 12, 14]);
}

const CATEGORY_LABEL: Record<string, string> = { AV: 'AV (Availability)', PE: 'PE (Performance)', RQ: 'RQ (Quality)' };

function lineStopSheet(state: ProductionState): XLSX.WorkSheet {
  const stops = state.lineStops ?? [];
  const rows: Row[] = [
    ['Line Stop'],
    [],
    ...metaRows(state),
    [],
    ['Daftar Line Stop'],
    ['Mulai', 'Selesai', 'Kategori', 'Item Problem', 'Countermeasure'],
  ];
  if (stops.length === 0) {
    rows.push(['(Belum ada data)', '', '', '', '']);
  } else {
    for (const stop of stops) {
      rows.push([stop.start, stop.end, CATEGORY_LABEL[stop.category] ?? stop.category, stop.problem, stop.countermeasure || '—']);
    }
  }
  return sheetFromRows(rows, [12, 12, 20, 36, 36]);
}

function entryLogSheet(state: ProductionState): XLSX.WorkSheet {
  const rows: Row[] = [
    ['Entry Log (Lot / Flask)'],
    [],
    ...metaRows(state),
    [],
    ['Daftar Entry'],
    ['Jenis', 'Produk', 'Tipe', 'Qty', 'Lot', 'Flask / Cavity', 'No. Die'],
  ];
  if (state.entryLogs.length === 0) {
    rows.push(['(Belum ada data)', '', '', '', '', '', '']);
  } else {
    for (const log of state.entryLogs) {
      rows.push([
        log.kind === 'defect' ? 'Defect (NG)' : 'Repair',
        log.line ? PRODUCT_LINE_LABELS[log.line] : (log.group === 'shaft' ? 'Shaft' : 'BC'),
        log.type, log.qty, log.lot, log.flask, log.die ?? '—',
      ]);
    }
  }
  return sheetFromRows(rows, [14, 14, 28, 8, 16, 16, 10]);
}

export function buildShiftWorkbook(state: ProductionState) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet(state), 'Ringkasan');
  const lines: LineConfig[] = [
    { line: 1, hourly: state.hourlyDataBc1 },
    { line: 2, hourly: state.hourlyDataBc2 },
    { line: 3, target: state.targetCam, hourly: state.hourlyDataCam, hourlyTarget: state.hourlyTargetCam },
    { line: 4, target: state.targetCrank, hourly: state.hourlyDataCrank, hourlyTarget: state.hourlyTargetCrank },
  ];
  for (const config of lines) {
    XLSX.utils.book_append_sheet(workbook, productSheet(state, config), PRODUCT_LINE_LABELS[config.line]);
  }
  XLSX.utils.book_append_sheet(workbook, lineStopSheet(state), 'Line Stop');
  XLSX.utils.book_append_sheet(workbook, entryLogSheet(state), 'Entry Log');
  return workbook;
}

export function buildShiftFileName(state: ProductionState): string {
  const shiftPart = state.shift.replace(/\s/g, '_');
  const datePart = new Date().toISOString().slice(0, 10);
  return `QC_Gate_${shiftPart}_${datePart}.xlsx`;
}

export function exportShiftToExcel(state: ProductionState): void {
  const workbook = buildShiftWorkbook(state);
  XLSX.writeFile(workbook, buildShiftFileName(state));
}
