'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { PanelData } from '@/utils/visualPanels';
import { WORKFLOW_CARDS } from '@/utils/workflowCards';
import { SEGMENTS, segmentSeconds, type StationId } from '@/utils/finishingFlow';
import styles from './VisualPanels.module.css';

// Glass panels floating over the 3D line. Every panel can be folded (–) or
// hidden (×); the settings menu brings them back and H hides/shows all of them
// (the 3D pins included).
// The choice is a per-screen preference, kept in localStorage.
export const PANELS = [
  { id: 'kpi', title: 'KPI' },
  { id: 'progress', title: 'Progress produksi' },
  { id: 'workflow', title: 'Workflow' },
  { id: 'judgement', title: 'Judgement QC Gate 2' },
  { id: 'pareto', title: 'Pareto' },
  { id: 'hourly', title: 'Output per jam' },
  { id: 'health', title: 'Kesehatan line' },
  { id: 'alerts', title: 'Alert terbaru' },
  // callouts on the 3D objects, drawn by FinishingLine3D
  { id: 'pins', title: 'Pin 3D' },
] as const;
type PanelId = (typeof PANELS)[number]['id'];
type Mode = 'open' | 'folded' | 'hidden';

const STORE = 'visualisasi.panels';

export function usePanelModes() {
  const [modes, setModes] = useState<Partial<Record<PanelId, Mode>>>({});
  const [allHidden, setAllHidden] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}');
      setModes(saved.modes ?? {});
      setAllHidden(!!saved.allHidden);
    } catch { /* private window / blocked storage: everything shows */ }
  }, []);
  const save = (next: Partial<Record<PanelId, Mode>>, hidden: boolean) => {
    setModes(next);
    setAllHidden(hidden);
    try { localStorage.setItem(STORE, JSON.stringify({ modes: next, allHidden: hidden })); } catch { /* ignore */ }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== 'h' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      save(modes, !allHidden);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const mode = (id: PanelId): Mode => (allHidden ? 'hidden' : modes[id] ?? 'open');
  const set = (id: PanelId, m: Mode) => save({ ...modes, [id]: m }, false);
  const setAll = (m: Mode) => save(Object.fromEntries(PANELS.map((p) => [p.id, m])), false);
  return { mode, set, setAll, allHidden };
}
export type PanelModes = ReturnType<typeof usePanelModes>;

function Panel({ id, title, mode, onMode, extra, children }: {
  id: PanelId; title: string; mode: Mode; onMode: (m: Mode) => void; extra?: ReactNode; children: ReactNode;
}) {
  if (mode === 'hidden') return null;
  const folded = mode === 'folded';
  return (
    <section className={styles.panel} data-folded={folded || undefined} aria-label={title} data-panel={id}>
      <header className={styles.head}>
        <span className={styles.title}>{title}</span>
        {extra}
        <button type="button" className={styles.icon} aria-label={folded ? `Buka ${title}` : `Lipat ${title}`}
          onClick={() => onMode(folded ? 'open' : 'folded')}>{folded ? '+' : '–'}</button>
        <button type="button" className={styles.icon} aria-label={`Sembunyikan ${title}`}
          onClick={() => onMode('hidden')}>×</button>
      </header>
      {!folded && <div className={styles.body}>{children}</div>}
    </section>
  );
}

const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);
const fmt = (n: number) => n.toLocaleString('id-ID');
const clock = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

interface Props {
  data: PanelData;
  running: boolean;
  // live "a block is in this station segment" flags from the 3D sim
  busy: readonly boolean[];
  now: Date;
  onSelectStation: (id: StationId) => void;
  panels: PanelModes;
}

