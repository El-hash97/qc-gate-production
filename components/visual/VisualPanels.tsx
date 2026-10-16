'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shouldPausePoll } from '@/hooks/useProductionState';
import type { PanelData } from '@/utils/visualPanels';
import { WORKFLOW_CARDS } from '@/utils/workflowCards';
import { SEGMENTS, segmentSeconds, type StationId } from '@/utils/finishingFlow';
import { PINS, type PinId } from '@/utils/stationPinData';
import styles from './VisualPanels.module.css';

// Glass panels floating over the 3D line. Every panel can be folded (–) or
// hidden (×). The settings menu has three switches — the panels, the 3D pins
// and the station name tags — and H hides/shows all of it.
export const PANELS = [
  { id: 'kpi', title: 'KPI' },
  { id: 'progress', title: 'Production progress' },
  { id: 'workflow', title: 'Workflow' },
  { id: 'judgement', title: 'Judgement QC Gate 2' },
  { id: 'paretoNg', title: 'NG Pareto' },
  { id: 'paretoRepair', title: 'Repair Pareto' },
  { id: 'hourly', title: 'Hourly output' },
  { id: 'health', title: 'Line health' },
  { id: 'alerts', title: 'Latest alerts' },
] as const;
// a panel, or one of the two 3D layers FinishingLine3D draws
type PanelId = (typeof PANELS)[number]['id'] | 'pins' | 'labels';
type Mode = 'open' | 'folded' | 'hidden';

type Modes = Partial<Record<PanelId, Mode>>;

// The layout is shared by every screen (database, /api/display-settings):
// whatever the logged-in user hides here is hidden on the TVs too.
const SETTINGS_KEY = ['displaySettings', 'overview'] as const;
const SETTINGS_URL = '/api/display-settings/overview';
const POLL_MS = 5000;
// after a save, hold the poll so a lagging read can't bounce the toggle back
const GRACE_MS = 3000;

async function fetchModes(): Promise<Modes> {
  const json = await (await fetch(SETTINGS_URL)).json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load display settings');
  return json.data?.modes ?? {};
}

async function putModes(modes: Modes): Promise<void> {
  const json = await (await fetch(SETTINGS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modes }),
  })).json();
  if (!json.success) throw new Error(json.error ?? 'Failed to save display settings');
}

