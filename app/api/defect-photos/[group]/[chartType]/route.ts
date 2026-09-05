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

export async function GET(
  _request: NextRequest,
  { params }: { params: { group: string; chartType: string } },
) {
  const parsed = parseParams(params.group, params.chartType);
  if (!parsed) return NextResponse.json({ success: false, error: 'Slot tidak valid' }, { status: 400 });
  try {
    const data = await getDefectPhoto(parsed.group, parsed.chartType);
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
    if (!imageData) return NextResponse.json({ success: false, error: 'imageData wajib diisi' }, { status: 400 });
    await saveDefectPhoto(parsed.group, parsed.chartType, imageData);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { group: string; chartType: string } },
) {
  const parsed = parseParams(params.group, params.chartType);
  if (!parsed) return NextResponse.json({ success: false, error: 'Slot tidak valid' }, { status: 400 });
  try {
    await deleteDefectPhoto(parsed.group, parsed.chartType);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
