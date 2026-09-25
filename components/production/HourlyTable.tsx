'use client';

import { ClockTimeInput } from '@/components/ui/ClockTimeInput';
import type { HourWindow, LineStop, ProductionState } from '@/lib/types';
import type { OeeBreakdown } from '@/utils/oee';
import { toPercent } from '@/utils/oee';
import { sortHourKeys } from '@/utils/hourOrder';
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
  // Line stops overlapping each hour (see utils/oee.ts's lineStopsByHour),
  // keyed "HH:00" — feeds the Item Problem / Countermeasure columns, shown
  // on every view regardless of `oee`.
  lineStopsByHour?: Record<string, LineStop[]>;
  // When true each row's time window is an editable field; otherwise it's shown
  // read-only (the "Semua" view).
  editable?: boolean;
  onWindowChange?: (hour: string, win: HourWindow) => void;
  // Which hour (if any) manual OK/Repair/NG input is currently redirected to.
  pinnedHour?: string;
  // Toggles a row's hour as the pin target — only rendered when `editable` is
  // true (same gate as the Jam-window clock picker).
  onPinHour?: (hour: string) => void;
  // Per-hour OEE factors, keyed "HH:00". Supplied only for a view that has a
  // cycle time to measure against (B/C today); without it the Plan/Actual and
  // AV/PE/RQ/OEE columns aren't rendered at all.
  oee?: Record<string, OeeBreakdown>;
}

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
// Each is a circular clock picker (24h, no AM/PM) rather than a native time
// input — it only calls onChange once, when OK is pressed, so there's no
// half-edited value for the background poll to yank back mid-pick.
function WindowCell({ win, onCommit }: { win: HourWindow; onCommit: (w: HourWindow) => void }) {
  return (
    <span className={styles.windowCell}>
      <ClockTimeInput
        value={win.start} ariaLabel="Jam mulai"
        onChange={(v) => onCommit({ start: v, end: win.end })}
      />
      <span className={styles.windowDash}>–</span>
      <ClockTimeInput
        value={win.end} ariaLabel="Jam selesai"
        onChange={(v) => onCommit({ start: win.start, end: v })}
      />
    </span>
  );
}

// Small map-pin glyph for the manual-input toggle — inherits colour from the
// button via currentColor, same convention as TopNav's gear/person icons.
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.5" fill="currentColor" />
    </svg>
  );
}

// "A; B" from every stop's problem (or countermeasure) in the hour, "—" for
// an hour with none. Index-aligned across the two columns, so the Nth problem
// and Nth countermeasure describe the same stop.
function stopsText(stops: LineStop[], field: 'problem' | 'countermeasure'): string {
  if (stops.length === 0) return '—';
  return stops.map((s) => (field === 'problem' ? s.problem : s.countermeasure || '—')).join('; ');
}

// Green from 85%, amber from 60%, red below — a glance down the column shows
// which hour cost the shift its OEE.
function rateClass(percent: number): string {
  if (percent >= 85) return styles.rateGood;
  if (percent >= 60) return styles.rateWarn;
  return styles.rateBad;
}

// Actual vs Plan for the hour: green on/above plan, amber within 10%, red below.
// Uncoloured when there's no plan for the hour. AV no longer follows this
// comparison (it's driven by AV line stops now, see utils/oee.ts) — a missed
// Plan shows up only here, as the colour plus the percentage in the cell text
// below, not by pulling the AV column down too.
function actualClass(actual: number, plan: number): string {
  if (plan <= 0) return '';
  if (actual >= plan) return styles.rateGood;
  if (actual >= plan * 0.9) return styles.rateWarn;
  return styles.rateBad;
}

// "45" when the hour met (or has no) Plan; "45 / 63%" when it fell short, so
// the shortfall is visible right in this cell without a dedicated column.
function actualCellText(actual: number, plan: number): string {
  if (plan <= 0 || actual >= plan) return String(actual);
  return `${actual} / ${Math.round((actual / plan) * 100)}%`;
}

// Actual − Plan, signed like the whiteboard's Balance column: "-32" short,
// "+8" over, "0" exactly on Plan, "—" when the hour has no Plan.
function BalanceCell({ actual, plan }: { actual: number; plan: number }) {
  if (plan <= 0) return <td>—</td>;
  const balance = actual - plan;
  const className = balance < 0 ? styles.rateBad : balance > 0 ? styles.rateGood : '';
  return <td className={className}>{balance > 0 ? `+${balance}` : balance}</td>;
}

function RateCell({ ratio }: { ratio: number }) {
  const percent = toPercent(ratio);
  return <td className={rateClass(percent)}>{percent}%</td>;
}

export function HourlyTable({
  hourlyData, hourlyWindow = {}, hourlyPlan = {}, lineStopsByHour = {},
  editable = false, onWindowChange, pinnedHour, onPinHour, oee,
}: HourlyTableProps) {
  const sortedHours = sortHourKeys(Object.keys(hourlyData));

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Jam</th><th>OK</th><th>Repair</th><th>NG</th>
          {oee && <><th>Plan</th><th>Actual</th><th>Balance</th><th>AV</th><th>PE</th><th>RQ</th><th>OEE</th></>}
          <th>Item Problem</th><th>Countermeasure</th>
        </tr>
      </thead>
      <tbody>
        {sortedHours.map((hour) => {
          const factors = oee?.[hour];
          const win = hourlyWindow[hour] ?? defaultWindow(hour);
          const snap = hourlyData[hour];
          const actual = snap.ok + snap.repair + snap.ng;
          const plan = hourlyPlan[hour] ?? 0;
          const stops = lineStopsByHour[hour] ?? [];
          const pinned = hour === pinnedHour;
          return (
            <tr key={hour}>
              <td>
                <span className={styles.jamCell}>
                  {editable && onWindowChange ? (
                    <WindowCell win={win} onCommit={(w) => onWindowChange(hour, w)} />
                  ) : (
                    `${win.start}–${win.end}`
                  )}
                  {editable && onPinHour && (
                    <button
                      type="button"
                      className={pinned ? styles.pinButtonActive : styles.pinButton}
                      aria-label={pinned ? `Matikan input manual ke jam ${hour}` : `Arahkan input manual ke jam ${hour}`}
                      aria-pressed={pinned}
                      onClick={() => onPinHour(hour)}
                    >
                      <PinIcon />
                    </button>
                  )}
                </span>
              </td>
              <td>{snap.ok}</td>
              <td>{snap.repair}</td>
              <td>{snap.ng}</td>
              {oee && factors && (
                <>
                  <td>{plan || '—'}</td>
                  <td className={actualClass(actual, plan)}>{actualCellText(actual, plan)}</td>
                  <BalanceCell actual={actual} plan={plan} />
                  <RateCell ratio={factors.av} />
                  <RateCell ratio={factors.pe} />
                  <RateCell ratio={factors.rq} />
                  <RateCell ratio={factors.oee} />
                </>
              )}
              <td>{stopsText(stops, 'problem')}</td>
              <td>{stopsText(stops, 'countermeasure')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
