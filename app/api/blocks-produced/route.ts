import { NextResponse } from 'next/server';
import { getBlockCounter, resetBlockCounter } from '@/lib/blockCounter';

export const dynamic = 'force-dynamic';

const fail = (err: unknown) =>
  NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });

// GET /api/blocks-produced → { archived, baseline }: blocks of all archived
// shifts, and the count at the last reset. The page adds the running shift.
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getBlockCounter() });
  } catch (err) {
    return fail(err);
  }
}

// POST /api/blocks-produced → reset the counter (the gate is the page's login)
export async function POST() {
  try {
    return NextResponse.json({ success: true, data: await resetBlockCounter() });
  } catch (err) {
    return fail(err);
  }
}
