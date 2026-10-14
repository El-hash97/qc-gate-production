import ExcelJS from 'exceljs';
import type { EntryLog, ProductionState, ProductLine } from '@/lib/types';
import { PRODUCT_LINE_COLOR, PRODUCT_LINE_LABELS } from '@/lib/types';
import { findPic } from '@/utils/constants';
import { lineStopMinutes, toMinutes } from '@/utils/lineStop';
import { getGrandTotal, getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import type { RateScope } from '@/utils/rates';

type Cell = string | number | Date | null;

// One sheet, built for Power BI: every dataset is a named Excel Table
// (Ringkasan, Produksi_BC1TR, EntryLog_BC1TR, …, LineStop) that Power BI's
// Excel connector lists on its own. Every row carries Tanggal/Shift (+ Produk),
// numbers stay numbers (percentages as fractions with a % format), and
// per-product tables share one column layout so they append. Every table is
// 13 columns wide so their edges line up; no filter arrows (Excel-only UI).
export const SHEET_NAME = 'Laporan Shift';
const TOYOTA_RED = 'B91C1C';
const WHITE = 'FFFFFF';
const DARK = '1F2937';
const META_BG = 'FEF2F2';
const WIDTH = 13;
const CENTER: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };

const LINES: ProductLine[] = [1, 2, 3, 4];

function argb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

// Yellow (Camshaft) needs dark text; the other fills read with white.
function textOn(hex: string): string {
  return hex.replace('#', '').toLowerCase() === 'eab308' ? DARK : WHITE;
}

// Table names: letters/digits/underscore only ("BC 1TR" -> "BC1TR").
function tableKey(line: ProductLine): string {
  return PRODUCT_LINE_LABELS[line].replace(/\s/g, '');
}

// "YYYY-MM-DD" becomes a real date cell so Power BI types the column as Date.
function dateCell(date: string): Cell {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : (date || null);
}

function jamShift(state: ProductionState): string | null {
  return state.shiftTime === 'day' ? 'Day' : state.shiftTime === 'night' ? 'Night' : null;
}

function picName(state: ProductionState): string | null {
  return findPic(state.pic)?.name ?? (state.pic || null);
}

function rate(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

interface Column {
  name: string;
  numFmt?: string;
}

const PCT = '0.0%';
const DATE = 'yyyy-mm-dd';

function fill(cell: ExcelJS.Cell, hex: string): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } };
  cell.font = { bold: true, color: { argb: argb(textOn(hex)) } };
}

// A coloured, centred title bar above a block of tables (outside every table).
function titleBar(ws: ExcelJS.Worksheet, text: string, hex: string): void {
  const row = ws.addRow([text]);
  ws.mergeCells(row.number, 1, row.number, WIDTH);
  fill(row.getCell(1), hex);
  row.getCell(1).font = { bold: true, size: 13, color: { argb: argb(textOn(hex)) } };
  row.getCell(1).alignment = CENTER;
  row.height = 22;
}

// A named Excel Table at the next free row, header filled with `hex`, every
// cell centred. An empty dataset still gets one blank row: Excel rejects a
// header-only table, and the table name must exist every shift so a Power BI
// query never breaks.
function addTable(
  ws: ExcelJS.Worksheet, name: string, hex: string, columns: Column[], rows: Cell[][], blankRow: Cell[],
): void {
  const top = ws.lastRow ? ws.lastRow.number + 1 : 1;
  const data = rows.length > 0 ? rows : [blankRow];
  ws.addTable({
    name,
    ref: `A${top}`,
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: columns.map((c) => ({ name: c.name, filterButton: false })),
    rows: data,
  });
  const header = ws.getRow(top);
  header.height = 20;
  columns.forEach((c, i) => {
    fill(header.getCell(i + 1), hex);
    header.getCell(i + 1).alignment = CENTER;
    for (let r = 1; r <= data.length; r += 1) {
      const cell = ws.getRow(top + r).getCell(i + 1);
      cell.alignment = CENTER;
      if (c.numFmt) cell.numFmt = c.numFmt;
    }
  });
  ws.addRow([]);
}

// Label merged over A:F, value over G:M, both centred on a light band.
function addMeta(ws: ExcelJS.Worksheet, state: ProductionState): void {
  const meta: [string, Cell][] = [
    ['Tanggal', dateCell(state.date) ?? '—'],
    ['Shift', state.shift],
    ...(state.shiftTime === 'day' || state.shiftTime === 'night'
      ? [['Jam Shift', state.shiftTime === 'day' ? 'Day (07:00–19:00)' : 'Night (20:00–08:00)'] as [string, Cell]]
      : []),
    ['Operator', state.operator || '—'],
    ['PIC', picName(state) ?? '—'],
  ];
  for (const [label, value] of meta) {
    const row = ws.addRow([]);
    row.getCell(1).value = label;
    row.getCell(7).value = value;
    ws.mergeCells(row.number, 1, row.number, 6);
    ws.mergeCells(row.number, 7, row.number, WIDTH);
    for (const col of [1, 7]) {
      const cell = row.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(META_BG) } };
      cell.alignment = CENTER;
    }
    row.getCell(1).font = { bold: true };
    if (value instanceof Date) row.getCell(7).numFmt = DATE;
  }
  ws.addRow([]);
}

const SUMMARY_COLUMNS: Column[] = [
  { name: 'Tanggal', numFmt: DATE }, { name: 'Shift' }, { name: 'Jam Shift' }, { name: 'Produk' }, { name: 'Target' },
  { name: 'OK' }, { name: 'Repair' }, { name: 'NG' }, { name: 'Total' },
  { name: 'OK %', numFmt: PCT }, { name: 'Repair %', numFmt: PCT }, { name: 'NG %', numFmt: PCT },
  { name: 'Achievement %', numFmt: PCT },
];

