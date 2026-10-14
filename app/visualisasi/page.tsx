'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useTheme } from '@/hooks/useTheme';
import { getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import { isRunning, type Counts, type StationId } from '@/utils/finishingFlow';
import { stationDetail } from '@/utils/stationDetails';
import { StationCard } from '@/station-kit/react/StationCard';
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

  const counts: Counts = state
    ? { ok: getOkTotal(state, 'bc'), repair: getRepairTotal(state, 'bc'), ng: getNgTotal(state, 'bc') }
    : { ok: 0, repair: 0, ng: 0 };
  const running = isRunning(counts);

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <FinishingLine3D counts={counts} running={running} theme={theme} onSelectStation={setOpen} />
        {!running && <div className={styles.overlay}>Produksi belum berjalan</div>}
        {detail && <StationCard detail={detail} theme={theme} onClose={() => setOpen(null)} />}
      </div>
    </div>
  );
}
