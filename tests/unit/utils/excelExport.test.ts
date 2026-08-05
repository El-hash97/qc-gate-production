import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildShiftWorkbook, buildShiftFileName } from '@/utils/excelExport';
import type { ProductionState } from '@/lib/types';

const state: ProductionState = {
  date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 10, repair1: 1, ng1: 0, ok2: 5, repair2: 0, ng2: 1,
  defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: { '07:00': { ok: 15, repair: 1, ng: 1 } },
  savedAt: '',
};

describe('buildShiftWorkbook', () => {
  it('always includes a Production sheet with OK/Repair/NG per product plus a total row', () => {
    const workbook = buildShiftWorkbook(state);
    expect(workbook.SheetNames).toContain('Production');
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Production']) as any[];
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ Produk: 'TOTAL', OK: 15, Repair: 1, NG: 1 });
  });

  it('only includes a Defect sheet when there is defect data', () => {
    expect(buildShiftWorkbook(state).SheetNames).toContain('Defect');
    expect(buildShiftWorkbook({ ...state, defectData: {} }).SheetNames).not.toContain('Defect');
  });

  it('only includes an Hourly sheet when there is hourly data', () => {
    expect(buildShiftWorkbook(state).SheetNames).toContain('Hourly');
    expect(buildShiftWorkbook({ ...state, hourlyData: {} }).SheetNames).not.toContain('Hourly');
  });
});

describe('buildShiftFileName', () => {
  it('replaces spaces in the shift name with underscores', () => {
    expect(buildShiftFileName(state)).toMatch(/^QC_Gate_Shift_Red_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
