import { NextRequest, NextResponse } from 'next/server';
import { getHistoryById } from '@/lib/history';
import { pdfFileName } from '@/utils/pdfExport';
import type { DashboardView } from '@/components/production/ProductionDashboardView';

// Puppeteer needs the full Node runtime (not the Edge runtime), and a
// headless-browser render genuinely takes a few seconds — longer than the
// framework's default route timeout.
export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_VIEWS: DashboardView[] = ['all', 'bc', 'camshaft', 'crankshaft'];

// Vercel and AWS Lambda both set one of these for a running function; a
// plain `next dev` / `next start` on a normal machine sets neither.
function isServerlessEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function launchBrowser() {
  if (!isServerlessEnvironment()) {
    // Local dev: the full `puppeteer` package (devDependency) bundles its
    // own matching Chromium, so this doesn't depend on the developer having
    // a browser installed at some specific path.
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({ headless: true });
  }
  // Production (Vercel): puppeteer-core has no bundled browser — paired here
  // with @sparticuz/chromium, a Chromium build sized to fit a serverless
  // function's deployment limits (see next.config.mjs's
  // serverComponentsExternalPackages, which keeps webpack from mangling it).
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ]);
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

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

  const record = await getHistoryById(id);
  if (!record) {
    return NextResponse.json({ success: false, error: 'History record not found' }, { status: 404 });
  }

  const requestedView = request.nextUrl.searchParams.get('view');
  const view: DashboardView = VALID_VIEWS.includes(requestedView as DashboardView)
    ? (requestedView as DashboardView)
    : 'bc';

  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${request.nextUrl.origin}/print/history/${id}?view=${view}`, {
      waitUntil: 'networkidle0',
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
