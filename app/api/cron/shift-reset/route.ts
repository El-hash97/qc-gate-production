import { NextRequest, NextResponse } from 'next/server';
import { resetProductionState } from '@/lib/reset';

// Triggered by Vercel Cron at 00:00 and 12:00 UTC (07:00/19:00 WIB — see
// vercel.json). Vercel signs cron requests with a bearer token equal to
// CRON_SECRET so this endpoint can't be hit by anyone else.
// https://vercel.com/docs/cron-jobs
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await resetProductionState();
    return NextResponse.json({ success: true, message: 'Auto-reset pergantian shift', data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
