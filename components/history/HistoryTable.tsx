import { Fragment, type ReactNode } from 'react';
import type { HistoryRecord } from '@/lib/types';
import styles from './HistoryTable.module.css';

interface HistoryTableProps {
  records: HistoryRecord[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  renderDetail: (record: HistoryRecord) => ReactNode;
  onExport: (record: HistoryRecord) => void;
}

export function HistoryTable({ records, expandedId, onToggle, renderDetail, onExport }: HistoryTableProps) {
  if (records.length === 0) {
    return <div className={styles.empty}>Belum ada histori shift</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Tanggal</th><th>Shift</th><th>Operator</th><th>Target</th>
          <th>OK</th><th>Repair</th><th>NG</th><th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <Fragment key={record.id}>
            <tr onClick={() => onToggle(record.id)} className={styles.row}>
              <td>{record.date}</td>
              <td>{record.shift}</td>
              <td>{record.operator}</td>
              <td>{record.target}</td>
              <td>{record.ok1 + record.ok2 + (record.ok3 ?? 0) + (record.ok4 ?? 0)}</td>
              <td>{record.repair1 + record.repair2 + (record.repair3 ?? 0) + (record.repair4 ?? 0)}</td>
              <td>{record.ng1 + record.ng2 + (record.ng3 ?? 0) + (record.ng4 ?? 0)}</td>
              <td>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onExport(record); }}
                >
                  Export
                </button>
              </td>
            </tr>
            {expandedId === record.id && (
              <tr>
                <td colSpan={8}>{renderDetail(record)}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
