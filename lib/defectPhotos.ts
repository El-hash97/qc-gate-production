import { sql } from './db';

// Mirrors the dashboard's product-group toggle ('all' has no slot of its own).
export const PHOTO_GROUPS = ['bc', 'camshaft', 'crankshaft'] as const;
export const PHOTO_CHART_TYPES = ['ng', 'repair'] as const;
export type PhotoGroup = (typeof PHOTO_GROUPS)[number];
export type PhotoChartType = (typeof PHOTO_CHART_TYPES)[number];

export interface DefectPhotoFlag {
  group: PhotoGroup;
  chartType: PhotoChartType;
  updatedAt: string;
}

export interface DefectPhoto extends DefectPhotoFlag {
  imageData: string;
}

// Defense in depth: the client compresses images before upload, but a request
// bypassing the client (curl, a stale build) shouldn't be able to wedge a
// multi-MB blob into the row. ~6.7M base64 chars ≈ 5MB decoded.
const MAX_IMAGE_DATA_LENGTH = 6_700_000;

export function isPhotoGroup(value: string): value is PhotoGroup {
  return (PHOTO_GROUPS as readonly string[]).includes(value);
}

export function isPhotoChartType(value: string): value is PhotoChartType {
  return (PHOTO_CHART_TYPES as readonly string[]).includes(value);
}

// Lightweight — no image_data — safe for the dashboard's polled state so it
// can show "has photo" without re-downloading every photo on every poll.
export async function listDefectPhotoFlags(): Promise<DefectPhotoFlag[]> {
  const rows = await sql`SELECT group_key, chart_type, updated_at FROM defect_photos`;
  return (rows as any[]).map((row) => ({
    group: row.group_key,
    chartType: row.chart_type,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function getDefectPhoto(group: PhotoGroup, chartType: PhotoChartType): Promise<DefectPhoto | null> {
  const rows = await sql`
    SELECT group_key, chart_type, image_data, updated_at FROM defect_photos
    WHERE group_key = ${group} AND chart_type = ${chartType}
  `;
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    group: row.group_key,
    chartType: row.chart_type,
    imageData: row.image_data,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function saveDefectPhoto(
  group: PhotoGroup,
  chartType: PhotoChartType,
  imageData: string,
): Promise<void> {
  if (!imageData.startsWith('data:image/')) {
    throw new Error('imageData harus berupa data URL gambar');
  }
  if (imageData.length > MAX_IMAGE_DATA_LENGTH) {
    throw new Error('Ukuran foto terlalu besar');
  }
  await sql`
    INSERT INTO defect_photos (group_key, chart_type, image_data, updated_at)
    VALUES (${group}, ${chartType}, ${imageData}, now())
    ON CONFLICT (group_key, chart_type)
    DO UPDATE SET image_data = ${imageData}, updated_at = now()
  `;
}

export async function deleteDefectPhoto(group: PhotoGroup, chartType: PhotoChartType): Promise<void> {
  await sql`DELETE FROM defect_photos WHERE group_key = ${group} AND chart_type = ${chartType}`;
}

// Used by resetProductionState() — photos are live-only, wiped on every reset.
export async function deleteAllDefectPhotos(): Promise<void> {
  await sql`DELETE FROM defect_photos`;
}