export function VisualPanels({ data, running, busy, now, onSelectStation, panels }: Props) {
  const { mode, set, setAll, allHidden } = panels;
  const [menu, setMenu] = useState(false);
  const [paretoTab, setParetoTab] = useState<'ng' | 'repair'>('ng');
  const p = (id: PanelId) => ({ id, title: PANELS.find((x) => x.id === id)!.title, mode: mode(id), onMode: (m: Mode) => set(id, m) });
  const d = data;
  const rows = paretoTab === 'ng' ? d.topNg : d.topRepair;
  const maxHour = Math.max(1, ...d.hourly.map((h) => Math.max(h.produced, h.plan)));
  const current = d.hourly.find((h) => h.hour === d.currentHour);

  return (
    <div className={styles.overlay}>
      <div className={styles.menuWrap}>
        <button type="button" className={styles.menuButton} aria-expanded={menu} aria-label="Pengaturan panel"
          title="Pengaturan panel" data-hidden={allHidden || undefined} onClick={() => setMenu((v) => !v)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {menu && (
          <div className={styles.menu} role="menu">
            {PANELS.map(({ id, title }) => (
              <label key={id} className={styles.menuItem}>
                <input type="checkbox" checked={mode(id) !== 'hidden'}
                  onChange={(e) => set(id, e.target.checked ? 'open' : 'hidden')} />
                {title}
              </label>
            ))}
            <div className={styles.menuRow}>
              <button type="button" onClick={() => setAll('open')}>Tampilkan semua</button>
              <button type="button" onClick={() => setAll('hidden')}>Sembunyikan semua</button>
            </div>
            <div className={styles.hint}>Tekan H untuk sembunyikan / tampilkan semua</div>
          </div>
        )}
      </div>

      {mode('kpi') !== 'hidden' && (
        <div className={styles.kpis} aria-label="KPI">
          {([
            ['Total BC', fmt(d.total), `target ${fmt(d.target)}`, ''],
            ['OK', fmt(d.ok), `${pct(d.ok, d.total).toFixed(1)}%`, styles.ok],
            ['Repair', fmt(d.repair), `${pct(d.repair, d.total).toFixed(1)}%`, styles.repair],
            ['NG', fmt(d.ng), `${pct(d.ng, d.total).toFixed(1)}%`, styles.ng],
            ['Achievement', `${d.achievement}%`, 'vs target BC', ''],
            ['OEE', `${Math.round(d.oee.oee * 100)}%`, 'shift', ''],
          ] as const).map(([label, value, sub, tone]) => (
            <div key={label} className={styles.kpi}>
              <span className={styles.kpiLabel}>{label}</span>
              <span className={`${styles.kpiValue} ${tone}`}>{value}</span>
              <span className={styles.kpiSub}>{sub}</span>
            </div>
          ))}
          <button type="button" className={styles.icon} aria-label="Sembunyikan KPI" onClick={() => set('kpi', 'hidden')}>×</button>
        </div>
      )}

      <div className={styles.left}>
        <Panel {...p('progress')}>
          <div className={styles.big}>{fmt(d.total)}<small> / {fmt(d.target)} unit</small></div>
          <div className={styles.track}><span style={{ width: `${Math.min(d.achievement, 100)}%` }} /></div>
          <dl className={styles.facts}>
            <div><dt>Sisa</dt><dd>{fmt(d.remaining)} unit</dd></div>
            <div><dt>Perkiraan selesai</dt><dd>{d.etaMin === null ? '–' : clock(new Date(now.getTime() + d.etaMin * 60_000))}</dd></div>
            <div><dt>Jam ini</dt><dd>{current ? `${current.produced} / ${current.plan}` : '–'}</dd></div>
          </dl>
        </Panel>
        <Panel {...p('workflow')}>
          <ol className={styles.steps}>
            {WORKFLOW_CARDS.map((card, i) => {
              const seg = card.segment;
              const state = !running ? 'stopped' : seg !== undefined && busy[seg] ? 'busy' : seg !== undefined ? 'wait' : 'run';
              return (
                <li key={card.id}>
                  <button type="button" className={styles.step} onClick={() => onSelectStation(card.id)}>
                    <span className={styles.stepNo}>{i + 1}</span>
                    <span className={styles.stepName}>{card.title}</span>
                    {seg !== undefined && <span className={styles.stepCt}>{segmentSeconds(SEGMENTS[seg]).toFixed(1)} s</span>}
                    <span className={styles.dot} data-state={state} title={state} />
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <div className={styles.right}>
        <Panel {...p('judgement')}>
          <div className={styles.big}>{fmt(d.total)}<small> diperiksa</small></div>
          <div className={styles.stack}>
            <span className={styles.okBg} style={{ flexGrow: d.ok }} />
            <span className={styles.repairBg} style={{ flexGrow: d.repair }} />
            <span className={styles.ngBg} style={{ flexGrow: d.ng }} />
          </div>
          <ul className={styles.legend}>
            <li><i className={styles.okBg} />OK<b>{fmt(d.ok)}</b><em>{pct(d.ok, d.total).toFixed(1)}%</em></li>
            <li><i className={styles.repairBg} />Repair<b>{fmt(d.repair)}</b><em>{pct(d.repair, d.total).toFixed(1)}%</em></li>
            <li><i className={styles.ngBg} />NG<b>{fmt(d.ng)}</b><em>{pct(d.ng, d.total).toFixed(1)}%</em></li>
          </ul>
        </Panel>
        <Panel {...p('pareto')} extra={(
          <div className={styles.tabs} role="tablist">
            {(['ng', 'repair'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={paretoTab === t} onClick={() => setParetoTab(t)}>
                {t === 'ng' ? 'NG' : 'Repair'}
              </button>
            ))}
          </div>
        )}>
          {rows.length === 0 ? <div className={styles.empty}>Belum ada data</div> : (
            <ul className={styles.bars}>
              {rows.map((r) => (
                <li key={r.label}>
                  <span className={styles.barLabel} title={r.label}>{r.label}</span>
                  <span className={styles.barTrack}>
                    <span className={paretoTab === 'ng' ? styles.ngBg : styles.repairBg} style={{ width: `${pct(r.count, rows[0].count)}%` }} />
                  </span>
                  <b>{r.count}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className={styles.bottom}>
        <Panel {...p('hourly')}>
          <div className={styles.hours}>
            {d.hourly.map((h) => (
              <div key={h.hour} className={styles.hour} data-now={h.hour === d.currentHour || undefined}
                title={`${h.hour}: ${h.produced} / plan ${h.plan}`}>
                <div className={styles.hourCol}>
                  <span className={styles.hourBar} style={{ height: `${pct(h.produced, maxHour)}%` }} />
                  <span className={styles.hourPlan} style={{ bottom: `${pct(h.plan, maxHour)}%` }} />
                </div>
                <span className={styles.hourLabel}>{h.hour.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel {...p('health')}>
          <div className={styles.healthRow}>
            <div className={styles.big}>{Math.round(d.oee.oee * 100)}%<small> OEE</small></div>
            <ul className={styles.factors}>
              {([['AV', d.oee.av], ['PE', d.oee.pe], ['RQ', d.oee.rq]] as const).map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span className={styles.barTrack}><span className={styles.okBg} style={{ width: `${v * 100}%` }} /></span>
                  <b>{Math.round(v * 100)}%</b>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.kpiSub}>
            Line stop: AV {d.stopMin.AV} mnt · PE {d.stopMin.PE} mnt · RQ {d.stopMin.RQ} mnt
          </div>
        </Panel>
        <Panel {...p('alerts')}>
          {d.recent.length === 0 && !d.lastStop ? <div className={styles.empty}>Belum ada alert</div> : (
            <ul className={styles.alerts}>
              {d.lastStop && (
                <li data-kind="stop">
                  <span className={styles.alertIcon}>■</span>
                  <span className={styles.alertText}>Line stop {d.lastStop.start}–{d.lastStop.end} · {d.lastStop.problem}</span>
                  <b>{d.lastStop.category}</b>
                </li>
              )}
              {d.recent.map((log, i) => (
                <li key={i} data-kind={log.kind}>
                  <span className={styles.alertIcon}>▲</span>
                  <span className={styles.alertText}>
                    {log.kind === 'defect' ? 'NG' : 'Repair'} · {log.type} · Lot {log.lot} / Flask {log.flask}
                  </span>
                  <b>{log.qty}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
