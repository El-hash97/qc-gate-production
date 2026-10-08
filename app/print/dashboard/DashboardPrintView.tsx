'use client';

import { ProductionDashboardView, type DashboardView } from '@/components/production/ProductionDashboardView';
import type { ProductionState } from '@/lib/types';

// Sama seperti HistoryPrintView: read-only, tanpa edit hourly-window dan
// tanpa foto defect. Bedanya `now` pakai waktu saat ini supaya OEE shift
// berjalan dihitung seperti di Dashboard live (History pakai null karena
// shift-nya sudah selesai).
export function DashboardPrintView({ record, view }: { record: ProductionState; view: DashboardView }) {
  return <ProductionDashboardView state={record} view={view} onViewChange={() => {}} now={new Date()} />;
}
