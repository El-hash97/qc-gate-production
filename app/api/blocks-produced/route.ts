import { NextResponse } from 'next/server';
import { getBlocksProduced } from '@/lib/history';

export const dynamic = 'force-dynamic';

// GET /api/blocks-produced → { success, data: total blocks of all archived shifts }
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getBlocksProduced() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