function countsRow(state: ProductionState, label: string, scope: RateScope, target: number | null): Cell[] {
  const ok = getOkTotal(state, scope);
  const repair = getRepairTotal(state, scope);
  const ng = getNgTotal(state, scope);
  const total = getGrandTotal(state, scope);
  return [
    dateCell(state.date), state.shift, jamShift(state), label, target, ok, repair, ng, total,
    rate(ok, total), rate(repair, total), rate(ng, total), target ? rate(total, target) : null,
  ];
}

// Targets are set per group (BC 1TR + 2TR share one), so the summary is per group.
function summaryTable(ws: ExcelJS.Worksheet, state: ProductionState): void {
  titleBar(ws, 'Ringkasan per Produk', TOYOTA_RED);
  addTable(ws, 'Ringkasan', TOYOTA_RED, SUMMARY_COLUMNS, [
    countsRow(state, 'BC 1TR + BC 2TR', 'bc', state.targetBc || null),
    countsRow(state, 'Camshaft', 3, state.targetCam || null),
    countsRow(state, 'Crankshaft', 4, state.targetCrank || null),
  ], []);
}

// One row per logged NG/Repair entry — the full detail. Per-type totals are a
// simple Sum of Qty by Jenis in Power BI, so no separate tally table.
const ENTRY_COLUMNS: Column[] = [
  { name: 'Tanggal', numFmt: DATE }, { name: 'Shift' }, { name: 'Produk' },
  { name: 'Kategori' }, { name: 'Jenis' }, { name: 'Qty' }, { name: 'Lot' }, { name: 'Flask / Cavity' },
  { name: 'No. Die' }, { name: 'Die Mould' }, { name: 'Crank Case No.' }, { name: 'Slub/Wj No.' },
  { name: 'Front/Rear No.' },
];

function kindLabel(kind: EntryLog['kind']): string {
  return kind === 'defect' ? 'NG' : 'Repair';
}

function entryRows(state: ProductionState, line: ProductLine): Cell[][] {
  return state.entryLogs
    .filter((log) => log.line === line)
    .map((log) => {
      const od = log.overDimensi;
      return [
        dateCell(state.date), state.shift, PRODUCT_LINE_LABELS[line], kindLabel(log.kind), log.type, log.qty,
        log.lot, log.flask, log.die ?? null, od?.dieMould ?? null,
        od?.crankCaseNo ?? null, od?.slubWjNo ?? null, od?.position ?? null,
      ];
    });
}

function productBlock(ws: ExcelJS.Worksheet, state: ProductionState, line: ProductLine): void {
  const label = PRODUCT_LINE_LABELS[line];
  const key = tableKey(line);
  const color = PRODUCT_LINE_COLOR[line];
  const target = line === 3 ? state.targetCam || null : line === 4 ? state.targetCrank || null : null;

  titleBar(ws, label, color);
  addTable(ws, `Produksi_${key}`, color, SUMMARY_COLUMNS, [countsRow(state, label, line, target)], []);
  addTable(ws, `EntryLog_${key}`, color, ENTRY_COLUMNS, entryRows(state, line),
    [dateCell(state.date), state.shift, label, ...Array(WIDTH - 3).fill(null)]);
}

const CATEGORY_LABEL: Record<string, string> = { AV: 'Availability', PE: 'Performance', RQ: 'Quality' };

const LINE_STOP_COLUMNS: Column[] = [
  { name: 'Tanggal', numFmt: DATE }, { name: 'Shift' }, { name: 'Jam Shift' }, { name: 'Operator' }, { name: 'PIC' },
  { name: 'Jam' }, { name: 'Mulai' }, { name: 'Selesai' }, { name: 'Kode' }, { name: 'Kategori' },
  { name: 'Durasi (menit)' }, { name: 'Item Problem' }, { name: 'Countermeasure' },
];

// The hour bucket a stop starts in ("07:10" -> "07:00"), matching the Hourly keys.
function startHour(start: string): string | null {
  const minutes = toMinutes(start);
  return minutes === null ? null : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`;
}

function lineStopTable(ws: ExcelJS.Worksheet, state: ProductionState): void {
  const prefix: Cell[] = [dateCell(state.date), state.shift, jamShift(state), state.operator || null, picName(state)];
  const rows: Cell[][] = (state.lineStops ?? []).map((stop) => [
    ...prefix, startHour(stop.start), stop.start, stop.end, stop.category, CATEGORY_LABEL[stop.category] ?? stop.category,
    lineStopMinutes(stop.start, stop.end), stop.problem, stop.countermeasure || null,
  ]);
  titleBar(ws, 'Line Stop', TOYOTA_RED);
  addTable(ws, 'LineStop', TOYOTA_RED, LINE_STOP_COLUMNS, rows, [...prefix, ...Array(WIDTH - prefix.length).fill(null)]);
}

export function buildShiftWorkbook(state: ProductionState): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QC Gate';
  const ws = workbook.addWorksheet(SHEET_NAME, { views: [{ showGridLines: false }] });

  titleBar(ws, 'Laporan Shift — QC Gate Production', TOYOTA_RED);
  ws.getRow(1).getCell(1).font = { bold: true, size: 16, color: { argb: argb(WHITE) } };
  ws.getRow(1).height = 28;
  ws.addRow([]);
  addMeta(ws, state);
  summaryTable(ws, state);
  for (const line of LINES) productBlock(ws, state, line);
  lineStopTable(ws, state);

  ws.columns = [12, 12, 13, 16, 24, 10, 12, 14, 10, 15, 15, 26, 26].map((width) => ({ width }));
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
