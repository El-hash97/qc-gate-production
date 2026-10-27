'use client';

import { useEffect, useState } from 'react';
import type { LineStop } from '@/lib/types';
import { formatDuration, stopLabel, stopDuration, totalLineStopMinutes } from '@/utils/lineStop';
import {
  RANGES, WINDOW_DAYS, dailyCounts, stopLevel, stopsInRange, type DatedStop,
} from '@/utils/stopHistory';
import { stationTitle } from '@/utils/workflowCards';
import styles from './LineStopDialog.module.css';

interface Props {
  // the station whose board was clicked (heads the pop-up)
  title?: string;
  // that station's stops of the last 30 days
  stops: readonly DatedStop[];
  // the stop going on now, if any
  active: LineStop | null;
  // the ticking clock: an ongoing stop (no end yet) is measured against it
  now: Date;
  onClose: () => void;
}

// "2026-10-20" → "20/10"
const shortDate = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

// Pop-up opened from a station board: that station's line stops over the last
// 7 / 14 / 30 days as a bar per day (with its date), then the stops themselves,
// newest first.
export function LineStopDialog({ title, stops, active, now, onClose }: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(WINDOW_DAYS);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const month = stopsInRange(stops, WINDOW_DAYS, now);
  const shift = stops.filter((s) => s.live).length;
  const level = stopLevel(shift);
  const shown = stopsInRange(stops, range, now);
  const days = dailyCounts(shown, range, now, now);
  const peak = Math.max(1, ...days.map((d) => d.count));
  const labelEvery = range <= 7 ? 1 : range <= 14 ? 2 : 5;
  const isNow = (s: DatedStop) => !!active && !!s.live && s.start === active.start && s.problem === active.problem;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.card} role="dialog" aria-label="Line stop details" onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2 className={styles.title}>{title ? `${title} · Line Stop` : 'Line Stop'}</h2>
          <span className={styles.level} data-level={level}>
            {shift}× this shift · {month.length}× / {WINDOW_DAYS} days
          </span>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>×</button>
        </header>

        <div className={styles.filter} role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={r === range} data-on={r === range || undefined}
              onClick={() => setRange(r)}>{r} days</button>
          ))}
          <span className={styles.sum}>
            {shown.length} stop · {formatDuration(totalLineStopMinutes([...shown], now))}
          </span>
        </div>

        <div className={styles.chart} role="img" aria-label={`Line stops per day, last ${range} days`}>
          <span className={styles.peak}>{peak}</span>
          {days.map((d, i) => (
            <div key={d.date} className={styles.day} data-testid="day" title={`${d.date} · ${d.count} stop · ${formatDuration(d.minutes)}`}>
              <div className={styles.col}>
                {d.count > 0 && <span className={styles.val}>{d.count}</span>}
                <span className={styles.bar} data-empty={d.count === 0 || undefined} style={{ height: `${(d.count / peak) * 100}%` }} />
              </div>
              <span className={styles.date}>{(days.length - 1 - i) % labelEvery === 0 ? shortDate(d.date) : ''}</span>
            </div>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className={styles.empty}>No line stop in the last {range} days</div>
        ) : (
          <ul className={styles.list}>
            {[...shown].reverse().map((s, i) => (
              <li key={i} className={styles.item} data-now={isNow(s) || undefined}>
                <div className={styles.top}>
                  <b>{stationTitle(s.station) ?? 'Whole line'}</b>
                  {isNow(s) && <span className={styles.now}>NOW</span>}
                  <span className={styles.cat}>{s.category}</span>
                </div>
                <div className={styles.time}>
                  {shortDate(s.date)} · {stopLabel(s)} · {formatDuration(stopDuration(s, now))}
                </div>
                <dl className={styles.facts}>
                  <div><dt>Problem</dt><dd>{s.problem}</dd></div>
                  <div><dt>Countermeasure</dt><dd>{s.countermeasure || '—'}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
