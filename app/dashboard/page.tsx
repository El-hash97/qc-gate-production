'use client';

import { useProductionState } from '@/hooks/useProductionState';
import { ProductionChart } from '@/components/production/ProductionChart';
import { ParetoChart } from '@/components/production/ParetoChart';
import { HourlyTable } from '@/components/production/HourlyTable';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';
import { getOkTotal, getRepairTotal, getNgTotal, getRates, getAchievementPercent, getProgressPercent } from '@/utils/rates';
import { exportShiftToExcel } from '@/utils/excelExport';
import type { ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

export default function DashboardPage() {
  const { state, isFetching, isError } = useProductionState();
  const current = state ?? EMPTY_STATE;

  const ok = getOkTotal(current);
  const repair = getRepairTotal(current);
  const ng = getNgTotal(current);
  const rates = getRates(current);
  const achievement = getAchievementPercent(current, current.target);
  const progress = getProgressPercent(current, current.target);

  return (
    <main className={styles.page}>
      <div className={styles.statusBar}>
        <span>{current.operator || 'Belum ada operator'} — {current.shift}</span>
        <span className={isError ? styles.statusOffline : styles.statusOnline}>
          {isError ? 'Disconnected' : isFetching ? 'Syncing…' : 'Real-time Connected'}
        </span>
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
          <div className={styles.chartWrapper}><ParetoChart data={current.defectData} color="#dc2626" /></div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Pareto Repair</div>
          <div className={styles.chartWrapper}><ParetoChart data={current.repairData} color="#f59e0b" /></div>
        </div>
      </div>

      <div className={styles.actionBar}>
        <button type="button" className={styles.btnSuccess} onClick={() => exportShiftToExcel(current)}>
          Save Data
        </button>
      </div>

      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sidebarTitle}>Hourly Production</div>
          <HourlyTable hourlyData={current.hourlyData} />
        </div>
        <DefectRepairSummary title="Defect Details" data={current.defectData} />
        <DefectRepairSummary title="Repair Details" data={current.repairData} />
      </aside>
    </main>
  );
}
