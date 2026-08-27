'use client';

import { useState } from 'react';
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
import type { ProductGroup, ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  entryLogs: [], savedAt: '',
};

type DashboardView = 'all' | ProductGroup;

const VIEW_OPTIONS: { value: DashboardView; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'bc', label: 'B/C' },
  { value: 'shaft', label: 'Camshaft / Crankshaft' },
];

export default function DashboardPage() {
  const { state, isFetching, isError } = useProductionState();
  const current = state ?? EMPTY_STATE;

  const [view, setView] = useState<DashboardView>('all');
  const group = view === 'all' ? undefined : view;

  const ok = getOkTotal(current, group);
  const repair = getRepairTotal(current, group);
  const ng = getNgTotal(current, group);
  const rates = getRates(current, group);
  const achievement = getAchievementPercent(current, current.target, group);
  const progress = getProgressPercent(current, current.target, group);

  const defectData = view === 'bc' ? current.defectData
    : view === 'shaft' ? (current.defectDataShaft ?? {})
    : mergeCounts(current.defectData, current.defectDataShaft);
  const repairData = view === 'bc' ? current.repairData
    : view === 'shaft' ? (current.repairDataShaft ?? {})
    : mergeCounts(current.repairData, current.repairDataShaft);
  const hourlyData = view === 'bc' ? current.hourlyData
    : view === 'shaft' ? (current.hourlyDataShaft ?? {})
    : mergeHourly(current.hourlyData, current.hourlyDataShaft);
  const entryLogs = view === 'all'
    ? current.entryLogs
    : current.entryLogs.filter((log) => (log.group ?? 'bc') === view);

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
          <HourlyTable hourlyData={hourlyData} />
        </div>
        <DefectRepairSummary title="Defect Details" data={defectData} />
        <DefectRepairSummary title="Repair Details" data={repairData} />
        <EntryLogList title="Lot / Flask Log" logs={entryLogs} />
      </aside>
    </main>
  );
}
