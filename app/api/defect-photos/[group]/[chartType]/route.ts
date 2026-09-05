import { NextRequest, NextResponse } from 'next/server';
import {
  getDefectPhoto, saveDefectPhoto, deleteDefectPhoto,
  isPhotoGroup, isPhotoChartType,
} from '@/lib/defectPhotos';

// See app/api/defect-photos/route.ts — same stale-GET caching issue applies here.
export const dynamic = 'force-dynamic';

function parseParams(group: string, chartType: string) {
  if (!isPhotoGroup(group) || !isPhotoChartType(chartType)) return null;
  return { group, chartType };
}

function getDefectType(request: NextRequest, bodyDefectType?: string): string | null {
  const fromQuery = request.nextUrl.searchParams.get('defect');
  const raw = (fromQuery ?? bodyDefectType ?? '').trim();
  // Legacy call without defect param -> treat as invalid for per-bar model.
  // We require defectType for every photo slot now.
  if (!raw) return null;
  return raw;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { group: string; chartType: string } },
) {
  const parsed = parseParams(params.group, params.chartType);
  if (!parsed) return NextResponse.json({ success: false, error: 'Slot tidak valid' }, { status: 400 });
  const defectType = getDefectType(request);
  if (!defectType) return NextResponse.json({ success: false, error: 'defect wajib diisi' }, { status: 400 });
  try {
    const data = await getDefectPhoto(parsed.group, parsed.chartType, defectType);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { group: string; chartType: string } },
) {
  const parsed = parseParams(params.group, params.chartType);
  if (!parsed) return NextResponse.json({ success: false, error: 'Slot tidak valid' }, { status: 400 });
  try {
    const body = await request.json();
    const imageData = typeof body?.imageData === 'string' ? body.imageData : '';
    const defectType = getDefectType(request, typeof body?.defectType === 'string' ? body.defectType : undefined);
    if (!imageData) return NextResponse.json({ success: false, error: 'imageData wajib diisi' }, { status: 400 });
    if (!defectType) return NextResponse.json({ success: false, error: 'defect wajib diisi' }, { status: 400 });
    await saveDefectPhoto(parsed.group, parsed.chartType, defectType, imageData);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { group: string; chartType: string } },
) {
  const parsed = parseParams(params.group, params.chartType);
  if (!parsed) return NextResponse.json({ success: false, error: 'Slot tidak valid' }, { status: 400 });
  const defectType = getDefectType(request);
  if (!defectType) return NextResponse.json({ success: false, error: 'defect wajib diisi' }, { status: 400 });
  try {
    await deleteDefectPhoto(parsed.group, parsed.chartType, defectType);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
