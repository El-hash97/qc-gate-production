import type { HistoryRecord } from '@/lib/types';
import { ParetoChart } from '@/components/production/ParetoChart';
import { EntryLogList } from '@/components/production/EntryLogList';
import { mergeCounts } from '@/utils/rates';
import styles from './HistoryDetail.module.css';

export function HistoryDetail({ record }: { record: HistoryRecord }) {
  // Combine Block Cylinder and Camshaft/Crankshaft so a saved shift shows its
  // full defect/repair picture at a glance.
  const defectData = mergeCounts(record.defectData, record.defectDataShaft);
  const repairData = mergeCounts(record.repairData, record.repairDataShaft);

  return (
    <div className={styles.detail}>
      <div className={styles.chartsGrid}>
        <div>
          <div className={styles.chartTitle}>Pareto Defect (NG)</div>
          <div className={styles.chartWrapper}><ParetoChart data={defectData} color="#dc2626" /></div>
        </div>
        <div>
          <div className={styles.chartTitle}>Pareto Repair</div>
          <div className={styles.chartWrapper}><ParetoChart data={repairData} color="#f59e0b" /></div>
        </div>
      </div>
      <EntryLogList title="Lot / Flask Log" logs={record.entryLogs} />
    </div>
  );
}
