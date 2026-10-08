import { getProductionState } from '@/lib/productionState';
import type { DashboardView } from '@/components/production/ProductionDashboardView';
import { DashboardPrintView } from './DashboardPrintView';

// Deliberately not imported from hooks/useTheme (a 'use client' module) — a
// plain constant re-exported from a client module into a Server Component
// like this page comes through as an opaque client reference here, not the
// actual string, so the interpolation below silently became
// "localStorage.setItem('[object Object]', 'light')" and never took effect.
// Must stay in sync with THEME_STORAGE_KEY in hooks/useTheme.tsx.
const THEME_STORAGE_KEY = 'qc-theme';

const VALID_VIEWS: DashboardView[] = ['all', 'bc', 'camshaft', 'crankshaft'];

// Target render khusus untuk headless browser di app/api/dashboard/pdf —
// sengaja di luar path terproteksi supaya AuthGate tidak memblokirnya.
// Tidak ada link ke sini dari UI; hanya dibuka server-side untuk dicetak
// menjadi file PDF, persis seperti app/print/history/[id] untuk History.
export default async function DashboardPrintPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const requestedView = searchParams.view;
  const view: DashboardView = VALID_VIEWS.includes(requestedView as DashboardView)
    ? (requestedView as DashboardView)
    : 'bc';

  const record = await getProductionState();

  if (!record) {
    return <main style={{ padding: 24 }}>Belum ada data shift berjalan.</main>;
  }

  return (
    <>
      {/* Forces the light theme before ThemeProvider's own mount effect ever
          reads localStorage, so there's no race between the two — the
          headless browser rendering this page (app/api/dashboard/pdf)
          starts with a fresh, empty localStorage each time, same as the
          root layout's THEME_INIT_SCRIPT forces the saved theme pre-paint. */}
      <script
        dangerouslySetInnerHTML={{ __html: `try{localStorage.setItem('${THEME_STORAGE_KEY}','light');}catch(e){}` }}
      />
      <DashboardPrintView record={record} view={view} />
    </>
  );
}
