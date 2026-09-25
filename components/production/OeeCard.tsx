import type { OeeBreakdown } from '@/utils/oee';
import { formatCycleTime, hourCapacity, toPercent } from '@/utils/oee';
import styles from './OeeCard.module.css';

// A 270° gauge: the ring is drawn as a dashed circle rotated so its gap sits at
// the bottom. Three quarters of the circumference is the full sweep, and the
// value arc is that sweep times the ratio.
const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SWEEP = CIRCUMFERENCE * 0.75;

// Same reading as the AV/PE/RQ columns in the Hourly table.
function tone(percent: number): string {
  if (percent >= 85) return styles.good;
  if (percent >= 60) return styles.warn;
  return styles.bad;
}

interface OeeCardProps {
  oee: OeeBreakdown;
  // Seconds per piece, shown as the caption so the basis of AV is never a
  // mystery number.
  cycleTime: number;
  // For the "Semua" view the OEE is combined (BC+Cam+Crank) — show total pcs/jam instead of single-product CT.
  captionOverride?: string;
}

export function OeeCard({ oee, cycleTime, captionOverride }: OeeCardProps) {
  const percent = toPercent(oee.oee);
  const factors = [
    { label: 'AV', value: toPercent(oee.av) },
    { label: 'PE', value: toPercent(oee.pe) },
    { label: 'RQ', value: toPercent(oee.rq) },
  ];

  return (
    <div className={styles.card} role="group" aria-label="Ringkasan OEE">
      <div className={styles.gaugeWrap}>
        <svg className={styles.gauge} viewBox="0 0 120 120" role="img" aria-label={`OEE ${percent} persen`}>
          <g transform="rotate(135 60 60)">
            <circle
              className={styles.track}
              cx="60" cy="60" r={RADIUS}
              strokeDasharray={`${SWEEP} ${CIRCUMFERENCE}`}
            />
            <circle
              className={`${styles.value} ${tone(percent)}`}
              cx="60" cy="60" r={RADIUS}
              strokeDasharray={`${SWEEP * (percent / 100)} ${CIRCUMFERENCE}`}
            />
          </g>
        </svg>
        <div className={styles.gaugeCenter}>
          <span className={`${styles.gaugeValue} ${tone(percent)}`}>{percent}%</span>
          <span className={styles.gaugeLabel}>OEE</span>
        </div>
      </div>

      <div className={styles.factors}>
        {factors.map((factor) => (
          <div className={styles.factor} key={factor.label}>
            <span className={styles.factorLabel}>{factor.label}</span>
            <span className={`${styles.factorValue} ${tone(factor.value)}`}>{factor.value}%</span>
          </div>
        ))}
      </div>

      {(() => {
        const text = captionOverride ?? `CT ${formatCycleTime(cycleTime)} dtk \u00B7 ${Math.round(hourCapacity(cycleTime))} pcs/jam`;
        return text ? <div className={styles.caption}>{text}</div> : null;
      })()}
    </div>
  );
}
