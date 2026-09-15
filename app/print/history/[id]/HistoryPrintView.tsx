'use client';

import { ProductionDashboardView, type DashboardView } from '@/components/production/ProductionDashboardView';
import type { HistoryRecord } from '@/lib/types';

// Same read-only usage as History's own inline HistoryDetail — no hourly-
// window editing, no defect-photo affordance. The light theme is forced by
// the parent server page's inline script, before this ever mounts.
export function HistoryPrintView({ record, view }: { record: HistoryRecord; view: DashboardView }) {
  return <ProductionDashboardView state={record} view={view} onViewChange={() => {}} now={null} />;
}
