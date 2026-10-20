import type { LineStop } from '@/lib/types';
import { stopDuration, stopLabel, totalLineStopMinutes, formatDuration } from '@/utils/lineStop';
import { stationTitle } from '@/utils/workflowCards';
import summary from './DefectRepairSummary.module.css';
import styles from './LineStop.module.css';

export function LineStopTable({ stops = [], now = null }: { stops?: LineStop[]; now?: Date | null }) {
  if (stops.length === 0) {
    return <div className={summary.empty}>Belum ada line stop</div>;
  }

  // An archived record has no `now`: its stops are all closed, so the clock
  // only backgrounds an ongoing stop's duration (if any slipped through).
  const clock = now ?? new Date();

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Waktu</th><th>Problem</th><th>Countermeasure</th><th>Kategori</th><th>Durasi</th></tr>
      </thead>
      <tbody>
        {stops.map((s, i) => (
          <tr key={i}>
            <td>{stopLabel(s)}</td>
            <td>{s.problem}</td>
            <td>{s.countermeasure || '—'}</td>
            <td><span className={styles.badge}>{s.category}{s.station && ` · ${stationTitle(s.station)}`}</span></td>
            <td>{formatDuration(stopDuration(s, clock))}</td>
          </tr>
        ))}
      </tbody>
      {stops.length > 1 && (
        <tfoot>
          <tr>
            <td colSpan={4}>Total Line Stop</td>
            <td>{formatDuration(totalLineStopMinutes(stops, clock))}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
