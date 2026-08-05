import { NextRequest, NextResponse } from 'next/server';
import { getProductionState, saveProductionState } from '@/lib/productionState';

export async function GET() {
  try {
    const data = await getProductionState();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await saveProductionState(body);
    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
