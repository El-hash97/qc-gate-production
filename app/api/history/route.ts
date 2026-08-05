import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/history';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const data = await getHistory({
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      date: searchParams.get('date') ?? undefined,
      shift: searchParams.get('shift') ?? undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
