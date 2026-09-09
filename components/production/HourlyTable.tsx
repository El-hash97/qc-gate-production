'use client';

import { useDraftValue } from '@/hooks/useDraftValue';
import type { HourWindow, ProductionState } from '@/lib/types';
import type { OeeBreakdown } from '@/utils/oee';
import { toPercent } from '@/utils/oee';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
  // Per-hour target (pcs) for the active product group, keyed "HH:00".
  hourlyTarget?: Record<string, number>;
  // Actual worked window per hour, keyed "HH:00". An hour with no entry falls
  // back to the full clock hour (HH:00 -> HH+1:00).
  hourlyWindow?: Record<string, HourWindow>;
  // When true each row's target and time window are editable fields; otherwise
  // they're shown read-only (the "Semua" view).
  editable?: boolean;
  onTargetChange?: (hour: string, value: number) => void;
  onWindowChange?: (hour: string, win: HourWindow) => void;
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

const identityTime = {
  parse: (raw: string) => raw,
  format: (value: string) => value,
};

// "07:00" -> "08:00"; "23:00" -> "00:00". The default window of an hour is the
// clock hour itself, shown until the operator narrows it for a break.
function nextHour(hour: string): string {
  const h = parseInt(hour.slice(0, 2), 10);
  return `${String((Number.isNaN(h) ? 0 : h + 1) % 24).padStart(2, '0')}:00`;
}

function defaultWindow(hour: string): HourWindow {
  return { start: hour, end: nextHour(hour) };
}

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

// Two time fields; either one committing sends the whole {start,end} back up.
function WindowCell({ win, onCommit }: { win: HourWindow; onCommit: (w: HourWindow) => void }) {
  const start = useDraftValue(win.start, (v) => onCommit({ start: v, end: win.end }), identityTime);
  const end = useDraftValue(win.end, (v) => onCommit({ start: win.start, end: v }), identityTime);
  return (
    <span className={styles.windowCell}>
      <input
        type="time" aria-label="Jam mulai" className={styles.timeInput}
        value={start.value} onChange={start.onChange} onBlur={start.onBlur} onKeyDown={start.onKeyDown}
      />
      <span className={styles.windowDash}>–</span>
      <input
        type="time" aria-label="Jam selesai" className={styles.timeInput}
        value={end.value} onChange={end.onChange} onBlur={end.onBlur} onKeyDown={end.onKeyDown}
      />
    </span>
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
  hourlyData, hourlyTarget = {}, hourlyWindow = {}, editable = false,
  onTargetChange, onWindowChange, oee,
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
          const win = hourlyWindow[hour] ?? defaultWindow(hour);
          return (
            <tr key={hour}>
              <td>
                {editable && onWindowChange ? (
                  <WindowCell win={win} onCommit={(w) => onWindowChange(hour, w)} />
                ) : (
                  `${win.start}–${win.end}`
                )}
              </td>
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
