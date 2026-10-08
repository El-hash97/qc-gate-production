import { NextRequest, NextResponse } from 'next/server';
import { getProductionState } from '@/lib/productionState';
import { launchPdfBrowser } from '@/lib/pdfBrowser';
import { pdfFileName } from '@/utils/pdfExport';
import type { DashboardView } from '@/components/production/ProductionDashboardView';

// Puppeteer needs the full Node runtime (not the Edge runtime), and a
// headless-browser render genuinely takes a few seconds — longer than the
// framework's default route timeout.
export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_VIEWS: DashboardView[] = ['all', 'bc', 'camshaft', 'crankshaft'];

// Merender shift berjalan menjadi file PDF sungguhan — ini yang dipakai tombol
// "Download PDF" di Dashboard live (lihat ProductionDashboardView). Membuka
// halaman print khusus (app/print/dashboard) di headless browser lalu
// mencetaknya persis seperti print export via browser (mesin print browser
// asli, via @media print), sehingga hasilnya identik — langsung terdownload
// sebagai attachment, tanpa dialog print.
export async function GET(request: NextRequest) {
  const record = await getProductionState();
  if (!record) {
    return NextResponse.json({ success: false, error: 'Belum ada data shift berjalan' }, { status: 404 });
  }

  const requestedView = request.nextUrl.searchParams.get('view');
  const view: DashboardView = VALID_VIEWS.includes(requestedView as DashboardView)
    ? (requestedView as DashboardView)
    : 'bc';

  let browser: Awaited<ReturnType<typeof launchPdfBrowser>> | undefined;
  try {
    browser = await launchPdfBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${request.nextUrl.origin}/print/dashboard?view=${view}`, {
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
