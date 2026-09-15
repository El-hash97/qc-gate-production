'use client';

import { useState } from 'react';
import type { HistoryRecord } from '@/lib/types';
import { ProductionDashboardView, type DashboardView } from '@/components/production/ProductionDashboardView';
import { pdfFileName } from '@/utils/pdfExport';
import styles from './HistoryDetail.module.css';

// Shows a saved shift exactly like the live Dashboard (same toggle, same
// panels), sourced from the archived record instead of the polled live
// state. Always read-only: no hourly-window editing (an archived shift isn't
// meant to be edited in place — see History's own "Edit" flow, which
// restores it to the live shift instead) and no defect-photo affordance
// (photos are live-only, not tied to a saved shift; see useDefectPhotos).
// `now={null}` tells the OEE math the shift is finished, so every recorded
// hour counts as fully worked rather than measuring against the live clock.
export function HistoryDetail({ record }: { record: HistoryRecord }) {
  const [view, setView] = useState<DashboardView>('bc');

  return (
    <div className={styles.detail}>
      <ProductionDashboardView
        state={record} view={view} onViewChange={setView} now={null}
        exportMode="download" pdfFileName={pdfFileName(record)}
      />
    </div>
  );
}
