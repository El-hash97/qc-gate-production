import { sql } from './db';
import { DEFECT_LINE_NAMES, type DefectLineName, type DefectLineMapping } from './types';

export function isDefectLineName(value: string): value is DefectLineName {
  return (DEFECT_LINE_NAMES as readonly string[]).includes(value);
}

export async function listDefectLines(): Promise<DefectLineMapping[]> {
  const rows = (await sql`
    SELECT id, line, defect_name FROM defect_lines ORDER BY line, defect_name
  `) as { id: number; line: string; defect_name: string }[];
  return rows.map((row) => ({ id: row.id, line: row.line as DefectLineName, defectName: row.defect_name }));
}

export async function addDefectLine(line: DefectLineName, defectName: string): Promise<void> {
  const trimmed = defectName.trim();
  if (!trimmed) {
    throw new Error('Nama defect wajib diisi');
  }
  await sql`INSERT INTO defect_lines (line, defect_name) VALUES (${line}, ${trimmed})`;
}

export async function deleteDefectLine(id: number): Promise<void> {
  await sql`DELETE FROM defect_lines WHERE id = ${id}`;
}
