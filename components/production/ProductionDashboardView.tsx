'use client';

import { useMemo, useState } from 'react';
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
import { OeeCard } from '@/components/production/OeeCard';
import { PicCard } from '@/components/production/PicCard';
import { LineParetoChart } from '@/components/production/LineParetoChart';
import { useDefectLines } from '@/hooks/useDefectLines';
import { paretoByLine } from '@/utils/defectLines';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { findPic } from '@/utils/constants';
import {
  getOkTotal, getRepairTotal, getNgTotal, getRates,
  getAchievementPercent, getProgressPercent, mergeCounts, mergeHourly,
} from '@/utils/rates';
import {
  DEFAULT_CYCLE_TIME_SEC, productCycleTime, hourCapacity, windowMinutes, workedMinutesInHour,
  hourlyOee, avMinutesByHour, peMinutesByHour, shiftOee,
} from '@/utils/oee';
import type { OeeBreakdown } from '@/utils/oee';
import type { EntryLog, HourWindow, ProductionState } from '@/lib/types';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';
import styles from './ProductionDashboardView.module.css';

export type DashboardView = 'all' | 'bc' | 'camshaft' | 'crankshaft';

const VIEW_OPTIONS: { value: DashboardView; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'bc', label: 'B/C' },
  { value: 'camshaft', label: 'Camshaft' },
  { value: 'crankshaft', label: 'Crankshaft' },
];

