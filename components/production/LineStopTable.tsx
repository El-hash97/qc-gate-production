import type { LineStop } from '@/lib/types';
import { lineStopMinutes, totalLineStopMinutes, formatDuration } from '@/utils/lineStop';
import summary from './DefectRepairSummary.module.css';
import styles from './LineStop.module.css';

export function LineStopTable({ stops = [] }: { stops?: LineStop[] }) {
  if (stops.length === 0) {
    return <div className={summary.empty}>Belum ada line stop</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Waktu</th><th>Problem</th><th>Countermeasure</th><th>Kategori</th><th>Durasi</th></tr>
      </thead>
      <tbody>
        {stops.map((s, i) => (
          <tr key={i}>
            <td>{s.start}–{s.end}</td>
            <td>{s.problem}</td>
            <td>{s.countermeasure || '—'}</td>
            <td><span className={styles.badge}>{s.category}</span></td>
            <td>{formatDuration(lineStopMinutes(s.start, s.end))}</td>
          </tr>
        ))}
      </tbody>
      {stops.length > 1 && (
        <tfoot>
          <tr>
            <td colSpan={4}>Total Line Stop</td>
            <td>{formatDuration(totalLineStopMinutes(stops))}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
