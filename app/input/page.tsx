'use client';

import { useState, useEffect } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useHourlySnapshot } from '@/hooks/useHourlySnapshot';
import { useDraftValue } from '@/hooks/useDraftValue';
import { useToast } from '@/components/ui/ToastProvider';
import { CounterCard } from '@/components/production/CounterCard';
import { DefectModal } from '@/components/production/DefectModal';
import { RepairModal } from '@/components/production/RepairModal';
import { ResetModal } from '@/components/production/ResetModal';
import { LineStopSection } from '@/components/production/LineStopSection';
import { PicCard } from '@/components/production/PicCard';
import {
  getRates, getAchievementPercent, getProgressPercent, isNgAlarmActive,
} from '@/utils/rates';
import { exportShiftToExcel } from '@/utils/excelExport';
import { todayString } from '@/utils/date';
import {
  SHIFTS, PICS, findPic, DEFECT_TYPES, REPAIR_TYPES, SHAFT_DEFECT_TYPES, SHAFT_REPAIR_TYPES,
} from '@/utils/constants';
import type { ProductLine, ProductionState } from '@/lib/types';
import { lineGroup } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', pic: '', target: 0,
  targetBc: 0, targetCam: 0, targetCrank: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  entryLogs: [], lineStops: [], savedAt: '',
};

type CounterField = 'ok1' | 'repair1' | 'ng1' | 'ok2' | 'repair2' | 'ng2'
  | 'ok3' | 'repair3' | 'ng3' | 'ok4' | 'repair4' | 'ng4';

type DefectTarget = 'ng1' | 'ng2' | 'ng3' | 'ng4';
type RepairTarget = 'repair1' | 'repair2' | 'repair3' | 'repair4';

// BC 1TR/2TR share one defect/repair list; Camshaft/Crankshaft share another.
function defectTypesFor(target: DefectTarget | null): readonly string[] {
  return target === 'ng3' || target === 'ng4' ? SHAFT_DEFECT_TYPES : DEFECT_TYPES;
}
function repairTypesFor(target: RepairTarget | null): readonly string[] {
  return target === 'repair3' || target === 'repair4' ? SHAFT_REPAIR_TYPES : REPAIR_TYPES;
}

// The counter target ('ng3', 'repair1', …) always ends in its line number.
// Lines 1-2 are Block Cylinder; lines 3-4 are Camshaft/Crankshaft. Defect and
// repair tallies (and the Lot/Flask log) are stored per group so the dashboard
// toggle can scope them, and tagged with the line so the log shows the product.
function lineForTarget(target: DefectTarget | RepairTarget): ProductLine {
  return Number(target.slice(-1)) as ProductLine;
}

// Camshaft/Crankshaft record a cavity number in the same slot BC uses for a flask.
function flaskLabelFor(target: DefectTarget | RepairTarget | null): string {
  if (!target) return 'Nomor Flask';
  return lineGroup(lineForTarget(target)) === 'shaft' ? 'Nomor Cavity' : 'Nomor Flask';
}

