'use client';

import { useMemo, useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { ProductionChart } from '@/components/production/ProductionChart';
import { ParetoChart } from '@/components/production/ParetoChart';
import { HourlyChart } from '@/components/production/HourlyChart';
import { HourlyTable } from '@/components/production/HourlyTable';
import { DefectHeatmap } from '@/components/production/DefectHeatmap';
import { LotDefectChart } from '@/components/production/LotDefectChart';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';
import { EntryLogList } from '@/components/production/EntryLogList';
import { LineStopTable } from '@/components/production/LineStopTable';
import { DefectPhotoModal } from '@/components/production/DefectPhotoModal';
import { useDefectPhotoFlags } from '@/hooks/useDefectPhotos';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';
import {
  getOkTotal, getRepairTotal, getNgTotal, getRates,
  getAchievementPercent, getProgressPercent, mergeCounts, mergeHourly,
} from '@/utils/rates';
import { PicCard } from '@/components/production/PicCard';
import { useTheme } from '@/hooks/useTheme';
import { findPic } from '@/utils/constants';
import type { EntryLog, ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  targetBc: 0, targetCam: 0, targetCrank: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  pic: '',
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
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

  const [view, setView] = useState<DashboardView>('all');
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

  // Per-hour targets: each product view edits its own map; "Semua" shows the
  // per-hour sum of the three (read-only — you set them per group).
  const hourlyTargetKey = view === 'bc' ? 'hourlyTargetBc'
    : view === 'camshaft' ? 'hourlyTargetCam'
    : view === 'crankshaft' ? 'hourlyTargetCrank' : null;
  const hourlyTarget = useMemo(() => {
    if (hourlyTargetKey) return current[hourlyTargetKey] ?? {};
    const bc = current.hourlyTargetBc ?? {};
    const cam = current.hourlyTargetCam ?? {};
    const crank = current.hourlyTargetCrank ?? {};
    const out: Record<string, number> = {};
    for (const h of new Set([...Object.keys(bc), ...Object.keys(cam), ...Object.keys(crank)])) {
      out[h] = (bc[h] ?? 0) + (cam[h] ?? 0) + (crank[h] ?? 0);
    }
    return out;
  }, [hourlyTargetKey, current.hourlyTargetBc, current.hourlyTargetCam, current.hourlyTargetCrank]);

  const lineStops = current.lineStops ?? [];

  function handleHourlyTarget(hour: string, value: number) {
    // Never write before the running shift has loaded — that would POST
    // EMPTY_STATE over live data (mirrors the Input page's load gate).
    if (!state || !hourlyTargetKey) return;
    updateState({ ...state, [hourlyTargetKey]: { ...(state[hourlyTargetKey] ?? {}), [hour]: value } });
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

      {current.pic && (
        <div className={styles.printPicCard} aria-hidden="true">
          <PicCard pic={current.pic} />
        </div>
      )}

      <div className={styles.statusBar}>
        {current.pic && <PicCard pic={current.pic} />}
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
        <section className={`${styles.panel} ${styles.spanDonut} ${styles.hTrend}`}>
          <div className={styles.panelTitle}>Production Distribution</div>
          <div className={styles.panelBody}><ProductionChart ok={ok} repair={repair} ng={ng} /></div>
        </section>

        <section className={`${styles.panel} ${styles.spanHero} ${styles.hTrend}`}>
          <div className={styles.panelTitle}>Hourly Production</div>
          <div className={styles.panelBody}>
            {/* On "Semua" the target is a sum of the three groups — a line there
                misleads, so only the per-group views get the reference line. */}
            <HourlyChart hourlyData={hourlyData} hourlyTarget={hourlyTargetKey ? hourlyTarget : undefined} />
          </div>
        </section>

        <section className={`${styles.panel} ${styles.spanTable} ${styles.hTrend}`}>
          <div className={styles.panelTitle}>Hourly (Tabel)</div>
          <div className={styles.scrollBody}>
            <HourlyTable
              hourlyData={hourlyData}
              hourlyTarget={hourlyTarget}
              editable={hourlyTargetKey !== null}
              onTargetChange={handleHourlyTarget}
            />
          </div>
        </section>

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

        <section className={`${styles.panel} ${styles.spanList} ${styles.hDetail}`}>
          <div className={styles.scrollBody}><DefectRepairSummary title="Defect Details" data={defectData} /></div>
        </section>

        <section className={`${styles.panel} ${styles.spanList} ${styles.hDetail}`}>
          <div className={styles.scrollBody}><DefectRepairSummary title="Repair Details" data={repairData} /></div>
        </section>

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

        <section className={`${styles.panel} ${styles.spanHalf} ${styles.hLog}`}>
          <div className={styles.panelTitle}>Lot × Defect</div>
          <div className={styles.panelBody}><LotDefectChart logs={entryLogs} /></div>
        </section>

        <section className={`${styles.panel} ${styles.spanHalf} ${styles.hLog}`}>
          <div className={styles.scrollBody}>
            <EntryLogList title={isShaftLine ? 'Lot / Cavity Log' : 'Lot / Flask Log'} logs={entryLogs} />
          </div>
        </section>

        <section className={`${styles.panel} ${styles.spanFull} ${styles.hLogShort}`}>
          <div className={styles.panelTitle}>Line Stop</div>
          <div className={styles.scrollBody}><LineStopTable stops={lineStops} /></div>
        </section>
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
