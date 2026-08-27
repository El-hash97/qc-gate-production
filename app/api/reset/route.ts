import { NextRequest, NextResponse } from 'next/server';
import {
  resetProductionState, checkResetPassword,
  InvalidResetPasswordError, ResetPasswordNotConfiguredError,
} from '@/lib/reset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    checkResetPassword(body?.password ?? '');
    const data = await resetProductionState();
    return NextResponse.json({ success: true, message: 'Data direset dan diarsipkan', data });
  } catch (err) {
    if (err instanceof InvalidResetPasswordError) {
      return NextResponse.json({ success: false, error: 'Password salah!' }, { status: 401 });
    }
    if (err instanceof ResetPasswordNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: 'Reset password belum dikonfigurasi di server (RESET_PASSWORD).' },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
