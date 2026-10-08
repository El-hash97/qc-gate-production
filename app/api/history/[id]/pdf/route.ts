import { NextRequest, NextResponse } from 'next/server';
import { getHistoryById } from '@/lib/history';
import { launchPdfBrowser } from '@/lib/pdfBrowser';
import { pdfFileName } from '@/utils/pdfExport';
import type { DashboardView } from '@/components/production/ProductionDashboardView';

// Puppeteer needs the full Node runtime (not the Edge runtime), and a
// headless-browser render genuinely takes a few seconds — longer than the
// framework's default route timeout.
export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_VIEWS: DashboardView[] = ['all', 'bc', 'camshaft', 'crankshaft'];

// Renders a saved shift's report to a real PDF file — this is "Download PDF"
// in History (see ProductionDashboardView). It opens the record's dedicated,
// unauthenticated print page (app/print/history/[id]) in a headless browser
// and prints it exactly the way the live Dashboard's "Export PDF" does
// (the browser's own print engine, via @media print), so the two exports
// look identical — a client-side DOM screenshot can't reliably reproduce
// this app's CSS Grid layout the way a real browser's print engine does.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: 'Invalid history id' }, { status: 400 });
  }

  let browser: Awaited<ReturnType<typeof launchPdfBrowser>> | undefined;
  try {
    // Inside try on purpose: a DB throw here must come back as JSON (which
    // the client surfaces in its toast), not as Next's generic HTML 500 page.
    const record = await getHistoryById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'History record not found' }, { status: 404 });
    }

    const requestedView = request.nextUrl.searchParams.get('view');
    const view: DashboardView = VALID_VIEWS.includes(requestedView as DashboardView)
      ? (requestedView as DashboardView)
      : 'bc';

    browser = await launchPdfBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${request.nextUrl.origin}/print/history/${id}?view=${view}`, {
      // networkidle2, not networkidle0: chart/data fetches settle in waves,
      // and a single straggler must not fail the whole export.
      waitUntil: 'networkidle2',
      timeout: 30_000,
    });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName(record)}"`,
      },
    });
  } catch (err) {
    // console.error lands in Vercel's Runtime Logs — without this, a
    // production-only failure (e.g. headless-browser launch) is invisible.
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[api/history/${id}/pdf] gagal membuat PDF:`, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
