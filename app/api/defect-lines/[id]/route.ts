import { NextResponse } from 'next/server';
import { deleteDefectLine } from '@/lib/defectLines';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: 'Id tidak valid' }, { status: 400 });
  }
  try {
    await deleteDefectLine(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
