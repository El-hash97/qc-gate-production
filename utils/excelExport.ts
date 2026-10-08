import ExcelJS from 'exceljs';
import type { EntryLog, HourlySnapshot, ProductionState, ProductLine } from '@/lib/types';
import { PRODUCT_LINE_LABELS } from '@/lib/types';
import { findPic } from '@/utils/constants';
import { sortHourKeys } from '@/utils/hourOrder';
import {
  getAchievementPercent, getGrandTotal, getNgTotal, getOkTotal, getRates, getRepairTotal,
} from '@/utils/rates';

type Cell = string | number;

// ExcelJS (unlike the SheetJS community edition) supports cell styling, so
// every cell is center-aligned and headlines/headers are bold. Structure per
// sheet stays the same: one merged headline, a meta block, then one table per
// section separated by a blank row, plus fitted column widths.
const CENTER: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };

function headline(ws: ExcelJS.Worksheet, text: string, spanCols: number): void {
  const row = ws.addRow([text]);
  row.font = { bold: true, size: 14 };
  if (spanCols > 1) ws.mergeCells(row.number, 1, row.number, spanCols);
}

function section(ws: ExcelJS.Worksheet, text: string): void {
  ws.addRow([text]).font = { bold: true };
}

function header(ws: ExcelJS.Worksheet, cells: Cell[]): void {
  ws.addRow(cells).font = { bold: true };
}

function finishSheet(ws: ExcelJS.Worksheet, widths: number[]): void {
  ws.columns = widths.map((width) => ({ width }));
  ws.eachRow((row) => row.eachCell((cell) => {
    cell.alignment = CENTER;
  }));
}

