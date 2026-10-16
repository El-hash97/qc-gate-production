'use client';

import { useEffect, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { ProductionDashboardView, REPORT_LABEL, type DashboardView } from '@/components/production/ProductionDashboardView';
import { DefectPhotoModal } from '@/components/production/DefectPhotoModal';
import { EntryLogEditModal } from '@/components/production/EntryLogEditModal';
import { editEntryLog, type EntryLogEdit } from '@/utils/entryLogEdit';
import { useDefectPhotoFlags } from '@/hooks/useDefectPhotos';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';
import { useAuth } from '@/hooks/useAuth';
import { useAutoReset } from '@/hooks/useAutoReset';
import type { EntryLog, HourWindow, ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', shiftTime: '', operator: '', target: 0,
  targetBc: 0, targetCam: 0, targetCrank: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  pic: '',
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  hourlyWindow: {},
  entryLogs: [], lineStops: [], pinnedHour: '', savedAt: '',
};

export default function DashboardPage() {
  const { state, isFetching, isError, updateState } = useProductionState();
  const { authed } = useAuth();
  // The line's screen keeps the Dashboard open all shift, so it drives the 07:10 / 19:50 auto reset.
  useAutoReset();
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

  // Toggles which hour manual OK/Repair/NG input attributes to (see
  // useHourlySnapshot). Exclusive: pinning a new hour replaces any existing
  // pin; pinning the already-pinned hour clears it back to real-time.
  function handlePinHour(hour: string) {
    if (!state) return;
    updateState({ ...state, pinnedHour: state.pinnedHour === hour ? '' : hour });
  }

  // Index into the shift's full entryLogs (the dashboard shows a per-view
  // filtered copy holding the same objects). New entries only ever append, so
  // the index stays valid while the edit form is open.
  const [editIndex, setEditIndex] = useState<number | null>(null);
  function handleEditLog(log: EntryLog) {
    const index = current.entryLogs.indexOf(log);
    if (index >= 0) setEditIndex(index);
  }
  function handleSaveEdit(edit: EntryLogEdit) {
    if (!state || editIndex === null) return;
    updateState({ ...state, ...editEntryLog(state, editIndex, edit) });
    setEditIndex(null);
  }

  return (
    <main className={styles.page}>
      <ProductionDashboardView
        state={current}
        view={view}
        onViewChange={setView}
        now={new Date(minuteTick)}
        onHourlyWindowChange={authed ? handleHourlyWindow : undefined}
        onPinHour={authed ? handlePinHour : undefined}
        onEditLog={authed ? handleEditLog : undefined}
        hasPhoto={hasPhoto}
        onPhotoBarClick={(chartType, defectType) => setPhotoModal({ chartType, defectType })}
        connectionStatus={isError ? 'offline' : isFetching ? 'syncing' : 'online'}
        exportMode="download" downloadPdfUrl={`/api/dashboard/pdf?view=${view}`}
      />

      {authed && editIndex !== null && (
        <EntryLogEditModal
          key={editIndex}
          logs={current.entryLogs}
          index={editIndex}
          onSave={handleSaveEdit}
          onClose={() => setEditIndex(null)}
        />
      )}

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