// `readOnly` (guests): the layout the logged-in user set up, with no way to
// change it. H (hide everything) is a per-screen, unsaved shortcut, so
// pressing it on one screen never blanks the others.
export function usePanelModes(readOnly = false) {
  const queryClient = useQueryClient();
  const pending = useIsMutating({ mutationKey: SETTINGS_KEY });
  const [grace, setGrace] = useState(false);
  const { data: modes = {} } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchModes,
    refetchInterval: shouldPausePoll(pending, grace) ? false : POLL_MS,
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationKey: SETTINGS_KEY,
    mutationFn: putModes,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = queryClient.getQueryData<Modes>(SETTINGS_KEY);
      queryClient.setQueryData(SETTINGS_KEY, next);
      return { previous };
    },
    onError: (_err, _next, context) => {
      if (context) queryClient.setQueryData(SETTINGS_KEY, context.previous);
    },
    onSuccess: () => {
      setGrace(true);
      setTimeout(() => {
        setGrace(false);
        queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      }, GRACE_MS);
    },
  });
  const [allHidden, setAllHidden] = useState(false);
  const save = (next: Modes) => {
    setAllHidden(false);
    mutation.mutate(next);
  };
  useEffect(() => {
    if (readOnly) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== 'h' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      setAllHidden((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly]);
  const mode = (id: PanelId): Mode => (allHidden ? 'hidden' : modes[id] ?? 'open');
  const set = (id: PanelId, m: Mode) => save({ ...modes, [id]: m });
  const setAll = (m: Mode) => save({ ...modes, ...Object.fromEntries(PANELS.map((p) => [p.id, m])) });
  const shownPins = (): PinId[] => (mode('pins') === 'hidden' ? [] : PINS.map((p) => p.id));
  return { mode, set, setAll, allHidden, shownPins, readOnly };
}
export type PanelModes = ReturnType<typeof usePanelModes>;

function Panel({ id, title, mode, onMode, readOnly, extra, children }: {
  id: PanelId; title: string; mode: Mode; onMode: (m: Mode) => void; readOnly: boolean; extra?: ReactNode; children: ReactNode;
}) {
  if (mode === 'hidden') return null;
  const folded = mode === 'folded';
  return (
    <section className={styles.panel} data-folded={folded || undefined} aria-label={title} data-panel={id}>
      <header className={styles.head}>
        <span className={styles.title}>{title}</span>
        {extra}
        {!readOnly && (
          <>
            <button type="button" className={styles.icon} aria-label={folded ? `Expand ${title}` : `Collapse ${title}`}
              onClick={() => onMode(folded ? 'open' : 'folded')}>{folded ? '+' : '–'}</button>
            <button type="button" className={styles.icon} aria-label={`Hide ${title}`}
              onClick={() => onMode('hidden')}>×</button>
          </>
        )}
      </header>
      {!folded && <div className={styles.body}>{children}</div>}
    </section>
  );
}

const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);
const fmt = (n: number) => n.toLocaleString('en-US');
const clock = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

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
  const toggles = [
    { label: 'Panels', on: PANELS.some((x) => mode(x.id) !== 'hidden'), flip: (on: boolean) => setAll(on ? 'open' : 'hidden') },
    { label: '3D pins', on: mode('pins') !== 'hidden', flip: (on: boolean) => set('pins', on ? 'open' : 'hidden') },
    { label: 'Station tags', on: mode('labels') !== 'hidden', flip: (on: boolean) => set('labels', on ? 'open' : 'hidden') },
  ];
  const [menu, setMenu] = useState(false);
  const p = (id: (typeof PANELS)[number]['id']) => ({ id, title: PANELS.find((x) => x.id === id)!.title, mode: mode(id), onMode: (m: Mode) => set(id, m), readOnly: panels.readOnly });
  const d = data;
  const maxHour = Math.max(1, ...d.hourly.map((h) => Math.max(h.produced, h.plan)));
  const current = d.hourly.find((h) => h.hour === d.currentHour);

  return (
    <div className={styles.overlay}>
      {!panels.readOnly && <div className={styles.menuWrap}>
        <button type="button" className={styles.menuButton} aria-expanded={menu} aria-label="Display settings"
          title="Display settings" data-hidden={allHidden || undefined} onClick={() => setMenu((v) => !v)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {menu && (
          <div className={styles.menu} role="menu">
            {toggles.map((t) => (
              <label key={t.label} className={styles.toggle}>
                <span>{t.label}</span>
                <input type="checkbox" role="switch" checked={t.on} onChange={(e) => t.flip(e.target.checked)} />
                <span className={styles.switch} aria-hidden="true" />
              </label>
            ))}
            <div className={styles.hint}>Press H to hide / show everything</div>
          </div>
        )}
      </div>}

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
          {!panels.readOnly && (
            <button type="button" className={styles.icon} aria-label="Hide KPI" onClick={() => set('kpi', 'hidden')}>×</button>
          )}
        </div>
      )}

      <div className={styles.left}>
        <Panel {...p('progress')}>
          <div className={styles.big}>{fmt(d.total)}<small> / {fmt(d.target)} units</small></div>
          <div className={styles.track}><span style={{ width: `${Math.min(d.achievement, 100)}%` }} /></div>
          <dl className={styles.facts}>
            <div><dt>Remaining</dt><dd>{fmt(d.remaining)} units</dd></div>
            <div><dt>Estimated finish</dt><dd>{d.etaMin === null ? '–' : clock(new Date(now.getTime() + d.etaMin * 60_000))}</dd></div>
            <div><dt>This hour</dt><dd>{current ? `${current.produced} / ${current.plan}` : '–'}</dd></div>
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
          <div className={styles.big}>{fmt(d.total)}<small> inspected</small></div>
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
        {([['paretoNg', d.topNg, styles.ngBg], ['paretoRepair', d.topRepair, styles.repairBg]] as const).map(([id, rows, bar]) => (
          <Panel key={id} {...p(id)}>
            {rows.length === 0 ? <div className={styles.empty}>No data yet</div> : (
              <ul className={styles.bars}>
                {rows.map((r) => (
                  <li key={r.label}>
                    <span className={styles.barLabel} title={r.label}>{r.label}</span>
                    <span className={styles.barTrack}>
                      <span className={bar} style={{ width: `${pct(r.count, rows[0].count)}%` }} />
                    </span>
                    <b>{r.count}</b>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
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
            Line stop: AV {d.stopMin.AV} min · PE {d.stopMin.PE} min · RQ {d.stopMin.RQ} min
          </div>
        </Panel>
        <Panel {...p('alerts')}>
          {d.recent.length === 0 && !d.lastStop ? <div className={styles.empty}>No alerts yet</div> : (
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
