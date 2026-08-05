import styles from './DefectRepairSummary.module.css';

interface DefectRepairSummaryProps {
  title: string;
  data: Record<string, number>;
}

export function DefectRepairSummary({ title, data }: DefectRepairSummaryProps) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className={styles.title}>{title}</div>
      {sorted.length === 0 ? (
        <div className={styles.empty}>Belum ada data</div>
      ) : (
        sorted.map(([name, count]) => (
          <div key={name} className={styles.item}>
            <span>{name}</span>
            <span className={styles.count}>{count}</span>
          </div>
        ))
      )}
    </div>
  );
}
