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
  // interactive 3D machine page (station-kit/machine), opened by Play
  play?: string;
  description: string[];
  specs: { label: string; value: string }[];
}

interface Props {
  detail: StationDetail;
  theme: Theme;
  onClose: () => void;
}

// Detail card for one station: its isometric figure (or, after Play, its 3D machine)
// beside the process description. Renders as an overlay filling its positioned parent.
export function StationCard({ detail, theme, onClose }: Props) {
  const [playing, setPlaying] = useState(false);
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
        data-playing={playing || undefined}
        role="dialog"
        aria-modal="true"
        aria-label={`${detail.title} ${detail.subtitle}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.media}>
          <div className={styles.figure}>
            {playing && detail.play ? (
              <iframe className={styles.machine} src={detail.play} title={`${detail.title} 3D`} allow="fullscreen" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- static SVG per theme
              <img src={detail.image[theme]} alt={`${detail.title} ${detail.subtitle}`} />
            )}
          </div>
          {detail.play && (
            <button type="button" className={styles.play} onClick={() => setPlaying((p) => !p)}>
              {playing ? '◼ Kembali ke gambar' : '▶ Play 3D'}
            </button>
          )}
        </div>
        <div className={styles.text}>
          <div className={styles.head}>
            <div>
              <div className={styles.title}>{detail.title}</div>
              <div className={styles.subtitle}>{detail.subtitle}</div>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Tutup">
              ×
            </button>
          </div>
          {detail.description.map((para) => (
            <p key={para} className={styles.para}>{para}</p>
          ))}
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
