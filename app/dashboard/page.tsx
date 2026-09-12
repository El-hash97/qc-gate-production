'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { ProductionChart } from '@/components/production/ProductionChart';
import { ParetoChart } from '@/components/production/ParetoChart';
import { HourlyChart } from '@/components/production/HourlyChart';
import { HourlyTable } from '@/components/production/HourlyTable';
import { HourlyOeeChart } from '@/components/production/HourlyOeeChart';
import { DefectHeatmap } from '@/components/production/DefectHeatmap';
import { LotDefectChart } from '@/components/production/LotDefectChart';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';
import { EntryLogList } from '@/components/production/EntryLogList';
import { LineStopTable } from '@/components/production/LineStopTable';
import { DefectPhotoModal } from '@/components/production/DefectPhotoModal';
import { OeeCard } from '@/components/production/OeeCard';
import { useDefectPhotoFlags } from '@/hooks/useDefectPhotos';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';
import {
  getOkTotal, getRepairTotal, getNgTotal, getRates,
  getAchievementPercent, getProgressPercent, mergeCounts, mergeHourly,
} from '@/utils/rates';
import {
  DEFAULT_CYCLE_TIME_SEC, productCycleTime, hourCapacity, windowMinutes, workedMinutesInHour,
  hourlyOee, avMinutesByHour, peMinutesByHour, shiftOee,
} from '@/utils/oee';
import type { OeeBreakdown } from '@/utils/oee';
import { PicCard } from '@/components/production/PicCard';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/hooks/useTheme';
import { findPic } from '@/utils/constants';
import type { EntryLog, HourWindow, ProductionState } from '@/lib/types';
import styles from './page.module.css';

// Which bento panels a viewer can hide — persisted per-browser so a kiosk
// display keeps its chosen layout across reloads.
const PANELS = [
  { id: 'distribution', label: 'Production Distribution' },
  { id: 'hourlyChart', label: 'Hourly Production' },
  { id: 'lineStop', label: 'Line Stop' },
  { id: 'hourlyTable', label: 'Hourly (Tabel)' },
  { id: 'oeeChart', label: 'OEE per Jam' },
  { id: 'paretoNg', label: 'Pareto Defect (NG)' },
  { id: 'paretoRepair', label: 'Pareto Repair' },
  { id: 'defectDetails', label: 'Defect Details' },
  { id: 'repairDetails', label: 'Repair Details' },
  { id: 'heatmap', label: 'Flask/Cavity × Defect' },
  { id: 'lotDefect', label: 'Lot × Defect' },
  { id: 'entryLog', label: 'Lot/Flask Log' },
] as const;
type PanelId = (typeof PANELS)[number]['id'];

const HIDDEN_PANELS_KEY = 'qc-dashboard-hidden-panels';

function useHiddenPanels() {
  const [hidden, setHidden] = useState<Set<PanelId>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_PANELS_KEY);
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch {
      /* private mode / bad stored value — everything stays visible */
    }
  }, []);

  function toggle(id: PanelId) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(HIDDEN_PANELS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  return { hidden, toggle };
}

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  targetBc: 0, targetCam: 0, targetCrank: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  pic: '',
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  hourlyWindow: {},
  entryLogs: [], lineStops: [], savedAt: '',
};

type DashboardView = 'all' | 'bc' | 'camshaft' | 'crankshaft';

const VIEW_OPTIONS: { value: DashboardView; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'bc', label: 'B/C' },
  { value: 'camshaft', label: 'Camshaft' },
  { value: 'crankshaft', label: 'Crankshaft' },
];

// Product label spelled out for the printed report header.
const REPORT_LABEL: Record<DashboardView, string> = {
  all: 'Semua Produk',
  bc: 'BC 1TR + BC 2TR',
  camshaft: 'Camshaft',
  crankshaft: 'Crankshaft',
};

// Camshaft = line 3, Crankshaft = line 4. Their defect/repair tallies share
// one stored bucket (defectDataShaft), so per-product breakdowns are summed
// from the line-tagged entry logs instead.
const LINE_FOR: Record<'camshaft' | 'crankshaft', 3 | 4> = { camshaft: 3, crankshaft: 4 };

