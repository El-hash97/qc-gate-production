import { NextRequest, NextResponse } from 'next/server';
import { getArchivedLineStops } from '@/lib/lineStopHistory';

// Archived shifts change only at a reset, but stay force-dynamic like every
// other data route here.
export const dynamic = 'force-dynamic';

// GET /api/line-stops?since=YYYY-MM-DD → archived line stops (with a station)
export async function GET(request: NextRequest) {
  const since = new URL(request.url).searchParams.get('since') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return NextResponse.json({ success: false, error: 'since must be YYYY-MM-DD' }, { status: 400 });
  }
  try {
    return NextResponse.json({ success: true, data: await getArchivedLineStops(since) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
