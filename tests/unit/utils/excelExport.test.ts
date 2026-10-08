import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
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

function rowsOf(workbook: XLSX.WorkBook, name: string): (string | number)[][] {
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) as (string | number)[][];
}

describe('buildShiftWorkbook sheets', () => {
  it('creates one sheet per product plus summary, line stop, and entry log', () => {
    const workbook = buildShiftWorkbook(state);
    expect(workbook.SheetNames).toEqual([
      'Ringkasan', 'BC 1TR', 'BC 2TR', 'Camshaft', 'Crankshaft', 'Line Stop', 'Entry Log',
    ]);
  });

  it('Ringkasan opens with a headline and ends with a correct TOTAL row', () => {
    const rows = rowsOf(buildShiftWorkbook(state), 'Ringkasan');
    expect(rows[0][0]).toBe('Ringkasan Shift');
    const total = rows[rows.length - 1];
    // OK 240 + Repair 12 + NG 6 = 258 against target 300.
    expect(total[0]).toBe('TOTAL');
    expect(total.slice(2, 6)).toEqual([240, 12, 6, 258]);
  });

  it('each product sheet opens with its own headline and production counters', () => {
    const workbook = buildShiftWorkbook(state);
    const bc1 = rowsOf(workbook, 'BC 1TR');
    expect(bc1[0][0]).toContain('BC 1TR');
    const produksiIdx = bc1.findIndex((r) => r[0] === 'Produksi');
    expect(bc1[produksiIdx + 2]).toEqual([100, 5, 3, 108, '93%', '5%', '3%']);
  });

  it('Camshaft shows its target, actual, and achievement', () => {
    const rows = rowsOf(buildShiftWorkbook(state), 'Camshaft');
    const targetIdx = rows.findIndex((r) => r[0] === 'Target');
    // 43 pcs against target 60 = 72%.
    expect(rows[targetIdx + 1]).toEqual([60, 43, '72%']);
  });

  it('attributes defects per line from the entry logs, sorted biggest first', () => {
    const rows = rowsOf(buildShiftWorkbook(state), 'BC 1TR');
    const defectIdx = rows.findIndex((r) => r[0] === 'Defect (NG)');
    expect(rows[defectIdx + 2]).toEqual(['Gas Hole Cope', 3]);
    // The line-2 Dross must not leak into BC 1TR.
    const body = rows.flat().join(' ');
    expect(body).not.toContain('Dross');
  });

  it('lists hourly rows in production order with a target column when known', () => {
    const rows = rowsOf(buildShiftWorkbook(state), 'Camshaft');
    const hourlyIdx = rows.findIndex((r) => r[0] === 'Hourly');
    expect(rows[hourlyIdx + 1]).toEqual(['Jam', 'OK', 'Repair', 'NG', 'Total', 'Target']);
    expect(rows[hourlyIdx + 2]).toEqual(['20:00', 20, 1, 1, 22, 25]);
    expect(rows[hourlyIdx + 3]).toEqual(['23:00', 20, 1, 0, 21, 25]);
  });

  it('Line Stop sheet spells out the category and countermeasure', () => {
    const rows = rowsOf(buildShiftWorkbook(state), 'Line Stop');
    expect(rows[rows.length - 1]).toEqual(['07:10', '07:20', 'AV (Availability)', 'Ganti tooling', 'Stok tool']);
  });

  it('Entry Log sheet lists every log with its product', () => {
    const rows = rowsOf(buildShiftWorkbook(state), 'Entry Log');
    const body = rows.map((r) => r.join('|')).join('\n');
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
    expect(workbook.SheetNames).toHaveLength(7);
    const body = rowsOf(workbook, 'BC 2TR').flat().join(' ');
    expect(body).toContain('(Belum ada data)');
  });
});

describe('buildShiftFileName', () => {
  it('replaces spaces in the shift name with underscores', () => {
    expect(buildShiftFileName(state)).toMatch(/^QC_Gate_Shift_Red_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
