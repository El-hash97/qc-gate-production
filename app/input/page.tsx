'use client';

import { useState } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import { useHourlySnapshot } from '@/hooks/useHourlySnapshot';
import { useToast } from '@/components/ui/ToastProvider';
import { CounterCard } from '@/components/production/CounterCard';
import { DefectModal } from '@/components/production/DefectModal';
import { RepairModal } from '@/components/production/RepairModal';
import { ResetModal } from '@/components/production/ResetModal';
import {
  getRates, getAchievementPercent, getProgressPercent, isNgAlarmActive,
} from '@/utils/rates';
import { SHIFTS } from '@/utils/constants';
import type { ProductionState } from '@/lib/types';
import styles from './page.module.css';

const EMPTY_STATE: ProductionState = {
  date: '', shift: 'Shift Red', operator: '', target: 0,
  ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

type CounterField = 'ok1' | 'repair1' | 'ng1' | 'ok2' | 'repair2' | 'ng2';

export default function InputPage() {
  const { state, updateState } = useProductionState();
  const { showToast } = useToast();
  const current = state ?? EMPTY_STATE;

  useHourlySnapshot(current, updateState);

  const [defectTarget, setDefectTarget] = useState<'ng1' | 'ng2' | null>(null);
  const [repairTarget, setRepairTarget] = useState<'repair1' | 'repair2' | null>(null);
  const [isResetOpen, setResetOpen] = useState(false);

  function commit(patch: Partial<ProductionState>) {
    const next = { ...current, ...patch };
    updateState(next);

    if (isNgAlarmActive(next)) {
      const { ngRate } = getRates(next);
      showToast(`⚠️ WARNING: NG Rate ${ngRate}% — melebihi batas 5%!`, 'error');
    }
  }

  function increment(field: CounterField) {
    commit({ [field]: current[field] + 1 } as Partial<ProductionState>);
  }

  function decrement(field: CounterField) {
    if (current[field] > 0) {
      commit({ [field]: current[field] - 1 } as Partial<ProductionState>);
    }
  }

  function handleSaveDefect(defectType: string, qty: number) {
    if (!defectTarget) return;
    commit({
      [defectTarget]: current[defectTarget] + qty,
      defectData: { ...current.defectData, [defectType]: (current.defectData[defectType] ?? 0) + qty },
    } as Partial<ProductionState>);
    showToast(`${qty}x ${defectType} ditambahkan`, 'error');
    setDefectTarget(null);
  }

  function handleSaveRepair(repairType: string, qty: number) {
    if (!repairTarget) return;
    commit({
      [repairTarget]: current[repairTarget] + qty,
      repairData: { ...current.repairData, [repairType]: (current.repairData[repairType] ?? 0) + qty },
    } as Partial<ProductionState>);
    showToast(`${qty}x ${repairType} ditambahkan`, 'warning');
    setRepairTarget(null);
  }

  const achievement = getAchievementPercent(current, current.target);
  const progress = getProgressPercent(current, current.target);
  const rates = getRates(current);

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Operator</span>
          <input
            className={styles.toolbarInput}
            value={current.operator}
            onChange={(event) => commit({ operator: event.target.value })}
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
          <span className={styles.toolbarLabel}>Target</span>
          <input
            type="number"
            className={styles.toolbarInput}
            value={current.target}
            min={0}
            onChange={(event) => commit({ target: parseInt(event.target.value, 10) || 0 })}
          />
        </label>
      </div>

      <div className={styles.progressStrip}>
        <div className={styles.progressWrapper}>
          <div className={styles.progressLabel}>
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={styles.achievementBadge}>Achievement: {achievement}%</div>
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

      <div className={styles.rateStrip}>
        <span>OK Rate: {rates.okRate}%</span>
        <span>Repair Rate: {rates.repairRate}%</span>
        <span>NG Rate: {rates.ngRate}%</span>
      </div>

      <div className={styles.actionBar}>
        <button type="button" className={styles.btnDanger} onClick={() => setResetOpen(true)}>Reset</button>
      </div>

      <DefectModal
        isOpen={defectTarget !== null}
        onClose={() => setDefectTarget(null)}
        onSave={handleSaveDefect}
      />
      <RepairModal
        isOpen={repairTarget !== null}
        onClose={() => setRepairTarget(null)}
        onSave={handleSaveRepair}
      />
      <ResetModal isOpen={isResetOpen} onClose={() => setResetOpen(false)} />
    </main>
  );
}
