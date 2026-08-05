import type { HistoryRecord } from '@/lib/types';
import { ParetoChart } from '@/components/production/ParetoChart';
import styles from './HistoryDetail.module.css';

export function HistoryDetail({ record }: { record: HistoryRecord }) {
  return (
    <div className={styles.detail}>
      <div className={styles.chartsGrid}>
        <div>
          <div className={styles.chartTitle}>Pareto Defect (NG)</div>
          <div className={styles.chartWrapper}><ParetoChart data={record.defectData} color="#dc2626" /></div>
        </div>
        <div>
          <div className={styles.chartTitle}>Pareto Repair</div>
          <div className={styles.chartWrapper}><ParetoChart data={record.repairData} color="#f59e0b" /></div>
        </div>
      </div>
    </div>
  );
}
