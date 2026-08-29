import { NextRequest, NextResponse } from 'next/server';
import { restoreHistoryToCurrent, HistoryRecordNotFoundError } from '@/lib/history';

// Copies an archived shift back into the live production_state and removes it
// from history — the "Edit" action in the History view.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid history id' }, { status: 400 });
    }
    const data = await restoreHistoryToCurrent(id);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof HistoryRecordNotFoundError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
