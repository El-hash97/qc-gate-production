import { notFound } from 'next/navigation';
import { getHistoryById } from '@/lib/history';
import type { DashboardView } from '@/components/production/ProductionDashboardView';
import { HistoryPrintView } from './HistoryPrintView';

// Deliberately not imported from hooks/useTheme (a 'use client' module) — a
// plain constant re-exported from a client module into a Server Component
// like this page comes through as an opaque client reference here, not the
// actual string, so the interpolation below silently became
// "localStorage.setItem('[object Object]', 'light')" and never took effect.
// Must stay in sync with THEME_STORAGE_KEY in hooks/useTheme.tsx.
const THEME_STORAGE_KEY = 'qc-theme';

const VALID_VIEWS: DashboardView[] = ['all', 'bc', 'camshaft', 'crankshaft'];

// A dedicated, unauthenticated render target for a saved shift — deliberately
// outside /history so AuthGate doesn't block it. Nothing links here from the
// UI; it exists only for the headless browser in app/api/history/[id]/pdf to
// navigate to and print, which is how "Download PDF" (History) gets a file
// that looks exactly like the live Dashboard's print export — a real
// browser's print engine, not an in-app screenshot approximation of one.
export default async function HistoryPrintPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { view?: string };
}) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) notFound();

  const record = await getHistoryById(id);
  if (!record) notFound();

  const requestedView = searchParams.view;
  const view: DashboardView = VALID_VIEWS.includes(requestedView as DashboardView)
    ? (requestedView as DashboardView)
    : 'bc';

  return (
    <>
      {/* Forces the light theme before ThemeProvider's own mount effect ever
          reads localStorage, so there's no race between the two — the
          headless browser rendering this page (app/api/history/[id]/pdf)
          starts with a fresh, empty localStorage each time, same as the
          root layout's THEME_INIT_SCRIPT forces the saved theme pre-paint. */}
      <script
        dangerouslySetInnerHTML={{ __html: `try{localStorage.setItem('${THEME_STORAGE_KEY}','light');}catch(e){}` }}
      />
      <HistoryPrintView record={record} view={view} />
    </>
  );
}
