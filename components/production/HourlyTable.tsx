'use client';

import { useDraftValue } from '@/hooks/useDraftValue';
import type { ProductionState } from '@/lib/types';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
  // Per-hour target (pcs) for the active product group, keyed "HH:00".
  hourlyTarget?: Record<string, number>;
  // When true each row's target is an editable field; otherwise it's shown
  // read-only (the "Semua" view, where the target is a sum of the groups).
  editable?: boolean;
  onTargetChange?: (hour: string, value: number) => void;
}

const parseTarget = {
  parse: (raw: string) => {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  },
  format: (value: number) => (value > 0 ? String(value) : ''),
};

function TargetCell({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const field = useDraftValue(value, onCommit, parseTarget);
  return (
    <input
      type="number"
      min={0}
      className={styles.targetInput}
      placeholder="—"
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      onKeyDown={field.onKeyDown}
    />
  );
}

export function HourlyTable({ hourlyData, hourlyTarget = {}, editable = false, onTargetChange }: HourlyTableProps) {
  const sortedHours = Object.keys(hourlyData).sort();

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Jam</th><th>OK</th><th>Repair</th><th>NG</th><th>Target</th></tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => (
          <tr key={hour}>
            <td>{hour}</td>
            <td>{hourlyData[hour].ok}</td>
            <td>{hourlyData[hour].repair}</td>
            <td>{hourlyData[hour].ng}</td>
            <td>
              {editable && onTargetChange ? (
                <TargetCell value={hourlyTarget[hour] ?? 0} onCommit={(v) => onTargetChange(hour, v)} />
              ) : (
                hourlyTarget[hour] || '—'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
