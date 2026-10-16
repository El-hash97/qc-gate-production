'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useTheme } from '@/hooks/useTheme';
import { getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import { isRunning, type Counts, type StationId } from '@/utils/finishingFlow';
import { stationDetail } from '@/utils/stationDetails';
import { StationCard } from '@/station-kit/react/StationCard';
import { VisualPanels, usePanelModes } from '@/components/visual/VisualPanels';
import { panelData } from '@/utils/visualPanels';
import styles from './page.module.css';

const FinishingLine3D = dynamic(() => import('@/components/visual/FinishingLine3D'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Memuat 3D…</div>,
});

export default function VisualisasiPage() {
  const { state } = useProductionState();
  const { theme } = useTheme();
  const [open, setOpen] = useState<StationId | null>(null);
  const detail = open ? stationDetail(open) : null;
  const [busy, setBusy] = useState<boolean[]>([]);
  const panelModes = usePanelModes();
  const [focus, setFocus] = useState<{ id: StationId; n: number }>();
  // minute tick for the ETA, the current hour and OEE's elapsed minutes
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const panels = useMemo(() => (state ? panelData(state, now) : null), [state, now]);
  // Workflow row: fly the camera there, and open the station card if it has one.
  const goTo = (id: StationId) => {
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
    if (stationDetail(id)) setOpen(id);
  };

  const counts: Counts = state
    ? { ok: getOkTotal(state, 'bc'), repair: getRepairTotal(state, 'bc'), ng: getNgTotal(state, 'bc') }
    : { ok: 0, repair: 0, ng: 0 };
  const running = isRunning(counts);

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <FinishingLine3D counts={counts} running={running} theme={theme} onSelectStation={setOpen}
          onBusyChange={setBusy} focus={focus} pins={panelModes.shownPins()} />
        {panels && <VisualPanels data={panels} running={running} busy={busy} now={now} onSelectStation={goTo} panels={panelModes} />}
        {!running && <div className={styles.overlay}>Produksi belum berjalan</div>}
        {detail && <StationCard detail={detail} theme={theme} onClose={() => setOpen(null)} />}
      </div>
    </div>
  );
}