export default function InputPage() {
  const { state, updateState, isLoading } = useProductionState();
  const { showToast } = useToast();
  const current = state ?? EMPTY_STATE;
  // Every write merges onto the loaded state. During the very first fetch
  // there is no loaded state and `current` is the all-zero EMPTY_STATE —
  // writing then would POST zeros over the running shift and wipe it. Gate
  // every write (and the whole form) on the initial load being done.
  const ready = !isLoading;

  useHourlySnapshot(current, updateState);

  useEffect(() => {
    // Auto-fill today's date, but only once the real server state has loaded
    // and it genuinely has none — never on top of EMPTY_STATE.
    if (isLoading || !state || state.date) return;
    updateState({ ...state, date: todayString() });
  }, [isLoading, state, updateState]);

  const [defectTarget, setDefectTarget] = useState<DefectTarget | null>(null);
  const [repairTarget, setRepairTarget] = useState<RepairTarget | null>(null);
  const [isResetOpen, setResetOpen] = useState(false);

  function commit(patch: Partial<ProductionState>) {
    if (isLoading) return;
    const next = { ...current, ...patch };
    updateState(next);

    if (isNgAlarmActive(next)) {
      const { ngRate } = getRates(next);
      showToast(`⚠️ WARNING: NG Rate ${ngRate}% — melebihi batas 5%!`, 'error');
    }
  }

  function increment(field: CounterField) {
    commit({ [field]: (current[field] ?? 0) + 1 } as Partial<ProductionState>);
  }

  function decrement(field: CounterField) {
    if ((current[field] ?? 0) > 0) {
      commit({ [field]: (current[field] ?? 0) - 1 } as Partial<ProductionState>);
    }
  }

  function handleSaveDefect(defectType: string, qty: number, lot: string, flask: string) {
    if (!defectTarget) return;
    const line = lineForTarget(defectTarget);
    const group = lineGroup(line);
    const dataKey = group === 'shaft' ? 'defectDataShaft' : 'defectData';
    const currentData = current[dataKey] ?? {};
    commit({
      [defectTarget]: (current[defectTarget] ?? 0) + qty,
      [dataKey]: { ...currentData, [defectType]: (currentData[defectType] ?? 0) + qty },
      entryLogs: [...current.entryLogs, { kind: 'defect', group, line, type: defectType, qty, lot, flask }],
    } as Partial<ProductionState>);
    showToast(`${qty}x ${defectType} ditambahkan`, 'error');
    setDefectTarget(null);
  }

  function handleSaveRepair(repairType: string, qty: number, lot: string, flask: string) {
    if (!repairTarget) return;
    const line = lineForTarget(repairTarget);
    const group = lineGroup(line);
    const dataKey = group === 'shaft' ? 'repairDataShaft' : 'repairData';
    const currentData = current[dataKey] ?? {};
    commit({
      [repairTarget]: (current[repairTarget] ?? 0) + qty,
      [dataKey]: { ...currentData, [repairType]: (currentData[repairType] ?? 0) + qty },
      entryLogs: [...current.entryLogs, { kind: 'repair', group, line, type: repairType, qty, lot, flask }],
    } as Partial<ProductionState>);
    showToast(`${qty}x ${repairType} ditambahkan`, 'warning');
    setRepairTarget(null);
  }

  const rates = getRates(current);

  // Per-product-group targets. `target` is kept as their sum so the History
  // table, Excel export and the dashboard "Semua" view stay unchanged.
  function commitTarget(patch: { targetBc?: number; targetCam?: number; targetCrank?: number }) {
    const targetBc = patch.targetBc ?? current.targetBc ?? 0;
    const targetCam = patch.targetCam ?? current.targetCam ?? 0;
    const targetCrank = patch.targetCrank ?? current.targetCrank ?? 0;
    commit({ targetBc, targetCam, targetCrank, target: targetBc + targetCam + targetCrank });
  }

  const TARGET_GROUPS: { label: string; scope: 'bc' | 3 | 4; target: number }[] = [
    { label: 'BC (1TR + 2TR)', scope: 'bc', target: current.targetBc ?? 0 },
    { label: 'Camshaft', scope: 3, target: current.targetCam ?? 0 },
    { label: 'Crankshaft', scope: 4, target: current.targetCrank ?? 0 },
  ];

  // Free-text toolbar fields commit on blur, not on every keystroke, so the
  // background poll can't overwrite a value mid-edit.
  const operatorField = useDraftValue(current.operator, (value) => commit({ operator: value }), {
    parse: (raw) => raw,
    format: (value) => value,
  });
  const parseTarget = {
    parse: (raw: string) => {
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? 0 : Math.max(0, n);
    },
    format: (value: number) => String(value),
  };
  const targetBcField = useDraftValue(current.targetBc ?? 0, (v) => commitTarget({ targetBc: v }), parseTarget);
  const targetCamField = useDraftValue(current.targetCam ?? 0, (v) => commitTarget({ targetCam: v }), parseTarget);
  const targetCrankField = useDraftValue(current.targetCrank ?? 0, (v) => commitTarget({ targetCrank: v }), parseTarget);

  // Block the whole form until the running shift has loaded — otherwise the
  // first click/keystroke would write EMPTY_STATE over live data.
  if (!ready) {
    return <main className={styles.page}><p className={styles.loading}>Memuat data shift…</p></main>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.topRow}>
      {current.pic && <PicCard pic={current.pic} />}
      <div className={styles.toolbar}>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>PIC</span>
          <select
            className={styles.toolbarSelect}
            value={current.pic ?? ''}
            onChange={(event) => {
              const p = findPic(event.target.value);
              commit(p ? { pic: p.key, shift: p.shift } : { pic: '' });
            }}
          >
            <option value="">Pilih PIC</option>
            {PICS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} ({p.shift.replace('Shift ', '').toUpperCase()})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Tanggal</span>
          <input
            type="date"
            className={styles.toolbarInput}
            value={current.date}
            onChange={(event) => commit({ date: event.target.value })}
          />
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Operator</span>
          <input
            className={styles.toolbarInput}
            value={operatorField.value}
            onChange={operatorField.onChange}
            onBlur={operatorField.onBlur}
            onKeyDown={operatorField.onKeyDown}
            placeholder="Nama Operator"
          />
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Shift</span>
          <select
            className={styles.toolbarSelect}
            value={current.shift}
            onChange={(event) => commit({ shift: event.target.value })}
          >
            {SHIFTS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}
          </select>
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Target BC</span>
          <input
            type="number" className={styles.toolbarInput} min={0}
            value={targetBcField.value}
            onChange={targetBcField.onChange} onBlur={targetBcField.onBlur} onKeyDown={targetBcField.onKeyDown}
          />
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Target Camshaft</span>
          <input
            type="number" className={styles.toolbarInput} min={0}
            value={targetCamField.value}
            onChange={targetCamField.onChange} onBlur={targetCamField.onBlur} onKeyDown={targetCamField.onKeyDown}
          />
        </label>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Target Crankshaft</span>
          <input
            type="number" className={styles.toolbarInput} min={0}
            value={targetCrankField.value}
            onChange={targetCrankField.onChange} onBlur={targetCrankField.onBlur} onKeyDown={targetCrankField.onKeyDown}
          />
        </label>
      </div>
      </div>

      <div className={styles.progressGroups}>
        {TARGET_GROUPS.map((g) => {
          const progress = getProgressPercent(current, g.target, g.scope);
          const achievement = getAchievementPercent(current, g.target, g.scope);
          return (
            <div className={styles.progressStrip} key={g.label}>
              <div className={styles.progressWrapper}>
                <div className={styles.progressLabel}>
                  <span>{g.label}</span>
                  <span>{progress}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className={styles.achievementBadge}>Achievement: {achievement}%</div>
            </div>
          );
        })}
      </div>

      <section className={styles.productSection}>
        <h2 className={styles.productHeaderBc1}>BC 1TR</h2>
        <div className={styles.counterGrid}>
          <CounterCard label="OK" variant="ok" value={current.ok1} onIncrement={() => increment('ok1')} onDecrement={() => decrement('ok1')} />
          <CounterCard label="Repair" variant="repair" value={current.repair1} onIncrement={() => setRepairTarget('repair1')} onDecrement={() => decrement('repair1')} />
          <CounterCard label="NG" variant="ng" value={current.ng1} onIncrement={() => setDefectTarget('ng1')} onDecrement={() => decrement('ng1')} />
        </div>
      </section>

      <section className={styles.productSection}>
        <h2 className={styles.productHeaderBc2}>BC 2TR</h2>
        <div className={styles.counterGrid}>
          <CounterCard label="OK" variant="ok" value={current.ok2} onIncrement={() => increment('ok2')} onDecrement={() => decrement('ok2')} />
          <CounterCard label="Repair" variant="repair" value={current.repair2} onIncrement={() => setRepairTarget('repair2')} onDecrement={() => decrement('repair2')} />
          <CounterCard label="NG" variant="ng" value={current.ng2} onIncrement={() => setDefectTarget('ng2')} onDecrement={() => decrement('ng2')} />
        </div>
      </section>

      <section className={styles.productSection}>
        <h2 className={styles.productHeaderCamshaft}>Camshaft</h2>
        <div className={styles.counterGrid}>
          <CounterCard label="OK" variant="ok" value={current.ok3 ?? 0} onIncrement={() => increment('ok3')} onDecrement={() => decrement('ok3')} />
          <CounterCard label="Repair" variant="repair" value={current.repair3 ?? 0} onIncrement={() => setRepairTarget('repair3')} onDecrement={() => decrement('repair3')} />
          <CounterCard label="NG" variant="ng" value={current.ng3 ?? 0} onIncrement={() => setDefectTarget('ng3')} onDecrement={() => decrement('ng3')} />
        </div>
      </section>

      <section className={styles.productSection}>
        <h2 className={styles.productHeaderCrankshaft}>Crankshaft</h2>
        <div className={styles.counterGrid}>
          <CounterCard label="OK" variant="ok" value={current.ok4 ?? 0} onIncrement={() => increment('ok4')} onDecrement={() => decrement('ok4')} />
          <CounterCard label="Repair" variant="repair" value={current.repair4 ?? 0} onIncrement={() => setRepairTarget('repair4')} onDecrement={() => decrement('repair4')} />
          <CounterCard label="NG" variant="ng" value={current.ng4 ?? 0} onIncrement={() => setDefectTarget('ng4')} onDecrement={() => decrement('ng4')} />
        </div>
      </section>

      <div className={styles.rateStrip}>
        <span>OK Rate: {rates.okRate}%</span>
        <span>Repair Rate: {rates.repairRate}%</span>
        <span>NG Rate: {rates.ngRate}%</span>
      </div>

      <LineStopSection
        stops={current.lineStops ?? []}
        onChange={(lineStops) => commit({ lineStops })}
      />

      <div className={styles.actionBar}>
        <button type="button" className={styles.btnSuccess} onClick={() => exportShiftToExcel(current)}>
          Save Data
        </button>
        <button type="button" className={styles.btnDanger} onClick={() => setResetOpen(true)}>Reset</button>
      </div>

      <DefectModal
        isOpen={defectTarget !== null}
        onClose={() => setDefectTarget(null)}
        onSave={handleSaveDefect}
        types={defectTypesFor(defectTarget)}
        flaskLabel={flaskLabelFor(defectTarget)}
      />
      <RepairModal
        isOpen={repairTarget !== null}
        onClose={() => setRepairTarget(null)}
        onSave={handleSaveRepair}
        types={repairTypesFor(repairTarget)}
        flaskLabel={flaskLabelFor(repairTarget)}
      />
      <ResetModal isOpen={isResetOpen} onClose={() => setResetOpen(false)} />
    </main>
  );
}
