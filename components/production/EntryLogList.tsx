import type { EntryLog } from '@/lib/types';
import { PRODUCT_LINE_LABELS } from '@/lib/types';
import styles from './DefectRepairSummary.module.css';

// onEdit (login only) adds a ✎ button per row to correct a mistyped entry.
export function EntryLogList({ title, logs = [], onEdit }: { title: string; logs?: EntryLog[]; onEdit?: (log: EntryLog) => void }) {
  return (
    <div>
      <div className={styles.title}>{title}</div>
      {logs.length === 0 ? (
        <div className={styles.empty}>Belum ada data</div>
      ) : (
        logs.map((log, i) => {
          const product = log.line ? PRODUCT_LINE_LABELS[log.line] : null;
          const slotLabel = log.group === 'shaft' ? 'Cavity' : 'Flask';
          const od = log.overDimensi;
          return (
            <div key={i} className={styles.item}>
              <span>
                {product && <strong>{product}</strong>}
                {product && ' — '}
                {log.type} · Lot {log.lot} / {slotLabel} {log.flask}
                {log.die ? ` · Die ${log.die}` : ''}
                {od ? ` · Die Mould ${od.dieMould}${od.coreCombo ? ` · Core ${od.coreCombo}` : ''} · F/R ${od.position} · CC ${od.crankCaseNo} · Slub/Wj ${od.slubWjNo}` : ''}
              </span>
              <span className={styles.rowEnd}>
                <span className={styles.count}>{log.qty}</span>
                {onEdit && (
                  <button
                    type="button"
                    className={styles.editButton}
                    aria-label={`Edit ${log.type} Lot ${log.lot} / ${slotLabel} ${log.flask}`}
                    title="Edit entri"
                    onClick={() => onEdit(log)}
                  >
                    ✎
                  </button>
                )}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
