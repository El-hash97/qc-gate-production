import { NextRequest, NextResponse } from 'next/server';
import { listDefectLines, addDefectLine, isDefectLineName } from '@/lib/defectLines';

// Reference data edited rarely by hand — no polling concern like
// defect-photos has, but force-dynamic keeps a plain GET from being cached
// right after an edit, matching every other data route in this app.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await listDefectLines();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const line = typeof body?.line === 'string' ? body.line : '';
    const defectName = typeof body?.defectName === 'string' ? body.defectName : '';
    if (!isDefectLineName(line)) {
      return NextResponse.json({ success: false, error: 'Line tidak valid' }, { status: 400 });
    }
    if (!defectName.trim()) {
      return NextResponse.json({ success: false, error: 'Nama defect wajib diisi' }, { status: 400 });
    }
    await addDefectLine(line, defectName);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
