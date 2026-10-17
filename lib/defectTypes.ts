import { sql } from './db';
import { isDefectProduct } from './defectLines';
import { builtinTypes } from '@/utils/constants';
import { canonicalType, typeKey } from '@/utils/typeName';
import type { CustomDefectType, DefectProduct, DefectTypeKind } from './types';

export function isDefectTypeKind(value: string): value is DefectTypeKind {
  return value === 'defect' || value === 'repair';
}

export async function listDefectTypes(): Promise<CustomDefectType[]> {
  const rows = (await sql`
    SELECT id, product, kind, name FROM defect_types ORDER BY product, kind, id
  `) as { id: number; product: string; kind: string; name: string }[];
  return rows
    .filter((row) => isDefectProduct(row.product) && isDefectTypeKind(row.kind))
    .map((row) => ({ id: row.id, product: row.product as DefectProduct, kind: row.kind as DefectTypeKind, name: row.name }));
}

// Rejects a name that already exists in that list — built-in or added —
// ignoring case/spacing, so "yuzakai cope" can't sit next to "Yuzakai Cope".
export async function addDefectType(product: DefectProduct, kind: DefectTypeKind, name: string): Promise<void> {
  const tidy = canonicalType(name, []);
  if (!tidy) throw new Error('Nama jenis wajib diisi');
  const existing = await listDefectTypes();
  const taken = [...builtinTypes(product, kind), ...existing.filter((t) => t.product === product && t.kind === kind).map((t) => t.name)];
  if (taken.some((t) => typeKey(t) === typeKey(tidy))) {
    throw new Error(`"${tidy}" sudah ada di daftar ini`);
  }
  await sql`INSERT INTO defect_types (product, kind, name) VALUES (${product}, ${kind}, ${tidy})`;
}

export async function deleteDefectType(id: number): Promise<void> {
  await sql`DELETE FROM defect_types WHERE id = ${id}`;
}
