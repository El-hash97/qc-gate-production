'use client';

import { useDraftValue } from '@/hooks/useDraftValue';
import type { HourWindow, ProductionState } from '@/lib/types';
import type { OeeBreakdown } from '@/utils/oee';
import { toPercent } from '@/utils/oee';
import styles from './HourlyTable.module.css';

interface HourlyTableProps {
  hourlyData: ProductionState['hourlyData'];
  // Actual worked window per hour, keyed "HH:00". An hour with no entry falls
  // back to the full clock hour (HH:00 -> HH+1:00).
  hourlyWindow?: Record<string, HourWindow>;
  // Per-hour plan (pcs), keyed "HH:00" — the pieces the worked window allows at
  // the cycle time, computed by the caller. Supplied only alongside `oee` (B/C);
  // the Plan and Actual columns show only when it's present.
  hourlyPlan?: Record<string, number>;
  // When true each row's time window is an editable field; otherwise it's shown
  // read-only (the "Semua" view).
  editable?: boolean;
  onWindowChange?: (hour: string, win: HourWindow) => void;
  // Per-hour OEE factors, keyed "HH:00". Supplied only for a view that has a
  // cycle time to measure against (B/C today); without it the Plan/Actual and
  // AV/PE/RQ/OEE columns aren't rendered at all.
  oee?: Record<string, OeeBreakdown>;
}

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

// Actual vs Plan for the hour: green on/above plan, amber within 10%, red below.
// A red cell here lines up with a lower AV that row — fewer pieces against the
// same capacity. Uncoloured when there's no plan for the hour.
function actualClass(actual: number, plan: number): string {
  if (plan <= 0) return '';
  if (actual >= plan) return styles.rateGood;
  if (actual >= plan * 0.9) return styles.rateWarn;
  return styles.rateBad;
}

function RateCell({ ratio }: { ratio: number }) {
  const percent = toPercent(ratio);
  return <td className={rateClass(percent)}>{percent}%</td>;
}

export function HourlyTable({
  hourlyData, hourlyWindow = {}, hourlyPlan = {}, editable = false, onWindowChange, oee,
}: HourlyTableProps) {
  const sortedHours = Object.keys(hourlyData).sort();

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Jam</th><th>OK</th><th>Repair</th><th>NG</th>
          {oee && <><th>Plan</th><th>Actual</th><th>AV</th><th>PE</th><th>RQ</th><th>OEE</th></>}
        </tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => {
          const factors = oee?.[hour];
          const win = hourlyWindow[hour] ?? defaultWindow(hour);
          const snap = hourlyData[hour];
          const actual = snap.ok + snap.repair + snap.ng;
          const plan = hourlyPlan[hour] ?? 0;
          return (
            <tr key={hour}>
              <td>
                {editable && onWindowChange ? (
                  <WindowCell win={win} onCommit={(w) => onWindowChange(hour, w)} />
                ) : (
                  `${win.start}–${win.end}`
                )}
              </td>
              <td>{snap.ok}</td>
              <td>{snap.repair}</td>
              <td>{snap.ng}</td>
              {oee && factors && (
                <>
                  <td>{plan || '—'}</td>
                  <td className={actualClass(actual, plan)}>{actual}</td>
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
