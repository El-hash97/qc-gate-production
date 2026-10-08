import { describe, it, expect } from 'vitest';
import type ExcelJS from 'exceljs';
import { buildShiftWorkbook, buildShiftFileName } from '@/utils/excelExport';
import type { ProductionState } from '@/lib/types';

const state: ProductionState = {
  date: '5 Agustus 2026', shift: 'Shift Red', shiftTime: 'day', operator: 'Budi', pic: 'suryo', target: 300,
  targetBc: 200, targetCam: 60, targetCrank: 40,
  ok1: 100, repair1: 5, ng1: 3, ok2: 80, repair2: 4, ng2: 2,
  ok3: 40, repair3: 2, ng3: 1, ok4: 20, repair4: 1, ng4: 0,
  defectData: { 'Gas Hole Cope': 5 }, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  hourlyDataBc1: { '07:00': { ok: 50, repair: 2, ng: 1 } },
  hourlyDataBc2: { '07:00': { ok: 40, repair: 1, ng: 1 } },
  hourlyDataCam: { '23:00': { ok: 20, repair: 1, ng: 0 }, '20:00': { ok: 20, repair: 1, ng: 1 } },
  hourlyDataCrank: {},
  hourlyTargetCam: { '20:00': 25, '23:00': 25 },
  entryLogs: [
    { kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole Cope', qty: 3, lot: 'L1', flask: 'F1' },
    { kind: 'defect', group: 'bc', line: 2, type: 'Dross', qty: 2, lot: 'L2', flask: 'F2' },
    { kind: 'defect', group: 'shaft', line: 3, type: 'Dross', qty: 1, lot: 'L3', flask: 'C1' },
    { kind: 'repair', group: 'bc', line: 1, type: 'Finishing', qty: 5, lot: 'L1', flask: 'F1' },
  ],
  lineStops: [{ start: '07:10', end: '07:20', problem: 'Ganti tooling', category: 'AV', countermeasure: 'Stok tool' }],
  savedAt: '',
};

function sheetOf(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = workbook.getWorksheet(name);
  expect(ws).toBeDefined();
  return ws!;
}

function findRow(ws: ExcelJS.Worksheet, firstCell: string): ExcelJS.Row {
  let found: ExcelJS.Row | undefined;
  ws.eachRow((row) => {
    if (row.getCell(1).value === firstCell) found = row;
  });
  expect(found).toBeDefined();
  return found!;
}

function values(row: ExcelJS.Row): unknown[] {
  const out: unknown[] = [];
  row.eachCell({ includeEmpty: true }, (cell) => { out.push(cell.value); });
  return out;
}

describe('buildShiftWorkbook sheets', () => {
  it('creates one sheet per product plus summary, line stop, and entry log', () => {
    const workbook = buildShiftWorkbook(state);
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      'Ringkasan', 'BC 1TR', 'BC 2TR', 'Camshaft', 'Crankshaft', 'Line Stop', 'Entry Log',
    ]);
  });

  it('centers every cell and bolds the headline', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'Ringkasan');
    expect(ws.getRow(1).font).toMatchObject({ bold: true });
    ws.eachRow((row) => row.eachCell((cell) => {
      expect(cell.alignment).toMatchObject({ horizontal: 'center', vertical: 'middle' });
    }));
  });

  it('Ringkasan opens with a headline and ends with a correct TOTAL row', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'Ringkasan');
    expect(ws.getCell('A1').value).toBe('Ringkasan Shift');
    const total = values(ws.getRow(ws.rowCount));
    // OK 240 + Repair 12 + NG 6 = 258 against target 300.
    expect(total[0]).toBe('TOTAL');
    expect(total.slice(2, 6)).toEqual([240, 12, 6, 258]);
  });

  it('each product sheet opens with its own headline and production counters', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'BC 1TR');
    expect(String(ws.getCell('A1').value)).toContain('BC 1TR');
    const produksi = findRow(ws, 'Produksi');
    expect(values(ws.getRow(produksi.number + 2))).toEqual([100, 5, 3, 108, '93%', '5%', '3%']);
  });

  it('Camshaft shows its target, actual, and achievement', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'Camshaft');
    const target = findRow(ws, 'Target');
    // 43 pcs against target 60 = 72%.
    expect(values(ws.getRow(target.number + 1))).toEqual([60, 43, '72%']);
  });

  it('attributes defects per line from the entry logs, sorted biggest first', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'BC 1TR');
    const defect = findRow(ws, 'Defect (NG)');
    expect(values(ws.getRow(defect.number + 2))).toEqual(['Gas Hole Cope', 3]);
    // The line-2 Dross must not leak into BC 1TR.
    let body = '';
    ws.eachRow((row) => { body += `${row.getCell(1).value ?? ''} `; });
    expect(body).not.toContain('Dross');
  });

  it('lists hourly rows in production order with a target column when known', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'Camshaft');
    const hourly = findRow(ws, 'Hourly');
    expect(values(ws.getRow(hourly.number + 1))).toEqual(['Jam', 'OK', 'Repair', 'NG', 'Total', 'Target']);
    expect(values(ws.getRow(hourly.number + 2))).toEqual(['20:00', 20, 1, 1, 22, 25]);
    expect(values(ws.getRow(hourly.number + 3))).toEqual(['23:00', 20, 1, 0, 21, 25]);
  });

  it('Line Stop sheet spells out the category and countermeasure', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'Line Stop');
    expect(values(ws.getRow(ws.rowCount))).toEqual(['07:10', '07:20', 'AV (Availability)', 'Ganti tooling', 'Stok tool']);
  });

  it('Entry Log sheet lists every log with its product', () => {
    const ws = sheetOf(buildShiftWorkbook(state), 'Entry Log');
    let body = '';
    ws.eachRow((row) => { body += `${values(row).join('|')}\n`; });
    expect(body).toContain('Defect (NG)|BC 1TR|Gas Hole Cope|3|L1|F1');
    expect(body).toContain('Repair|BC 1TR|Finishing|5|L1|F1');
  });

  it('still creates every sheet with a placeholder when the shift is empty', () => {
    const empty: ProductionState = {
      ...state, targetBc: 0, targetCam: 0, targetCrank: 0,
      ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
      ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
      defectData: {}, hourlyDataBc1: {}, hourlyDataBc2: {},
      hourlyDataCam: {}, hourlyDataCrank: {}, entryLogs: [], lineStops: [],
    };
    const workbook = buildShiftWorkbook(empty);
    expect(workbook.worksheets).toHaveLength(7);
    const ws = sheetOf(workbook, 'BC 2TR');
    let body = '';
    ws.eachRow((row) => { body += `${row.getCell(1).value ?? ''} `; });
    expect(body).toContain('(Belum ada data)');
  });
});

describe('buildShiftFileName', () => {
  it('replaces spaces in the shift name with underscores', () => {
    expect(buildShiftFileName(state)).toMatch(/^QC_Gate_Shift_Red_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
