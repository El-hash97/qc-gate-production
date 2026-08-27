import type { EntryLog } from '@/lib/types';
import styles from './DefectRepairSummary.module.css';

export function EntryLogList({ title, logs = [] }: { title: string; logs?: EntryLog[] }) {
  return (
    <div>
      <div className={styles.title}>{title}</div>
      {logs.length === 0 ? (
        <div className={styles.empty}>Belum ada data</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={styles.item}>
            <span>{log.type} — Lot {log.lot} / Flask {log.flask}</span>
            <span className={styles.count}>{log.qty}</span>
          </div>
        ))
      )}
    </div>
  );
}
