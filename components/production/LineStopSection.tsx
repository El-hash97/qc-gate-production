'use client';

import { useState } from 'react';
import type { LineStop } from '@/lib/types';
import { lineStopMinutes, formatDuration } from '@/utils/lineStop';
import styles from './LineStop.module.css';

const CATEGORIES: LineStop['category'][] = ['AV', 'PE', 'RQ'];

interface LineStopSectionProps {
  stops: LineStop[];
  onChange: (stops: LineStop[]) => void;
}

export function LineStopSection({ stops, onChange }: LineStopSectionProps) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [problem, setProblem] = useState('');
  const [category, setCategory] = useState<LineStop['category']>('AV');

  const canAdd = start !== '' && end !== '' && problem.trim() !== '';

  function add() {
    if (!canAdd) return;
    onChange([...stops, { start, end, problem: problem.trim(), category }]);
    setStart('');
    setEnd('');
    setProblem('');
    setCategory('AV');
  }

  function remove(index: number) {
    onChange(stops.filter((_, i) => i !== index));
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.header}>Line Stop</h2>

      <div className={styles.form}>
        <label className={styles.group}>
          <span className={styles.label}>Jam Mulai</span>
          <input type="time" className={styles.input} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className={styles.group}>
          <span className={styles.label}>Jam Selesai</span>
          <input type="time" className={styles.input} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label className={styles.group}>
          <span className={styles.label}>Keterangan</span>
          <input
            className={styles.input}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Problem line stop"
          />
        </label>
        <label className={styles.group}>
          <span className={styles.label}>Kategori</span>
          <select
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value as LineStop['category'])}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" className={styles.addBtn} onClick={add} disabled={!canAdd}>
          Tambah
        </button>
      </div>

      {stops.length === 0 ? (
        <div className={styles.empty}>Belum ada line stop</div>
      ) : (
        <div className={styles.list}>
          {stops.map((s, i) => (
            <div key={i} className={styles.row}>
              <span className={styles.rowTime}>{s.start}–{s.end}</span>
              <span>({formatDuration(lineStopMinutes(s.start, s.end))})</span>
              <span className={styles.rowProblem}>{s.problem}</span>
              <span className={styles.badge}>{s.category}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => remove(i)}
                aria-label="Hapus line stop"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
