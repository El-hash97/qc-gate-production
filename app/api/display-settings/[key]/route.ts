import { NextRequest, NextResponse } from 'next/server';
import { getDisplaySettings, isDisplayKey, saveDisplaySettings } from '@/lib/displaySettings';

// Polled by every screen showing the page, so it must never be cached.
export const dynamic = 'force-dynamic';
// The Neon driver talks over fetch(); Next caches fetch calls made from a
// non-POST handler (the PUT's INSERT was answered from cache, never run).
export const fetchCache = 'force-no-store';

export async function GET(_request: NextRequest, { params }: { params: { key: string } }) {
  if (!isDisplayKey(params.key)) {
    return NextResponse.json({ success: false, error: 'Unknown settings key' }, { status: 404 });
  }
  try {
    return NextResponse.json({ success: true, data: await getDisplaySettings(params.key) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { key: string } }) {
  if (!isDisplayKey(params.key)) {
    return NextResponse.json({ success: false, error: 'Unknown settings key' }, { status: 404 });
  }
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: await saveDisplaySettings(params.key, body) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