function bucketByLine(logs: EntryLog[], line: 3 | 4, kind: 'defect' | 'repair'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const log of logs) {
    if (log.line === line && log.kind === kind) out[log.type] = (out[log.type] ?? 0) + log.qty;
  }
  return out;
}

export default function DashboardPage() {
  const { state, isFetching, isError, updateState } = useProductionState();
  const { theme, setTheme } = useTheme();
  const current = state ?? EMPTY_STATE;
  const [printedAt, setPrintedAt] = useState('');
  const { hidden, toggle: toggleHidden } = useHiddenPanels();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [view, setView] = useState<DashboardView>('bc');
  const isShaftLine = view === 'camshaft' || view === 'crankshaft';
  // Defect photos are per product group + chart type + defect name — "Semua"
  // mixes 3 groups' data so it has no slot of its own; the Pareto bars aren't clickable there.
  const photoGroup: PhotoGroup | null = view === 'all' ? null : view;
  const [photoModal, setPhotoModal] = useState<{ chartType: PhotoChartType; defectType: string } | null>(null);
  const { hasPhoto } = useDefectPhotoFlags();
  // Scope passed to the rate helpers: undefined = all, 'bc' = lines 1-2,
  // 3/4 = a single shaft line.
  const scope = view === 'all' ? undefined : view === 'bc' ? 'bc' : LINE_FOR[view];

  const ok = getOkTotal(current, scope);
  const repair = getRepairTotal(current, scope);
  const ng = getNgTotal(current, scope);
  const rates = getRates(current, scope);
  // "Semua" measures against the whole-shift target; each scoped view uses that
  // product group's own target (see the split Target fields on the Input page).
  const scopedTarget = view === 'all' ? current.target
    : view === 'bc' ? (current.targetBc ?? 0)
    : view === 'camshaft' ? (current.targetCam ?? 0)
    : (current.targetCrank ?? 0);
  const achievement = getAchievementPercent(current, scopedTarget, scope);
  const progress = getProgressPercent(current, scopedTarget, scope);

  // Memoised so an unchanged background poll (react-query keeps the same
  // `current` reference via structural sharing) doesn't hand the charts a new
  // object every 3s and make them redraw.
  const defectData = useMemo(() => (
    view === 'bc' ? current.defectData
      : isShaftLine ? bucketByLine(current.entryLogs, LINE_FOR[view], 'defect')
      : mergeCounts(current.defectData, current.defectDataShaft)
  ), [view, isShaftLine, current.defectData, current.defectDataShaft, current.entryLogs]);
  const repairData = useMemo(() => (
    view === 'bc' ? current.repairData
      : isShaftLine ? bucketByLine(current.entryLogs, LINE_FOR[view], 'repair')
      : mergeCounts(current.repairData, current.repairDataShaft)
  ), [view, isShaftLine, current.repairData, current.repairDataShaft, current.entryLogs]);
  const hourlyData = useMemo(() => {
    if (view === 'bc') return current.hourlyData;
    if (view === 'camshaft') return current.hourlyDataCam ?? {};
    if (view === 'crankshaft') return current.hourlyDataCrank ?? {};
    return mergeHourly(current.hourlyData, current.hourlyDataShaft);
  }, [view, current.hourlyData, current.hourlyDataShaft, current.hourlyDataCam, current.hourlyDataCrank]);
  const entryLogs = useMemo(() => {
    if (view === 'all') return current.entryLogs;
    if (view === 'bc') return current.entryLogs.filter((log) => (log.group ?? 'bc') === 'bc');
    return current.entryLogs.filter((log) => log.line === LINE_FOR[view]);
  }, [view, current.entryLogs]);

  // Worked window per hour ("HH:00" -> {start,end}). Plant-wide — a break hits
  // every line — so all views share the one map; each per-group view can edit it.
  const hourlyWindow = useMemo(() => current.hourlyWindow ?? {}, [current.hourlyWindow]);

  const lineStops = current.lineStops ?? [];

  // OEE needs a cycle time to measure availability against. The B/C cycle time
  // drives every product (Camshaft and Crankshaft derive theirs from it by
  // mould ratio), so each product view has one; "Semua" mixes three products
  // and shows no OEE at all rather than a misleading blend.
  const showOee = view !== 'all';
  const cycleTime = productCycleTime(
    view === 'all' ? 'bc' : view,
    current.cycleTimeBc || DEFAULT_CYCLE_TIME_SEC,
  );

  // Plan per hour = pieces the worked window allows at the cycle time:
  // round(3600/ct * windowMinutes/60), so a full hour at 50 s is 72 pcs and a
  // 45-minute window is 54. Per product view — "Semua" has no cycle time.
  const hourlyPlan = useMemo(() => {
    if (!showOee) return undefined;
    const capacity = hourCapacity(cycleTime);
    const out: Record<string, number> = {};
    for (const hour of Object.keys(hourlyData)) {
      out[hour] = Math.round(capacity * windowMinutes(hour, hourlyWindow) / 60);
    }
    return out;
  }, [showOee, hourlyData, hourlyWindow, cycleTime]);

  // The running hour is measured against the minutes gone by, so it has to be
  // recomputed as the clock moves even when no new production comes in.
  const [minuteTick, setMinuteTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setMinuteTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const oeeByHour = useMemo(() => {
    if (!showOee) return undefined;
    const avByHour = avMinutesByHour(current.lineStops);
    const peByHour = peMinutesByHour(current.lineStops);
    const now = new Date(minuteTick);
    const out: Record<string, OeeBreakdown> = {};
    for (const [hour, snapshot] of Object.entries(hourlyData)) {
      const elapsed = workedMinutesInHour(hour, hourlyWindow, now);
      out[hour] = hourlyOee(snapshot, avByHour[hour] ?? 0, peByHour[hour] ?? 0, elapsed);
    }
    return out;
  }, [showOee, hourlyData, hourlyWindow, current.lineStops, minuteTick]);

  const oeeShift = useMemo(
    () => (showOee ? shiftOee(hourlyData, current.lineStops, new Date(minuteTick), hourlyWindow) : null),
    [showOee, hourlyData, hourlyWindow, current.lineStops, minuteTick],
  );

  // Plant-wide worked window, so it writes the same `hourlyWindow` map from any
  // view. Never write before the running shift has loaded — that would POST
  // EMPTY_STATE over live data (mirrors the Input page's load gate).
  function handleHourlyWindow(hour: string, win: HourWindow) {
    if (!state) return;
    updateState({ ...state, hourlyWindow: { ...(state.hourlyWindow ?? {}), [hour]: win } });
  }

  // Export the current view as a PDF via the browser's print-to-PDF. Chart
  // canvases can't be recoloured by the print stylesheet, so force the light
  // palette first, let the charts redraw, print, then restore the theme.
  function handleExportPdf() {
    setPrintedAt(new Date().toLocaleString('id-ID'));
    const previous = theme;
    if (previous !== 'light') setTheme('light');
    window.setTimeout(() => {
      window.print();
      if (previous !== 'light') setTheme(previous);
    }, 300);
  }

  const reportPic = findPic(current.pic);

  return (
    <main className={styles.page}>
      <div className={styles.printHeader} aria-hidden="true">
        <h1>Laporan Harian Produksi</h1>
        <div className={styles.printMeta}>
          <span>Tanggal: {current.date || '—'}</span>
          <span>Shift: {current.shift}</span>
          <span>Operator: {current.operator || '—'}</span>
          {reportPic && <span>PIC: {reportPic.name}</span>}
          <span>Produk: {REPORT_LABEL[view]}</span>
          {printedAt && <span>Dicetak: {printedAt}</span>}
        </div>
      </div>

      {/* Three fixed grid columns (see .statusBar) so the OEE card's position
          never depends on the width of the PIC card or the connection text —
          "Real-time Connected" / "Syncing…" / "Disconnected" all differ in
          length, and the OEE card must not shift when that text changes. */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          {current.pic && <PicCard pic={current.pic} />}
        </div>
        <div className={styles.oeeSlot}>
          {oeeShift && <OeeCard oee={oeeShift} cycleTime={cycleTime} />}
        </div>
        <span className={styles.statusRight}>
          <span>{current.date || '—'}</span>
          <span>{current.operator || 'Belum ada operator'}</span>
          <span>{current.shift}</span>
          <span className={isError ? styles.statusOffline : styles.statusOnline}>
            {isError ? 'Disconnected' : isFetching ? 'Syncing…' : 'Real-time Connected'}
          </span>
        </span>
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.viewToggle} role="group" aria-label="Filter produk">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={view === option.value ? styles.viewButtonActive : styles.viewButton}
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.exportBtn} onClick={() => setSettingsOpen(true)}>
          Pengaturan
        </button>
        <button type="button" className={styles.exportBtn} onClick={handleExportPdf}>
          Export PDF
        </button>
      </div>

      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Panel Dashboard">
        <div className={styles.settingsList}>
          {PANELS.map((panel) => (
            <label key={panel.id} className={styles.settingsItem}>
              <input
                type="checkbox"
                checked={!hidden.has(panel.id)}
                onChange={() => toggleHidden(panel.id)}
              />
              {panel.label}
            </label>
          ))}
        </div>
      </Modal>

      <div className={styles.kpiRow}>
        <div className={`${styles.kpiCard} ${styles.kpiTotal}`}>
          <div className={styles.kpiLabel}>Total Produksi</div>
          <div className={styles.kpiValue}>{ok + repair + ng}</div>
          <div className={styles.kpiPct}>{achievement}% dari target</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiOk}`}>
          <div className={styles.kpiLabel}>OK</div>
          <div className={styles.kpiValue}>{ok}</div>
          <div className={styles.kpiPct}>{rates.okRate}%</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiRepair}`}>
          <div className={styles.kpiLabel}>Repair</div>
          <div className={styles.kpiValue}>{repair}</div>
          <div className={styles.kpiPct}>{rates.repairRate}%</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiNg}`}>
          <div className={styles.kpiLabel}>NG</div>
          <div className={styles.kpiValue}>{ng}</div>
          <div className={styles.kpiPct}>{rates.ngRate}%</div>
        </div>
      </div>

      <div className={styles.progressStrip}>
        <div style={{ flex: 1 }}>
          <div className={styles.progressLabel}><span>Progress</span><span>{progress}%</span></div>
          <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
        </div>
        <div className={styles.achievementBadge}>Achievement: {achievement}%</div>
      </div>

      <div className={styles.bento}>
        {!hidden.has('distribution') && (
          <section className={`${styles.panel} ${styles.spanDonut} ${styles.hTrend}`}>
            <div className={styles.panelTitle}>Production Distribution</div>
            <div className={styles.panelBody}><ProductionChart ok={ok} repair={repair} ng={ng} /></div>
          </section>
        )}

        {!hidden.has('hourlyChart') && (
          <section className={`${styles.panel} ${styles.spanHero} ${styles.hTrend}`}>
            <div className={styles.panelTitle}>Hourly Production</div>
            <div className={styles.panelBody}>
              {/* The Plan line is the formula plan per hour — B/C only (elsewhere
                  there's no cycle time), so hourlyPlan is undefined and no line shows. */}
              <HourlyChart hourlyData={hourlyData} hourlyTarget={hourlyPlan} />
            </div>
          </section>
        )}

        {/* Fills the top row's remaining 3 columns; spans the full width in print. */}
        {!hidden.has('lineStop') && (
          <section className={`${styles.panel} ${styles.spanList} ${styles.hTrend} ${styles.lineStopPanel}`}>
            <div className={styles.panelTitle}>Line Stop</div>
            <div className={styles.scrollBody}><LineStopTable stops={lineStops} /></div>
          </section>
        )}

        {!hidden.has('hourlyTable') && (
          <section className={`${styles.panel} ${oeeByHour ? styles.spanWide : styles.spanHalf} ${styles.hPareto} ${styles.hourlyTablePanel}`}>
            <div className={styles.panelTitle}>Hourly (Tabel)</div>
            <div className={styles.scrollBody}>
              <HourlyTable
                hourlyData={hourlyData}
                hourlyWindow={hourlyWindow}
                hourlyPlan={hourlyPlan}
                editable={view !== 'all'}
                onWindowChange={handleHourlyWindow}
                oee={oeeByHour}
              />
            </div>
          </section>
        )}

        {oeeByHour && !hidden.has('oeeChart') && (
          <section className={`${styles.panel} ${styles.oeeChartPanel} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>OEE per Jam</div>
            <div className={styles.panelBody}><HourlyOeeChart oee={oeeByHour} /></div>
          </section>
        )}

        {!hidden.has('paretoNg') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Pareto Defect (NG)</div>
            <div className={styles.panelBody}>
              <ParetoChart
                data={defectData}
                hasPhoto={photoGroup ? (defectType) => hasPhoto(photoGroup, 'ng', defectType) : undefined}
                onBarClick={photoGroup ? (defectType) => setPhotoModal({ chartType: 'ng', defectType }) : undefined}
              />
            </div>
          </section>
        )}

        {!hidden.has('paretoRepair') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Pareto Repair</div>
            <div className={styles.panelBody}>
              <ParetoChart
                data={repairData}
                hasPhoto={photoGroup ? (defectType) => hasPhoto(photoGroup, 'repair', defectType) : undefined}
                onBarClick={photoGroup ? (defectType) => setPhotoModal({ chartType: 'repair', defectType }) : undefined}
              />
            </div>
          </section>
        )}

        {!hidden.has('defectDetails') && (
          <section className={`${styles.panel} ${styles.spanList} ${styles.hDetail}`}>
            <div className={styles.scrollBody}><DefectRepairSummary title="Defect Details" data={defectData} /></div>
          </section>
        )}

        {!hidden.has('repairDetails') && (
          <section className={`${styles.panel} ${styles.spanList} ${styles.hDetail}`}>
            <div className={styles.scrollBody}><DefectRepairSummary title="Repair Details" data={repairData} /></div>
          </section>
        )}

        {!hidden.has('heatmap') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hDetail}`}>
            <div className={styles.panelTitle}>
              {view === 'all' ? 'Flask / Cavity × Defect' : isShaftLine ? 'Cavity × Defect' : 'Flask × Defect'}
            </div>
            <div className={styles.panelBody}>
              <DefectHeatmap
                logs={entryLogs}
                variant={view === 'all' ? 'both' : isShaftLine ? 'cavity' : 'flask'}
              />
            </div>
          </section>
        )}

        {!hidden.has('lotDefect') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hLog}`}>
            <div className={styles.panelTitle}>Lot × Defect</div>
            <div className={styles.panelBody}><LotDefectChart logs={entryLogs} /></div>
          </section>
        )}

        {/* Without the "OEE per Jam" panel (every view but B/C) the log would sit
            alone on a half-empty row, so it takes the full width there instead. */}
        {!hidden.has('entryLog') && (
          <section className={`${styles.panel} ${oeeByHour ? styles.spanHalf : styles.spanFull} ${styles.hLog}`}>
            <div className={styles.scrollBody}>
              <EntryLogList title={isShaftLine ? 'Lot / Cavity Log' : 'Lot / Flask Log'} logs={entryLogs} />
            </div>
          </section>
        )}
      </div>

      {photoGroup && photoModal && (
        <DefectPhotoModal
          isOpen
          onClose={() => setPhotoModal(null)}
          group={photoGroup}
          chartType={photoModal.chartType}
          defectType={photoModal.defectType}
          title={`Foto Defect — ${REPORT_LABEL[view]} / ${photoModal.chartType === 'ng' ? 'NG' : 'Repair'} — ${photoModal.defectType}`}
        />
      )}
    </main>
  );
}
