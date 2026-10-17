import { NextRequest, NextResponse } from 'next/server';
import { isDefectProduct } from '@/lib/defectLines';
import { addDefectType, isDefectTypeKind, listDefectTypes } from '@/lib/defectTypes';

// Edited rarely from Master Data, but force-dynamic so the Input picker sees
// a new type right after it is added (same as every other data route here).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await listDefectTypes() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = typeof body?.product === 'string' ? body.product : '';
    const kind = typeof body?.kind === 'string' ? body.kind : '';
    const name = typeof body?.name === 'string' ? body.name : '';
    if (!isDefectProduct(product)) {
      return NextResponse.json({ success: false, error: 'Produk tidak valid' }, { status: 400 });
    }
    if (!isDefectTypeKind(kind)) {
      return NextResponse.json({ success: false, error: 'Kategori tidak valid' }, { status: 400 });
    }
    if (!name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama jenis wajib diisi' }, { status: 400 });
    }
    await addDefectType(product, kind, name);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
