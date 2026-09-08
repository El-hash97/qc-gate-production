'use client';

import { useDraftValue } from '@/hooks/useDraftValue';
import type { ProductionState } from '@/lib/types';
import type { OeeBreakdown } from '@/utils/oee';
import { toPercent } from '@/utils/oee';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
  // Per-hour target (pcs) for the active product group, keyed "HH:00".
  hourlyTarget?: Record<string, number>;
  // When true each row's target is an editable field; otherwise it's shown
  // read-only (the "Semua" view, where the target is a sum of the groups).
  editable?: boolean;
  onTargetChange?: (hour: string, value: number) => void;
  // Per-hour OEE factors, keyed "HH:00". Supplied only for a view that has a
  // cycle time to measure against (B/C today); without it the AV/PE/RQ/OEE
  // columns aren't rendered at all.
  oee?: Record<string, OeeBreakdown>;
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

// Green from 85%, amber from 60%, red below — a glance down the column shows
// which hour cost the shift its OEE.
function rateClass(percent: number): string {
  if (percent >= 85) return styles.rateGood;
  if (percent >= 60) return styles.rateWarn;
  return styles.rateBad;
}

function RateCell({ ratio }: { ratio: number }) {
  const percent = toPercent(ratio);
  return <td className={rateClass(percent)}>{percent}%</td>;
}

export function HourlyTable({
  hourlyData, hourlyTarget = {}, editable = false, onTargetChange, oee,
}: HourlyTableProps) {
  const sortedHours = Object.keys(hourlyData).sort();

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Jam</th><th>OK</th><th>Repair</th><th>NG</th><th>Target</th>
          {oee && <><th>AV</th><th>PE</th><th>RQ</th><th>OEE</th></>}
        </tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => {
          const factors = oee?.[hour];
          return (
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
              {oee && factors && (
                <>
                  <RateCell ratio={factors.av} />
                  <RateCell ratio={factors.pe} />
                  <RateCell ratio={factors.rq} />
                  <RateCell ratio={factors.oee} />
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
