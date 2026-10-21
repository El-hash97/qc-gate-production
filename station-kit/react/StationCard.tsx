'use client';

import { useEffect, useState } from 'react';
import styles from './StationCard.module.css';

// Self-contained so the folder can be copied to another site: React + CSS modules only.
export type Theme = 'light' | 'dark';

export interface StationDetail {
  title: string;
  subtitle: string;
  // isometric figure per theme (station-kit/figure)
  image: { light: string; dark: string };
  // the same figure running its cycle (station-kit/figure, <id>-live.html), shown in place of the image
  live?: string;
  // interactive 3D machine page (station-kit/machine), opened by Play
  play?: string;
  // real-footage mp4 (served from /public/videos), played in place of the figure by the Play video button
  video?: string;
  description: string[];
  // running count shown as a bar above the specs: turns amber at `warnAt` and red at `max`
  meter?: { label: string; value: number; max: number; warnAt: number; unit: string; onReset?: () => void };
  specs: { label: string; value: string }[];
}

interface Props {
  detail: StationDetail;
  theme: Theme;
  onClose: () => void;
}

function Meter({ label, value, max, warnAt, unit, onReset }: NonNullable<StationDetail['meter']>) {
  const level = value >= max ? 'danger' : value >= warnAt ? 'warn' : 'ok';
  const n = (v: number) => v.toLocaleString('en-US');
  return (
    <div className={styles.meter} data-level={level}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <b>{n(value)} / {n(max)} {unit}</b>
        {onReset && <button type="button" className={styles.meterReset} onClick={onReset}>Reset</button>}
      </div>
      <div className={styles.meterTrack} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className={styles.meterFill} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
        <i className={styles.meterTick} style={{ left: `${(warnAt / max) * 100}%` }} />
      </div>
      {level !== 'ok' && (
        <div className={styles.meterNote}>
          {level === 'warn' ? `${n(max - value)} ${unit} to the limit — a part may be damaged, inspect it` : 'Over the limit — inspect for a worn or broken part'}
        </div>
      )}
    </div>
  );
}

// Detail card for one station: its isometric figure (or, after Play, its 3D machine)
// beside the process description. Renders as an overlay filling its positioned parent.
export function StationCard({ detail, theme, onClose }: Props) {
  // what fills the figure area: the picture, the 3D machine or the real video
  const [mode, setMode] = useState<'picture' | '3d' | 'video'>('picture');
  const toggle = (m: '3d' | 'video') => setMode((cur) => (cur === m ? 'picture' : m));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} data-testid="station-card-backdrop" onClick={onClose}>
      <div
        className={styles.card}
        data-playing={mode !== 'picture' || undefined}
        role="dialog"
        aria-modal="true"
        aria-label={`${detail.title} ${detail.subtitle}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.media}>
          <div className={styles.figure} data-theme={theme}>
            {mode === 'video' && detail.video ? (
              // preload none: the file is fetched only once Play video is pressed
              <video className={styles.video} src={detail.video} controls autoPlay playsInline preload="none" title={`${detail.title} video`} />
            ) : mode === '3d' && detail.play ? (
              <iframe className={styles.machine} src={detail.play} title={`${detail.title} 3D`} allow="fullscreen" />
            ) : detail.live ? (
              <iframe className={styles.live} src={`${detail.live}?theme=${theme}`} title={`${detail.title} ${detail.subtitle} cycle`} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- static SVG per theme
              <img src={detail.image[theme]} alt={`${detail.title} ${detail.subtitle}`} />
            )}
          </div>
          {(detail.play || detail.video) && (
            <div className={styles.actions}>
              {detail.play && (
                <button type="button" className={styles.play} onClick={() => toggle('3d')}>
                  {mode === '3d' ? '◼ Back to picture' : '▶ Play 3D'}
                </button>
              )}
              {detail.video && (
                <button type="button" className={styles.play} onClick={() => toggle('video')}>
                  {mode === 'video' ? '◼ Back to picture' : '▶ Play video'}
                </button>
              )}
            </div>
          )}
        </div>
        <div className={styles.text}>
          <div className={styles.head}>
            <div>
              <div className={styles.title}>{detail.title}</div>
              <div className={styles.subtitle}>{detail.subtitle}</div>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          {detail.description.map((para) => (
            <p key={para} className={styles.para}>{para}</p>
          ))}
          {detail.meter && <Meter {...detail.meter} />}
          <dl className={styles.specs}>
            {detail.specs.map((spec) => (
              <div key={spec.label} className={styles.spec}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
