'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useTheme } from '@/hooks/useTheme';
import { getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import { isRunning, type Counts } from '@/utils/finishingFlow';
import styles from './page.module.css';

const FinishingLine3D = dynamic(() => import('@/components/visual/FinishingLine3D'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Memuat 3D…</div>,
});

const TILES = [
  { key: 'ok', label: 'OK', color: 'var(--accent-green)' },
  { key: 'repair', label: 'Repair', color: 'var(--accent-orange)' },
  { key: 'ng', label: 'NG', color: 'var(--accent-red)' },
] as const;

export default function VisualisasiPage() {
  const { state } = useProductionState();
  const { theme } = useTheme();

  const counts: Counts = state
    ? { ok: getOkTotal(state, 'bc'), repair: getRepairTotal(state, 'bc'), ng: getNgTotal(state, 'bc') }
    : { ok: 0, repair: 0, ng: 0 };
  const total = counts.ok + counts.repair + counts.ng;
  const running = isRunning(counts);

  return (
    <div className={styles.page}>
      <div className={styles.tiles}>
        {TILES.map((t) => (
          <div key={t.key} className={styles.tile} style={{ '--tile-color': t.color } as CSSProperties}>
            <span className={styles.tileLabel}>{t.label}</span>
            <span className={styles.tileValue}>{counts[t.key]}</span>
            <span className={styles.tilePct}>
              {total ? `${((counts[t.key] / total) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.stage}>
        <FinishingLine3D counts={counts} running={running} theme={theme} />
        {!running && <div className={styles.overlay}>Produksi belum berjalan</div>}
      </div>
    </div>
  );
}
