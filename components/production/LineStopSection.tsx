'use client';

import { useEffect, useState } from 'react';
import { ClockTimeInput } from '@/components/ui/ClockTimeInput';
import type { LineStop } from '@/lib/types';
import { stopDuration, stopLabel, formatDuration, hhmmNow } from '@/utils/lineStop';
import { WORKFLOW_CARDS, stationTitle } from '@/utils/workflowCards';
import type { StationId } from '@/utils/finishingFlow';
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
  const [countermeasure, setCountermeasure] = useState('');
  const [category, setCategory] = useState<LineStop['category']>('AV');
  const [station, setStation] = useState<StationId | ''>('');
  // duration of ongoing stops is measured against a ticking clock; null until
  // mounted so SSR and first paint don't disagree with the client's clock
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Jam selesai is optional: a stop is usually still running when it's logged.
  const canAdd = start !== '' && problem.trim() !== '';

  function add() {
    if (!canAdd) return;
    onChange([...stops, {
      start,
      ...(end ? { end } : {}),
      problem: problem.trim(), countermeasure: countermeasure.trim(), category,
      ...(category === 'AV' && station ? { station } : {}),
    }]);
    setStart('');
    setEnd('');
    setProblem('');
    setCountermeasure('');
    setCategory('AV');
    setStation('');
  }

  function remove(index: number) {
    onChange(stops.filter((_, i) => i !== index));
  }

  // Selesai: stamp the line stop's missing end with the clock right now —
  // the moment the operator closes the row is the moment the line ran again.
  function finish(index: number) {
    onChange(stops.map((s, i) => (i === index ? { ...s, end: hhmmNow() } : s)));
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.header}>Line Stop</h2>

      <div className={styles.form}>
        {/* Plain <div>, not <label>: ClockTimeInput renders several of its own
            buttons (trigger + every dial button), and a <label> wrapping more
            than one labelable descendant makes the browser synthesize an
            extra click on the first one (the trigger) whenever another is
            clicked — openPicker() firing again wiped the in-progress
            selection, the "jam/menit selalu mental" bug. ariaLabel on
            ClockTimeInput's own trigger already covers accessibility. */}
        <div className={styles.group}>
          <span className={styles.label}>Jam Mulai</span>
          <ClockTimeInput value={start} ariaLabel="Jam Mulai" onChange={setStart} />
        </div>
        <div className={styles.group}>
          <span className={styles.label}>Jam Selesai <em className={styles.optional}>(opsional)</em></span>
          <ClockTimeInput value={end} ariaLabel="Jam Selesai" onChange={setEnd} />
        </div>
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
          <span className={styles.label}>Countermeasure</span>
          <input
            className={styles.input}
            value={countermeasure}
            onChange={(e) => setCountermeasure(e.target.value)}
            placeholder="Countermeasure"
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
        {category === 'AV' && (
          <label className={styles.group}>
            <span className={styles.label}>Station</span>
            <select
              className={styles.select}
              value={station}
              onChange={(e) => setStation(e.target.value as StationId | '')}
            >
              <option value="">— Semua line —</option>
              {WORKFLOW_CARDS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
        )}
        <button type="button" className={styles.addBtn} onClick={add} disabled={!canAdd}>
          Tambah
        </button>
      </div>

      {stops.length === 0 ? (
        <div className={styles.empty}>Belum ada line stop</div>
      ) : (
        <div className={styles.list}>
          {stops.map((s, i) => (
            <div key={i} className={styles.row} data-ongoing={!s.end || undefined}>
              <span className={styles.rowTime}>{stopLabel(s)}</span>
              <span>({now ? formatDuration(stopDuration(s, now)) : '…'})</span>
              <span className={styles.rowProblem}>{s.problem}</span>
              <span className={styles.rowCountermeasure}>{s.countermeasure || '—'}</span>
              <span className={styles.badge}>{s.category}{s.station && ` · ${stationTitle(s.station)}`}</span>
              {!s.end && (
                <button
                  type="button"
                  className={styles.finishBtn}
                  onClick={() => finish(i)}
                  aria-label="Selesai line stop"
                  title="Catat jam selesai line stop dengan jam sekarang"
                >
                  Selesai
                </button>
              )}
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
