'use client';

import { useEffect, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { ProductionDashboardView, REPORT_LABEL, type DashboardView } from '@/components/production/ProductionDashboardView';
import { DefectPhotoModal } from '@/components/production/DefectPhotoModal';
import { useDefectPhotoFlags } from '@/hooks/useDefectPhotos';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';
import { useAuth } from '@/hooks/useAuth';
import type { HourWindow, ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  targetBc: 0, targetCam: 0, targetCrank: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  pic: '',
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  hourlyWindow: {},
  entryLogs: [], lineStops: [], savedAt: '',
};

export default function DashboardPage() {
  const { state, isFetching, isError, updateState } = useProductionState();
  const { authed } = useAuth();
  const current = state ?? EMPTY_STATE;

  const [view, setView] = useState<DashboardView>('bc');
  // Defect photos are per product group + chart type + defect name — "Semua"
  // mixes 3 groups' data so it has no slot of its own; the Pareto bars aren't clickable there.
  const photoGroup: PhotoGroup | null = view === 'all' ? null : view;
  const [photoModal, setPhotoModal] = useState<{ chartType: PhotoChartType; defectType: string } | null>(null);
  const { hasPhoto } = useDefectPhotoFlags();

  // The running hour is measured against the minutes gone by, so it has to be
  // recomputed as the clock moves even when no new production comes in.
  const [minuteTick, setMinuteTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setMinuteTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Plant-wide worked window, so it writes the same `hourlyWindow` map from any
  // view. Never write before the running shift has loaded — that would POST
  // EMPTY_STATE over live data (mirrors the Input page's load gate).
  function handleHourlyWindow(hour: string, win: HourWindow) {
    if (!state) return;
    updateState({ ...state, hourlyWindow: { ...(state.hourlyWindow ?? {}), [hour]: win } });
  }

  return (
    <main className={styles.page}>
      <ProductionDashboardView
        state={current}
        view={view}
        onViewChange={setView}
        now={new Date(minuteTick)}
        onHourlyWindowChange={authed ? handleHourlyWindow : undefined}
        hasPhoto={hasPhoto}
        onPhotoBarClick={(chartType, defectType) => setPhotoModal({ chartType, defectType })}
        connectionStatus={isError ? 'offline' : isFetching ? 'syncing' : 'online'}
      />

      {photoGroup && photoModal && (
        <DefectPhotoModal
          isOpen
          onClose={() => setPhotoModal(null)}
          group={photoGroup}
          chartType={photoModal.chartType}
          defectType={photoModal.defectType}
          title={`Foto Defect — ${REPORT_LABEL[view]} / ${photoModal.chartType === 'ng' ? 'NG' : 'Repair'} — ${photoModal.defectType}`}
        />
      )}
    </main>
  );
}
