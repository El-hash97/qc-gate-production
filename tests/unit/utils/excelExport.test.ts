import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildShiftWorkbook, buildShiftFileName, SHEET_NAME } from '@/utils/excelExport';
import type { ProductionState } from '@/lib/types';

const state: ProductionState = {
  date: '2026-08-05', shift: 'Shift Red', shiftTime: 'day', operator: 'Budi', pic: 'suryo', target: 300,
  targetBc: 200, targetCam: 60, targetCrank: 40,
  ok1: 100, repair1: 5, ng1: 3, ok2: 80, repair2: 4, ng2: 2,
  ok3: 40, repair3: 2, ng3: 1, ok4: 20, repair4: 1, ng4: 0,
  defectData: { 'Gas Hole Cope': 5 }, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  hourlyDataBc1: { '07:00': { ok: 50, repair: 2, ng: 1 } },
  entryLogs: [
    { kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole Cope', qty: 3, lot: 'L1', flask: '1' },
    { kind: 'defect', group: 'bc', line: 1, type: 'Dross', qty: 1, lot: 'L1', flask: '2' },
    { kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole Cope', qty: 2, lot: 'L4', flask: '3',
      overDimensi: { dieMould: 4, crankCaseNo: '1', slubWjNo: '2', position: '3' } },
    { kind: 'repair', group: 'bc', line: 1, type: 'Mejashi Bore 1', qty: 5, lot: 'L1', flask: '4', die: 2 },
    { kind: 'defect', group: 'bc', line: 2, type: 'Dross', qty: 2, lot: 'L2', flask: '2' },
    { kind: 'defect', group: 'shaft', line: 3, type: 'Dross', qty: 1, lot: 'L3', flask: '1-1' },
  ],
  lineStops: [{ start: '07:10', end: '07:40', problem: 'Ganti tooling', category: 'AV', countermeasure: 'Stok tool' }],
  savedAt: '',
};

const DATE = new Date(Date.UTC(2026, 7, 5));

type TableModel = { name: string; ref?: string; tableRef?: string; rows: unknown[][]; columns: { name: string; filterButton?: boolean }[] };

function model(workbook: ExcelJS.Workbook, name: string): TableModel {
  const table = workbook.getWorksheet(SHEET_NAME)!.getTable(name);
  expect(table).toBeDefined();
  return (table as unknown as { table: TableModel }).table;
}

describe('buildShiftWorkbook', () => {
  it('puts everything on a single sheet', () => {
    const workbook = buildShiftWorkbook(state);
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([SHEET_NAME]);
  });

  it('creates a named table per dataset, with per-product tables for each line', () => {
    const ws = buildShiftWorkbook(state).getWorksheet(SHEET_NAME)!;
    const names = ws.getTables().map((t) => (t as unknown as { table: TableModel }).table.name);
    expect(names).toEqual([
      'Ringkasan',
      'Produksi_BC1TR', 'EntryLog_BC1TR',
      'Produksi_BC2TR', 'EntryLog_BC2TR',
      'Produksi_Camshaft', 'EntryLog_Camshaft',
      'Produksi_Crankshaft', 'EntryLog_Crankshaft',
      'LineStop',
    ]);
  });

  it('summarises per target group with real numbers and fractional percentages', () => {
    const rows = model(buildShiftWorkbook(state), 'Ringkasan').rows;
    expect(rows[0]).toEqual([DATE, 'Shift Red', 'Day', 'BC 1TR + BC 2TR', 200, 180, 9, 5, 194, 180 / 194, 9 / 194, 5 / 194, 194 / 200]);
    expect(rows.map((r) => r[3])).toEqual(['BC 1TR + BC 2TR', 'Camshaft', 'Crankshaft']);
  });

  it('gives every Produksi table the same columns so Power BI can append them', () => {
    const workbook = buildShiftWorkbook(state);
    const bc1 = model(workbook, 'Produksi_BC1TR');
    expect(model(workbook, 'Produksi_Crankshaft').columns.map((c) => c.name)).toEqual(bc1.columns.map((c) => c.name));
    expect(bc1.rows[0].slice(3, 9)).toEqual(['BC 1TR', null, 100, 5, 3, 108]);
    expect(model(workbook, 'Produksi_Camshaft').rows[0][4]).toBe(60);
  });

  it('lists each entry with die and Over Dimensi detail in its own columns', () => {
    const rows = model(buildShiftWorkbook(state), 'EntryLog_BC1TR').rows;
    expect(rows).toHaveLength(4);
    expect(rows[2].slice(3)).toEqual(['NG', 'Gas Hole Cope', 2, 'L4', '3', null, 4, '1', '2', '3']);
    expect(rows[3].slice(3, 10)).toEqual(['Repair', 'Mejashi Bore 1', 5, 'L1', '4', 2, null]);
  });

  it('gives an empty dataset one blank row so the table still exists', () => {
    const rows = model(buildShiftWorkbook(state), 'EntryLog_Crankshaft').rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].slice(0, 4)).toEqual([DATE, 'Shift Red', 'Crankshaft', null]);
  });

  it('writes line stops with its hour bucket, category code and duration in minutes', () => {
    const rows = model(buildShiftWorkbook(state), 'LineStop').rows;
    expect(rows[0]).toEqual([
      DATE, 'Shift Red', 'Day', 'Budi', 'SURYO HADI WIHARJO',
      '07:00', '07:10', '07:40', 'AV', 'Availability', 30, 'Ganti tooling', 'Stok tool',
    ]);
  });

  it('fills each product table header with that product colour', () => {
    const workbook = buildShiftWorkbook(state);
    const ws = workbook.getWorksheet(SHEET_NAME)!;
    const t = model(workbook, 'Produksi_BC2TR');
    const top = Number((t.tableRef ?? t.ref)!.match(/\d+/)![0]);
    const fill = ws.getRow(top).getCell(1).fill as ExcelJS.FillPattern;
    expect(fill.fgColor?.argb).toBe('FF3B82F6');
  });

  it('makes every table 13 columns wide with no filter arrows and centred header + body', () => {
    const workbook = buildShiftWorkbook(state);
    const ws = workbook.getWorksheet(SHEET_NAME)!;
    for (const t of ws.getTables()) {
      const m = (t as unknown as { table: TableModel }).table;
      expect(m.columns).toHaveLength(13);
      expect(m.columns.every((c) => !c.filterButton)).toBe(true);
    }
    const t = model(workbook, 'EntryLog_BC1TR');
    const top = Number((t.tableRef ?? t.ref)!.match(/\d+/)![0]);
    expect(ws.getRow(top).getCell(5).alignment?.horizontal).toBe('center');
    expect(ws.getRow(top + 1).getCell(5).alignment?.horizontal).toBe('center');
  });

  it('round-trips through a real .xlsx file with its tables intact', async () => {
    const buffer = await buildShiftWorkbook(state).xlsx.writeBuffer();
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer as ArrayBuffer);
    expect(loaded.getWorksheet(SHEET_NAME)!.getTables()).toHaveLength(10);
  });
});

describe('buildShiftFileName', () => {
  it('replaces spaces in the shift name with underscores', () => {
    expect(buildShiftFileName(state)).toMatch(/^QC_Gate_Shift_Red_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
