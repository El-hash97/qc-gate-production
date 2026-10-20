'use client';

import { useEffect } from 'react';
import type { LineStop } from '@/lib/types';
import { formatDuration, stopLabel, stopDuration, totalLineStopMinutes } from '@/utils/lineStop';
import { stationTitle } from '@/utils/workflowCards';
import styles from './LineStopDialog.module.css';

interface Props {
  // the station whose board was clicked (heads the pop-up)
  title?: string;
  stops: readonly LineStop[];
  // the stop going on now, if any
  active: LineStop | null;
  // the ticking clock: an ongoing stop (no end yet) is measured against it
  now: Date;
  onClose: () => void;
}

// Pop-up opened from a station board that carries line stops: that station's stops, newest
// first, with the station name.
export function LineStopDialog({ title, stops, active, now, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.card} role="dialog" aria-label="Line stop details" onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2 className={styles.title}>{title ? `${title} · Line Stop` : 'Line Stop'}</h2>
          <span className={styles.sum}>
            {stops.length} stop · {formatDuration(totalLineStopMinutes([...stops], now))}
          </span>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>×</button>
        </header>
        {stops.length === 0 ? (
          <div className={styles.empty}>No line stop yet</div>
        ) : (
          <ul className={styles.list}>
            {[...stops].reverse().map((s, i) => (
              <li key={i} className={styles.item} data-now={s === active || undefined}>
                <div className={styles.top}>
                  <b>{stationTitle(s.station) ?? 'Whole line'}</b>
                  {s === active && <span className={styles.now}>NOW</span>}
                  <span className={styles.cat}>{s.category}</span>
                </div>
                <div className={styles.time}>
                  {stopLabel(s)} · {formatDuration(stopDuration(s, now))}
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
