import { NextRequest, NextResponse } from 'next/server';
import { autoResetIfDue } from '@/lib/autoReset';

// Backup trigger for the 07:10 / 19:50 WIB auto reset (see lib/autoReset.ts),
// for when no Dashboard/Input tab is open. Vercel Hobby cron only promises the
// hour, so vercel.json schedules it the hour after each changeover (01:00 and
// 13:00 UTC = 08:xx / 20:xx WIB); it is a no-op if a tab already reset.
// Vercel signs cron requests with a bearer token equal to CRON_SECRET.
// https://vercel.com/docs/cron-jobs
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await autoResetIfDue();
    return NextResponse.json({ success: true, message: 'Auto-reset pergantian shift', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
