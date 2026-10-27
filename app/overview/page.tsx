'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useLineStopHistory } from '@/hooks/useLineStopHistory';
import { useBlocksProduced, useResetBlockCounter } from '@/hooks/useBlocksProduced';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { getGrandTotal, getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import { isRunning, type Counts, type StationId } from '@/utils/finishingFlow';
import { PRODUCT_DETAIL, stationDetail } from '@/utils/stationDetails';
import { withBlockCount } from '@/utils/blockCount';
import { StationCard } from '@/station-kit/react/StationCard';
import { LineStopDialog } from '@/components/visual/LineStopDialog';
import { VisualPanels, usePanelModes } from '@/components/visual/VisualPanels';
import { panelData } from '@/utils/visualPanels';
import { activeStationStop, stopsAt as stopsOf } from '@/utils/lineStop';
import { stationTitle } from '@/utils/workflowCards';
import { stationCounts, withLiveStops } from '@/utils/stopHistory';
import styles from './page.module.css';

const FinishingLine3D = dynamic(() => import('@/components/visual/FinishingLine3D'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading 3D…</div>,
});

export default function OverviewPage() {
  useLivePoll('overview');
  const { state } = useProductionState({ poll: false });
  const { theme } = useTheme();
  const [open, setOpen] = useState<StationId | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [stopsAt, setStopsAt] = useState<StationId | null>(null);
  const [busy, setBusy] = useState<boolean[]>([]);
  // Guests read the same view, without the display settings.
  const { authed } = useAuth();
  const panelModes = usePanelModes(!authed);
  const [focus, setFocus] = useState<{ id: StationId; n: number }>();
  // minute tick for the ETA, the current hour and OEE's elapsed minutes
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const panels = useMemo(() => (state ? panelData(state, now) : null), [state, now]);
  const lineStop = useMemo(() => activeStationStop(state?.lineStops, now), [state, now]);
  // last 30 days of line stops: archived shifts + the one running now. Per
  // machine, 3+ in this shift turns it orange (blinking) and 10+ red.
  const { data: archived } = useLineStopHistory();
  const stops30 = useMemo(
    () => withLiveStops(archived ?? [], state?.lineStops, state?.date, now),
    [archived, state?.lineStops, state?.date, now],
  );
  const stopCounts = useMemo(() => stationCounts(stops30), [stops30]);
  // Workflow row: fly the camera there, and open the station card if it has one.
  const goTo = (id: StationId) => {
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
    if (stationDetail(id)) setOpen(id);
  };

  // Baritori's card counts the blocks produced since the last reset: archived
  // shifts + the one running now. Logged-in users can reset it (new part fitted).
  const { data: blockCounter } = useBlocksProduced();
  const resetCounter = useResetBlockCounter();
  const liveBlocks = state ? getGrandTotal(state, 'bc') : 0;
  const base = open ? stationDetail(open) : null;
  const onResetBlocks = authed && !resetCounter.isPending
    ? () => { if (window.confirm('Reset the block counter to 0? Do this after the worn part has been replaced.')) resetCounter.mutate(); }
    : undefined;
  const detail = base && open === 'baritori' && blockCounter
    ? withBlockCount(base, Math.max(0, blockCounter.archived + liveBlocks - blockCounter.baseline), onResetBlocks)
    : base;

  const counts: Counts = state
    ? { ok: getOkTotal(state, 'bc'), repair: getRepairTotal(state, 'bc'), ng: getNgTotal(state, 'bc') }
    : { ok: 0, repair: 0, ng: 0 };
  const running = isRunning(counts);

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <FinishingLine3D counts={counts} running={running} theme={theme} onSelectStation={setOpen}
          onBusyChange={setBusy} focus={focus} pins={panelModes.shownPins()}
          labels={panelModes.mode('labels') !== 'hidden'} lineStop={lineStop}
          lineStops={stops30} stopCounts={stopCounts} onSelectLineStops={setStopsAt} />
        {panels && <VisualPanels data={panels} running={running} busy={busy} now={now} onSelectStation={goTo} onSelectProduct={() => setProductOpen(true)} theme={theme} panels={panelModes} lineStop={lineStop} />}
        {!running && <div className={styles.overlay}>Production has not started</div>}
        {/* station figures always use the light artwork, even in dark mode */}
        {stopsAt && <LineStopDialog title={stationTitle(stopsAt)} stops={stopsOf(stops30, stopsAt)} active={lineStop} now={now} onClose={() => setStopsAt(null)} />}
        {detail && <StationCard detail={detail} theme="light" onClose={() => setOpen(null)} />}
        {productOpen && <StationCard detail={PRODUCT_DETAIL} theme="light" onClose={() => setProductOpen(false)} />}
      </div>
    </div>
  );
}
