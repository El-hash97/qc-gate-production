import { NextResponse } from 'next/server';
import { autoResetIfDue } from '@/lib/autoReset';

// Called by every open Dashboard/Input tab once each shift changeover (07:10 /
// 19:50 WIB) has passed. No secret needed: the server decides from its own
// clock whether a reset is due, and resets at most once per changeover.
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await autoResetIfDue();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
