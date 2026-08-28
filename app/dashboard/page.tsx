'use client';

import { useMemo, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { ProductionChart } from '@/components/production/ProductionChart';
import { ParetoChart } from '@/components/production/ParetoChart';
import { HourlyTable } from '@/components/production/HourlyTable';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';
import { EntryLogList } from '@/components/production/EntryLogList';
import {
  getOkTotal, getRepairTotal, getNgTotal, getRates,
  getAchievementPercent, getProgressPercent, mergeCounts, mergeHourly,
} from '@/utils/rates';
import type { EntryLog, ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  entryLogs: [], savedAt: '',
};

type DashboardView = 'all' | 'bc' | 'camshaft' | 'crankshaft';

const VIEW_OPTIONS: { value: DashboardView; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'bc', label: 'B/C' },
  { value: 'camshaft', label: 'Camshaft' },
  { value: 'crankshaft', label: 'Crankshaft' },
];

// Camshaft = line 3, Crankshaft = line 4. Their defect/repair tallies share
// one stored bucket (defectDataShaft), so per-product breakdowns are summed
// from the line-tagged entry logs instead.
const LINE_FOR: Record<'camshaft' | 'crankshaft', 3 | 4> = { camshaft: 3, crankshaft: 4 };

function bucketByLine(logs: EntryLog[], line: 3 | 4, kind: 'defect' | 'repair'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const log of logs) {
    if (log.line === line && log.kind === kind) out[log.type] = (out[log.type] ?? 0) + log.qty;
  }
  return out;
}

export default function DashboardPage() {
  const { state, isFetching, isError } = useProductionState();
  const current = state ?? EMPTY_STATE;

  const [view, setView] = useState<DashboardView>('all');
  const isShaftLine = view === 'camshaft' || view === 'crankshaft';
  // Scope passed to the rate helpers: undefined = all, 'bc' = lines 1-2,
  // 3/4 = a single shaft line.
  const scope = view === 'all' ? undefined : view === 'bc' ? 'bc' : LINE_FOR[view];

  const ok = getOkTotal(current, scope);
  const repair = getRepairTotal(current, scope);
  const ng = getNgTotal(current, scope);
  const rates = getRates(current, scope);
  const achievement = getAchievementPercent(current, current.target, scope);
  const progress = getProgressPercent(current, current.target, scope);

  // Memoised so an unchanged background poll (react-query keeps the same
  // `current` reference via structural sharing) doesn't hand the charts a new
  // object every 3s and make them redraw.
  const defectData = useMemo(() => (
    view === 'bc' ? current.defectData
      : isShaftLine ? bucketByLine(current.entryLogs, LINE_FOR[view], 'defect')
      : mergeCounts(current.defectData, current.defectDataShaft)
  ), [view, isShaftLine, current.defectData, current.defectDataShaft, current.entryLogs]);
  const repairData = useMemo(() => (
    view === 'bc' ? current.repairData
      : isShaftLine ? bucketByLine(current.entryLogs, LINE_FOR[view], 'repair')
      : mergeCounts(current.repairData, current.repairDataShaft)
  ), [view, isShaftLine, current.repairData, current.repairDataShaft, current.entryLogs]);
  const hourlyData = useMemo(() => {
    if (view === 'bc') return current.hourlyData;
    if (view === 'camshaft') return current.hourlyDataCam ?? {};
    if (view === 'crankshaft') return current.hourlyDataCrank ?? {};
    return mergeHourly(current.hourlyData, current.hourlyDataShaft);
  }, [view, current.hourlyData, current.hourlyDataShaft, current.hourlyDataCam, current.hourlyDataCrank]);
  const entryLogs = useMemo(() => {
    if (view === 'all') return current.entryLogs;
    if (view === 'bc') return current.entryLogs.filter((log) => (log.group ?? 'bc') === 'bc');
    return current.entryLogs.filter((log) => log.line === LINE_FOR[view]);
  }, [view, current.entryLogs]);

  return (
    <main className={styles.page}>
      <div className={styles.statusBar}>
        <span>{current.operator || 'Belum ada operator'} — {current.shift}</span>
        <span className={isError ? styles.statusOffline : styles.statusOnline}>
          {isError ? 'Disconnected' : isFetching ? 'Syncing…' : 'Real-time Connected'}
        </span>
      </div>

      <div className={styles.viewToggle} role="group" aria-label="Filter produk">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={view === option.value ? styles.viewButtonActive : styles.viewButton}
            aria-pressed={view === option.value}
            onClick={() => setView(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.progressStrip}>
        <div style={{ flex: 1 }}>
          <div className={styles.progressLabel}><span>Progress</span><span>{progress}%</span></div>
          <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
        </div>
        <div className={styles.achievementBadge}>Achievement: {achievement}%</div>
      </div>

      <div className={styles.rateStrip}>
        <span>OK Rate: {rates.okRate}%</span>
        <span>Repair Rate: {rates.repairRate}%</span>
        <span>NG Rate: {rates.ngRate}%</span>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Production Distribution</div>
          <div className={styles.chartWrapper}><ProductionChart ok={ok} repair={repair} ng={ng} /></div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Pareto Defect (NG)</div>
          <div className={styles.chartWrapper}><ParetoChart data={defectData} color="#dc2626" /></div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Pareto Repair</div>
          <div className={styles.chartWrapper}><ParetoChart data={repairData} color="#f59e0b" /></div>
        </div>
      </div>

      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sidebarTitle}>Hourly Production</div>
          <div className={styles.scrollBox}>
            <HourlyTable hourlyData={hourlyData} />
          </div>
        </div>
        <DefectRepairSummary title="Defect Details" data={defectData} />
        <DefectRepairSummary title="Repair Details" data={repairData} />
        <div className={styles.scrollBox}>
          <EntryLogList title={isShaftLine ? 'Lot / Cavity Log' : 'Lot / Flask Log'} logs={entryLogs} />
        </div>
      </aside>
    </main>
  );
}
