'use client';

import { useEffect, useRef } from 'react';
import { getOkTotal, getRepairTotal, getNgTotal, getGrandTotal } from '@/utils/rates';
import type { RateScope } from '@/utils/rates';
import type { HourlySnapshot, ProductionState } from '@/lib/types';

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

function hourKey(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}

function groupSnapshot(state: ProductionState, scope: RateScope): HourlySnapshot {
  return {
    ok: getOkTotal(state, scope),
    repair: getRepairTotal(state, scope),
    ng: getNgTotal(state, scope),
  };
}

function sameSnapshot(a: HourlySnapshot | undefined, b: HourlySnapshot): boolean {
  return a !== undefined && a.ok === b.ok && a.repair === b.repair && a.ng === b.ng;
}

// Sum of every stored hour except `exceptKey` — everything already attributed
// to the other hours of the shift.
function sumExcept(map: Record<string, HourlySnapshot>, exceptKey: string): HourlySnapshot {
  const total = { ok: 0, repair: 0, ng: 0 };
  for (const [key, snap] of Object.entries(map)) {
    if (key === exceptKey) continue;
    total.ok += snap.ok;
    total.repair += snap.repair;
    total.ng += snap.ng;
  }
  return total;
}

// Net produced during this hour = shift total now − what's already booked to
// the other hours. Clamped at 0 so a counter correction can't make a bar go
// negative (the small under-count just isn't reflected in the hourly view).
function netSnapshot(cumulative: HourlySnapshot, prior: HourlySnapshot): HourlySnapshot {
  return {
    ok: Math.max(0, cumulative.ok - prior.ok),
    repair: Math.max(0, cumulative.repair - prior.repair),
    ng: Math.max(0, cumulative.ng - prior.ng),
  };
}

type HourlyKey = 'hourlyData' | 'hourlyDataShaft' | 'hourlyDataCam' | 'hourlyDataCrank';
const GROUPS: [HourlyKey, RateScope][] = [
  ['hourlyData', 'bc'],
  ['hourlyDataShaft', 'shaft'],
  ['hourlyDataCam', 3],
  ['hourlyDataCrank', 4],
];

/**
 * Records **net** OK/Repair/NG produced during the current hour (e.g. "14:00"),
 * split per product: Block Cylinder in `hourlyData`, Camshaft+Crankshaft
 * combined in `hourlyDataShaft`, and each shaft line on its own in
 * `hourlyDataCam` (line 3) / `hourlyDataCrank` (line 4). The value stored for an
 * hour is the shift total at that moment minus everything already booked to the
 * other hours, so each bar shows just that hour's output and an idle hour shows
 * 0. Derived from the persisted maps, so it survives a mid-shift page reload.
 *
 * A snapshot is written immediately on every state change and refreshed on a
 * 5-minute interval, so the Hourly table always has a row for the active hour.
 * Skipped while all totals are still 0. Uses refs (not effect dependencies) so
 * the interval is set up once and always reads the freshest state/updateState.
 */
export function useHourlySnapshot(
  current: ProductionState,
  updateState: (next: ProductionState) => void,
): void {
  const currentRef = useRef(current);
  const updateStateRef = useRef(updateState);
  const lastWriteRef = useRef<Record<HourlyKey, Record<string, HourlySnapshot>>>({
    hourlyData: {}, hourlyDataShaft: {}, hourlyDataCam: {}, hourlyDataCrank: {},
  });

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { updateStateRef.current = updateState; }, [updateState]);

  function record(state: ProductionState, update: (next: ProductionState) => void) {
    if (getGrandTotal(state) === 0) return;
    const key = hourKey();

    const nets = {} as Record<HourlyKey, HourlySnapshot>;
    let changed = false;
    for (const [dataKey, scope] of GROUPS) {
      const stored = state[dataKey] ?? {};
      const net = netSnapshot(groupSnapshot(state, scope), sumExcept(stored, key));
      nets[dataKey] = net;
      if (!sameSnapshot(lastWriteRef.current[dataKey][key], net)) changed = true;
    }
    if (!changed) return;

    const patch = {} as Record<HourlyKey, Record<string, HourlySnapshot>>;
    for (const [dataKey] of GROUPS) {
      patch[dataKey] = { ...(state[dataKey] ?? {}), [key]: nets[dataKey] };
      lastWriteRef.current[dataKey] = { ...lastWriteRef.current[dataKey], [key]: nets[dataKey] };
    }
    update({ ...state, ...patch });
  }

  useEffect(() => {
    const interval = setInterval(
      () => record(currentRef.current, updateStateRef.current),
      SNAPSHOT_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    record(current, updateState);
  }, [current]);
}
