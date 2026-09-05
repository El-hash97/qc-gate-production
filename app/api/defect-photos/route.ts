import { NextResponse } from 'next/server';
import { listDefectPhotoFlags } from '@/lib/defectPhotos';

// Reads change on every upload/delete — without this, a plain GET with no
// dynamic request APIs can get cached (confirmed: default fetch() served a
// stale empty list right after an upload; cache:'no-store' didn't).
export const dynamic = 'force-dynamic';

// Lightweight list (no image bytes) — safe to poll alongside /api/state so the
// dashboard knows which of the 6 slots have a photo without downloading them.
export async function GET() {
  try {
    const data = await listDefectPhotoFlags();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
