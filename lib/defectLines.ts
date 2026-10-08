import { sql } from './db';
import { DEFECT_LINE_NAMES, DEFECT_PRODUCTS, type DefectLineName, type DefectLineMapping, type DefectProduct } from './types';

export function isDefectLineName(value: string): value is DefectLineName {
  return (DEFECT_LINE_NAMES as readonly string[]).includes(value);
}

export function isDefectProduct(value: string): value is DefectProduct {
  return (DEFECT_PRODUCTS.map((p) => p.value) as string[]).includes(value);
}

export async function listDefectLines(): Promise<DefectLineMapping[]> {
  const rows = (await sql`
    SELECT id, product, line, defect_name FROM defect_lines ORDER BY product, line, defect_name
  `) as { id: number; product: string | null; line: string; defect_name: string }[];
  return rows.map((row) => ({
    id: row.id,
    // Rows written before the product column existed have NULL — they are
    // the original BC seed data, so they read as 'bc'.
    product: isDefectProduct(row.product ?? '') ? (row.product as DefectProduct) : 'bc',
    line: row.line as DefectLineName,
    defectName: row.defect_name,
  }));
}

export async function addDefectLine(line: DefectLineName, defectName: string, product: DefectProduct): Promise<void> {
  const trimmed = defectName.trim();
  if (!trimmed) {
    throw new Error('Nama defect wajib diisi');
  }
  await sql`INSERT INTO defect_lines (product, line, defect_name) VALUES (${product}, ${line}, ${trimmed})`;
}

export async function deleteDefectLine(id: number): Promise<void> {
  await sql`DELETE FROM defect_lines WHERE id = ${id}`;
}