// Product label spelled out for the printed report header (and reused by
// callers, e.g. the Dashboard's defect-photo modal title).
export const REPORT_LABEL: Record<DashboardView, string> = {
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

export interface ProductionDashboardViewProps {
  state: ProductionState;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  // A ticking clock for a live, still-running shift — the hour it falls in
  // counts only its elapsed minutes toward OEE. `null` for a finished shift
  // (a saved history record): every recorded hour counts as fully worked,
  // nothing is "currently running".
  now: Date | null;
  // Hourly window editing — omitted (the default) renders every hour
  // read-only, correct for a finished/archived shift. The live Dashboard
  // passes this only once the viewer is logged in.
  onHourlyWindowChange?: (hour: string, win: HourWindow) => void;
  // Defect-photo click-through — live-only (see useDefectPhotos), omitted
  // for a historical record since a photo isn't tied to a saved shift.
  hasPhoto?: (group: PhotoGroup, chartType: PhotoChartType, defectType: string) => boolean;
  onPhotoBarClick?: (chartType: PhotoChartType, defectType: string) => void;
  // Live connection status for the on-screen status row's right column
  // (date/operator/shift + this). Omitted for a historical record, which
  // falls back to a centered 2-column layout — the same one the print
  // stylesheet already uses to drop this column from the report.
  connectionStatus?: 'online' | 'syncing' | 'offline';
}

export function ProductionDashboardView({
  state, view, onViewChange, now,
  onHourlyWindowChange, hasPhoto, onPhotoBarClick, connectionStatus,
}: ProductionDashboardViewProps) {
  const { theme, setTheme } = useTheme();
  const [printedAt, setPrintedAt] = useState('');
  const { hidden } = useDashboardSettings();
  const { mappings: defectLineMappings } = useDefectLines();

  const isShaftLine = view === 'camshaft' || view === 'crankshaft';
  // Defect photos are per product group + chart type + defect name — "Semua"
  // mixes 3 groups' data so it has no slot of its own; the Pareto bars aren't clickable there.
  const photoGroup: PhotoGroup | null = view === 'all' ? null : view;
  // Scope passed to the rate helpers: undefined = all, 'bc' = lines 1-2,
  // 3/4 = a single shaft line.
  const scope = view === 'all' ? undefined : view === 'bc' ? 'bc' : LINE_FOR[view];

  const ok = getOkTotal(state, scope);
  const repair = getRepairTotal(state, scope);
  const ng = getNgTotal(state, scope);
  const rates = getRates(state, scope);
  // "Semua" measures against the whole-shift target; each scoped view uses that
  // product group's own target (see the split Target fields on the Input page).
  const scopedTarget = view === 'all' ? state.target
    : view === 'bc' ? (state.targetBc ?? 0)
    : view === 'camshaft' ? (state.targetCam ?? 0)
    : (state.targetCrank ?? 0);
  const achievement = getAchievementPercent(state, scopedTarget, scope);
  const progress = getProgressPercent(state, scopedTarget, scope);

  // Memoised so an unchanged background poll (react-query keeps the same
  // `state` reference via structural sharing) doesn't hand the charts a new
  // object every 3s and make them redraw.
  const defectData = useMemo(() => (
    view === 'bc' ? state.defectData
      : isShaftLine ? bucketByLine(state.entryLogs, LINE_FOR[view], 'defect')
      : mergeCounts(state.defectData, state.defectDataShaft)
  ), [view, isShaftLine, state.defectData, state.defectDataShaft, state.entryLogs]);
  const repairData = useMemo(() => (
    view === 'bc' ? state.repairData
      : isShaftLine ? bucketByLine(state.entryLogs, LINE_FOR[view], 'repair')
      : mergeCounts(state.repairData, state.repairDataShaft)
  ), [view, isShaftLine, state.repairData, state.repairDataShaft, state.entryLogs]);
  const hourlyData = useMemo(() => {
    if (view === 'bc') return state.hourlyData;
    if (view === 'camshaft') return state.hourlyDataCam ?? {};
    if (view === 'crankshaft') return state.hourlyDataCrank ?? {};
    return mergeHourly(state.hourlyData, state.hourlyDataShaft);
  }, [view, state.hourlyData, state.hourlyDataShaft, state.hourlyDataCam, state.hourlyDataCrank]);
  const entryLogs = useMemo(() => {
    if (view === 'all') return state.entryLogs;
    if (view === 'bc') return state.entryLogs.filter((log) => (log.group ?? 'bc') === 'bc');
    return state.entryLogs.filter((log) => log.line === LINE_FOR[view]);
  }, [view, state.entryLogs]);

  // Worked window per hour ("HH:00" -> {start,end}). Plant-wide — a break hits
  // every line — so all views share the one map; each per-group view can edit it.
  const hourlyWindow = useMemo(() => state.hourlyWindow ?? {}, [state.hourlyWindow]);

  const lineStops = state.lineStops ?? [];

  // OEE needs a cycle time to measure availability against. The B/C cycle time
  // drives every product (Camshaft and Crankshaft derive theirs from it by
  // mould ratio), so each product view has one; "Semua" mixes three products
  // and shows no OEE at all rather than a misleading blend.
  const showOee = view !== 'all';
  const cycleTime = productCycleTime(
    view === 'all' ? 'bc' : view,
    state.cycleTimeBc || DEFAULT_CYCLE_TIME_SEC,
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

  const oeeByHour = useMemo(() => {
    if (!showOee) return undefined;
    const avByHour = avMinutesByHour(state.lineStops);
    const peByHour = peMinutesByHour(state.lineStops);
    const out: Record<string, OeeBreakdown> = {};
    for (const [hour, snapshot] of Object.entries(hourlyData)) {
      const elapsed = workedMinutesInHour(hour, hourlyWindow, now);
      out[hour] = hourlyOee(snapshot, avByHour[hour] ?? 0, peByHour[hour] ?? 0, elapsed);
    }
    return out;
  }, [showOee, hourlyData, hourlyWindow, state.lineStops, now]);

  const oeeShift = useMemo(
    () => (showOee ? shiftOee(hourlyData, state.lineStops, now, hourlyWindow) : null),
    [showOee, hourlyData, hourlyWindow, state.lineStops, now],
  );

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

  const reportPic = findPic(state.pic);
  const editableHourly = view !== 'all' && onHourlyWindowChange !== undefined;

  return (
    <div className={styles.container}>
      <div className={styles.printHeader} aria-hidden="true">
        <h1>Laporan Harian Produksi</h1>
        <div className={styles.printMeta}>
          <span>Tanggal: {state.date || '—'}</span>
          <span>Shift: {state.shift}</span>
          <span>Operator: {state.operator || '—'}</span>
          {reportPic && <span>PIC: {reportPic.name}</span>}
          <span>Produk: {REPORT_LABEL[view]}</span>
          {printedAt && <span>Dicetak: {printedAt}</span>}
        </div>
      </div>

      {/* Three fixed grid columns (see .statusBar) so the OEE card's position
          never depends on the width of the PIC card or the connection text —
          "Real-time Connected" / "Syncing…" / "Disconnected" all differ in
          length, and the OEE card must not shift when that text changes. */}
      <div className={connectionStatus ? styles.statusBar : `${styles.statusBar} ${styles.statusBarNoRight}`}>
        <div className={styles.statusLeft}>
          {state.pic && <PicCard pic={state.pic} />}
        </div>
        <div className={styles.oeeSlot}>
          {oeeShift && <OeeCard oee={oeeShift} cycleTime={cycleTime} />}
        </div>
        {connectionStatus && (
          <span className={styles.statusRight}>
            <span>{state.date || '—'}</span>
            <span>{state.operator || 'Belum ada operator'}</span>
            <span>{state.shift}</span>
            <span className={connectionStatus === 'offline' ? styles.statusOffline : styles.statusOnline}>
              {connectionStatus === 'offline' ? 'Disconnected' : connectionStatus === 'syncing' ? 'Syncing…' : 'Real-time Connected'}
            </span>
          </span>
        )}
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.viewToggle} role="group" aria-label="Filter produk">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={view === option.value ? styles.viewButtonActive : styles.viewButton}
              aria-pressed={view === option.value}
              onClick={() => onViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.exportBtn} onClick={handleExportPdf}>
          Export PDF
        </button>
      </div>

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
                editable={editableHourly}
                onWindowChange={onHourlyWindowChange}
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
                hasPhoto={photoGroup && hasPhoto ? (defectType) => hasPhoto(photoGroup, 'ng', defectType) : undefined}
                onBarClick={photoGroup && onPhotoBarClick ? (defectType) => onPhotoBarClick('ng', defectType) : undefined}
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
                hasPhoto={photoGroup && hasPhoto ? (defectType) => hasPhoto(photoGroup, 'repair', defectType) : undefined}
                onBarClick={photoGroup && onPhotoBarClick ? (defectType) => onPhotoBarClick('repair', defectType) : undefined}
              />
            </div>
          </section>
        )}

        {!hidden.has('lineDefect') && (
          <section className={`${styles.panel} ${styles.spanHalf} ${styles.hPareto}`}>
            <div className={styles.panelTitle}>Pareto Defect per Line</div>
            <div className={styles.panelBody}>
              <LineParetoChart bars={paretoByLine(defectData, defectLineMappings)} />
            </div>
          </section>
        )}

        {!hidden.has('defectDetails') && (
          <section className={`${styles.panel} ${styles.spanList} ${styles.hDetail}`}>
            <div className={styles.scrollBody}>
              <DefectRepairSummary title="Defect Details" data={defectData} mappings={defectLineMappings} />
            </div>
          </section>
        )}

        {!hidden.has('repairDetails') && (
          <section className={`${styles.panel} ${styles.spanList} ${styles.hDetail}`}>
            <div className={styles.scrollBody}>
              <DefectRepairSummary title="Repair Details" data={repairData} mappings={defectLineMappings} />
            </div>
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
    </div>
  );
}
