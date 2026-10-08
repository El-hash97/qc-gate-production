import type { DefectLineMapping, DefectProduct } from '@/lib/types';
import { suspectLinesFor } from '@/utils/defectLines';
import styles from './DefectRepairSummary.module.css';

interface DefectRepairSummaryProps {
  title: string;
  data: Record<string, number>;
  // Suspect Defect Line master data — when supplied, each row also shows
  // which fixed line(s) are likely the source, same matching the Pareto-by-line
  // chart uses. Omitted entirely when not passed (e.g. no mappings loaded).
  mappings?: DefectLineMapping[];
  // Scope the hints to one product's master data (see DefectProduct) —
  // omitted shows hints from all products, the "Semua" view.
  product?: DefectProduct;
}

export function DefectRepairSummary({ title, data, mappings, product }: DefectRepairSummaryProps) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className={styles.title}>{title}</div>
      {sorted.length === 0 ? (
        <div className={styles.empty}>Belum ada data</div>
      ) : (
        sorted.map(([name, count]) => {
          const lines = mappings ? suspectLinesFor(name, mappings, product) : [];
          return (
            <div key={name} className={styles.item}>
              <span className={styles.nameCol}>
                <span>{name}</span>
                {lines.length > 0 && <span className={styles.lineHint}>{lines.join(', ')}</span>}
              </span>
              <span className={styles.count}>{count}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