function addMeta(ws: ExcelJS.Worksheet, state: ProductionState): void {
  const pic = findPic(state.pic);
  ws.addRow(['Tanggal', state.date || '—']);
  ws.addRow(['Shift', state.shift]);
  if (state.shiftTime === 'day' || state.shiftTime === 'night') {
    ws.addRow(['Jam Shift', state.shiftTime === 'day' ? 'Day (07:00–19:00)' : 'Night (20:00–08:00)']);
  }
  ws.addRow(['Operator', state.operator || '—']);
  ws.addRow(['PIC', pic?.name ?? state.pic ?? '—']);
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

function addCountTable(ws: ExcelJS.Worksheet, title: string, map: Record<string, number> | undefined, labelCol: string): void {
  const entries = sortedEntries(map);
  section(ws, title);
  header(ws, [labelCol, 'Jumlah']);
  if (entries.length === 0) {
    ws.addRow(['(Belum ada data)', '']);
  } else {
    for (const [name, count] of entries) ws.addRow([name, count]);
  }
}

function addHourlyTable(
  ws: ExcelJS.Worksheet, hourly: Record<string, HourlySnapshot> | undefined, targetByHour?: Record<string, number>,
): void {
  const keys = sortHourKeys(Object.keys(hourly ?? {}));
  const withTarget = targetByHour !== undefined;
  section(ws, 'Hourly');
  header(ws, withTarget ? ['Jam', 'OK', 'Repair', 'NG', 'Total', 'Target'] : ['Jam', 'OK', 'Repair', 'NG', 'Total']);
  if (keys.length === 0) {
    ws.addRow(withTarget ? ['(Belum ada data)', '', '', '', '', ''] : ['(Belum ada data)', '', '', '', '']);
  } else {
    for (const hour of keys) {
      const snap = (hourly ?? {})[hour];
      const row: Cell[] = [hour, snap.ok, snap.repair, snap.ng, snap.ok + snap.repair + snap.ng];
      if (withTarget) row.push(targetByHour?.[hour] ?? '');
      ws.addRow(row);
    }
  }
}

interface LineConfig {
  line: ProductLine;
  target?: number;
  hourly?: Record<string, HourlySnapshot>;
  hourlyTarget?: Record<string, number>;
}

function productSheet(workbook: ExcelJS.Workbook, state: ProductionState, config: LineConfig): void {
  const { line, target, hourly, hourlyTarget } = config;
  const label = PRODUCT_LINE_LABELS[line];
  const ok = getOkTotal(state, line);
  const repair = getRepairTotal(state, line);
  const ng = getNgTotal(state, line);
  const total = getGrandTotal(state, line);
  const rates = getRates(state, line);

  const ws = workbook.addWorksheet(label);
  headline(ws, `Laporan Shift — ${label}`, 7);
  ws.addRow([]);
  addMeta(ws, state);
  ws.addRow([]);
  section(ws, 'Produksi');
  header(ws, ['OK', 'Repair', 'NG', 'Total', 'OK%', 'Repair%', 'NG%']);
  ws.addRow([ok, repair, ng, total, `${rates.okRate}%`, `${rates.repairRate}%`, `${rates.ngRate}%`]);
  if (target !== undefined && target > 0) {
    header(ws, ['Target', 'Tercapai', 'Achievement']);
    ws.addRow([target, total, `${getAchievementPercent(state, target, line)}%`]);
  }
  ws.addRow([]);
  addCountTable(ws, 'Defect (NG)', bucketFromLogs(state.entryLogs, line, 'defect'), 'Jenis Defect');
  ws.addRow([]);
  addCountTable(ws, 'Repair', bucketFromLogs(state.entryLogs, line, 'repair'), 'Jenis Repair');
  ws.addRow([]);
  addHourlyTable(ws, hourly, hourlyTarget);
  finishSheet(ws, [22, 18, 14, 14, 14, 14, 14]);
}

function summarySheet(workbook: ExcelJS.Workbook, state: ProductionState): void {
  const groups: { label: string; scope: 1 | 2 | 3 | 4 | 'bc' | undefined; target: number }[] = [
    { label: 'BC 1TR + BC 2TR', scope: 'bc', target: state.targetBc ?? 0 },
    { label: 'Camshaft', scope: 3, target: state.targetCam ?? 0 },
    { label: 'Crankshaft', scope: 4, target: state.targetCrank ?? 0 },
  ];
  const ws = workbook.addWorksheet('Ringkasan');
  headline(ws, 'Ringkasan Shift', 8);
  ws.addRow([]);
  addMeta(ws, state);
  ws.addRow(['Target Total', state.target]);
  ws.addRow([]);
  section(ws, 'Produksi per Produk');
  header(ws, ['Produk', 'Target', 'OK', 'Repair', 'NG', 'Total', 'OK%', 'Achievement%']);
  for (const group of groups) {
    const ok = getOkTotal(state, group.scope);
    const repair = getRepairTotal(state, group.scope);
    const ng = getNgTotal(state, group.scope);
    const total = getGrandTotal(state, group.scope);
    const rates = getRates(state, group.scope);
    ws.addRow([
      group.label,
      group.target > 0 ? group.target : '—',
      ok, repair, ng, total,
      `${rates.okRate}%`,
      group.target > 0 ? `${getAchievementPercent(state, group.target, group.scope)}%` : '—',
    ]);
  }
  const rates = getRates(state);
  ws.addRow([
    'TOTAL', state.target,
    getOkTotal(state), getRepairTotal(state), getNgTotal(state), getGrandTotal(state),
    `${rates.okRate}%`,
    state.target > 0 ? `${getAchievementPercent(state, state.target)}%` : '—',
  ]);
  finishSheet(ws, [22, 14, 12, 12, 12, 12, 12, 14]);
}

const CATEGORY_LABEL: Record<string, string> = { AV: 'AV (Availability)', PE: 'PE (Performance)', RQ: 'RQ (Quality)' };

function lineStopSheet(workbook: ExcelJS.Workbook, state: ProductionState): void {
  const stops = state.lineStops ?? [];
  const ws = workbook.addWorksheet('Line Stop');
  headline(ws, 'Line Stop', 5);
  ws.addRow([]);
  addMeta(ws, state);
  ws.addRow([]);
  section(ws, 'Daftar Line Stop');
  header(ws, ['Mulai', 'Selesai', 'Kategori', 'Item Problem', 'Countermeasure']);
  if (stops.length === 0) {
    ws.addRow(['(Belum ada data)', '', '', '', '']);
  } else {
    for (const stop of stops) {
      ws.addRow([stop.start, stop.end, CATEGORY_LABEL[stop.category] ?? stop.category, stop.problem, stop.countermeasure || '—']);
    }
  }
  finishSheet(ws, [12, 12, 20, 36, 36]);
}

function entryLogSheet(workbook: ExcelJS.Workbook, state: ProductionState): void {
  const ws = workbook.addWorksheet('Entry Log');
  headline(ws, 'Entry Log (Lot / Flask)', 7);
  ws.addRow([]);
  addMeta(ws, state);
  ws.addRow([]);
  section(ws, 'Daftar Entry');
  header(ws, ['Jenis', 'Produk', 'Tipe', 'Qty', 'Lot', 'Flask / Cavity', 'No. Die']);
  if (state.entryLogs.length === 0) {
    ws.addRow(['(Belum ada data)', '', '', '', '', '', '']);
  } else {
    for (const log of state.entryLogs) {
      ws.addRow([
        log.kind === 'defect' ? 'Defect (NG)' : 'Repair',
        log.line ? PRODUCT_LINE_LABELS[log.line] : (log.group === 'shaft' ? 'Shaft' : 'BC'),
        log.type, log.qty, log.lot, log.flask, log.die ?? '—',
      ]);
    }
  }
  finishSheet(ws, [14, 14, 28, 8, 16, 16, 10]);
}

export function buildShiftWorkbook(state: ProductionState): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QC Gate';
  summarySheet(workbook, state);
  const lines: LineConfig[] = [
    { line: 1, hourly: state.hourlyDataBc1 },
    { line: 2, hourly: state.hourlyDataBc2 },
    { line: 3, target: state.targetCam, hourly: state.hourlyDataCam, hourlyTarget: state.hourlyTargetCam },
    { line: 4, target: state.targetCrank, hourly: state.hourlyDataCrank, hourlyTarget: state.hourlyTargetCrank },
  ];
  for (const config of lines) productSheet(workbook, state, config);
  lineStopSheet(workbook, state);
  entryLogSheet(workbook, state);
  return workbook;
}

export function buildShiftFileName(state: ProductionState): string {
  const shiftPart = state.shift.replace(/\s/g, '_');
  const datePart = new Date().toISOString().slice(0, 10);
  return `QC_Gate_${shiftPart}_${datePart}.xlsx`;
}

export async function exportShiftToExcel(state: ProductionState): Promise<void> {
  const workbook = buildShiftWorkbook(state);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = buildShiftFileName(state);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
