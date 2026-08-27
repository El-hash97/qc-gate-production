import * as XLSX from 'xlsx';
import type { ProductionState } from '@/lib/types';

export function buildShiftWorkbook(state: ProductionState) {
  const prodData = [
    { Produk: 'BC 1TR', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok1, Repair: state.repair1, NG: state.ng1 },
    { Produk: 'BC 2TR', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok2, Repair: state.repair2, NG: state.ng2 },
    { Produk: 'Camshaft', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok3 ?? 0, Repair: state.repair3 ?? 0, NG: state.ng3 ?? 0 },
    { Produk: 'Crankshaft', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date, OK: state.ok4 ?? 0, Repair: state.repair4 ?? 0, NG: state.ng4 ?? 0 },
    {
      Produk: 'TOTAL', Operator: state.operator || 'N/A', Shift: state.shift, Tanggal: state.date,
      OK: state.ok1 + state.ok2 + (state.ok3 ?? 0) + (state.ok4 ?? 0),
      Repair: state.repair1 + state.repair2 + (state.repair3 ?? 0) + (state.repair4 ?? 0),
      NG: state.ng1 + state.ng2 + (state.ng3 ?? 0) + (state.ng4 ?? 0),
    },
  ];

  const defectDetail = Object.entries(state.defectData).sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ 'Jenis Defect': name, Jumlah: count }));

  const repairDetail = Object.entries(state.repairData).sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ 'Jenis Repair': name, Jumlah: count }));

  const hourlyDetail = Object.keys(state.hourlyData).sort()
    .map((key) => ({ Jam: key, OK: state.hourlyData[key].ok, Repair: state.hourlyData[key].repair, NG: state.hourlyData[key].ng }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(prodData), 'Production');
  if (defectDetail.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(defectDetail), 'Defect');
  if (repairDetail.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(repairDetail), 'Repair');
  if (hourlyDetail.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hourlyDetail), 'Hourly');

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
