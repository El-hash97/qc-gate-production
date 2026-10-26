import { NextRequest, NextResponse } from 'next/server';
import { getProductionState } from '@/lib/productionState';
import { listDefectPhotoFlags } from '@/lib/defectPhotos';
import { getDisplaySettings } from '@/lib/displaySettings';
import { getBlockCounter } from '@/lib/blockCounter';
import { getArchivedLineStops } from '@/lib/lineStopHistory';

// Polled by every TV, so it must never be cached.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// GET /api/live?page=dashboard | ?page=overview&since=YYYY-MM-DD → everything
// that page polls, in one request (each request counts toward Vercel's quota).
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const page = params.get('page');
  const since = params.get('since') ?? '';
  try {
    if (page === 'dashboard') {
      const [state, photoFlags] = await Promise.all([getProductionState(), listDefectPhotoFlags()]);
      return NextResponse.json({ success: true, data: { state, photoFlags } });
    }
    if (page === 'overview' && /^\d{4}-\d{2}-\d{2}$/.test(since)) {
      const [state, display, blocks, lineStops] = await Promise.all([
        getProductionState(), getDisplaySettings('overview'), getBlockCounter(), getArchivedLineStops(since),
      ]);
      return NextResponse.json({ success: true, data: { state, modes: display.modes, blocks, lineStops } });
    }
    return NextResponse.json({ success: false, error: 'page must be dashboard, or overview with since=YYYY-MM-DD' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
