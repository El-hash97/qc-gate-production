import { findPic } from '@/utils/constants';
import styles from './PicCard.module.css';

// "Shift Red" -> "Red Shift"
function shiftCaption(shift: string) {
  return `${shift.replace('Shift ', '')} Shift`;
}

export function PicCard({ pic }: { pic: string }) {
  const selected = findPic(pic);
  if (!selected) return null;

  return (
    <div className={styles.card}>
      <img className={styles.photo} src={selected.photo} alt={selected.name} />
      <div className={styles.meta}>
        <span className={styles.name}>{selected.name}</span>
        <span className={styles.role}>Group Leader</span>
        <span className={styles.shift}>{shiftCaption(selected.shift)}</span>
      </div>
    </div>
  );
}
