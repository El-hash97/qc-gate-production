import type { ProductionState } from '@/lib/types';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
}

export function HourlyTable({ hourlyData }: HourlyTableProps) {
  const sortedHours = Object.keys(hourlyData).sort();

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Jam</th><th>OK</th><th>Repair</th><th>NG</th></tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => (
          <tr key={hour}>
            <td>{hour}</td>
            <td>{hourlyData[hour].ok}</td>
            <td>{hourlyData[hour].repair}</td>
            <td>{hourlyData[hour].ng}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
