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

/**
 * Records hourly OK/Repair/NG snapshots keyed by the current hour (e.g.
 * "14:00"), split per product: Block Cylinder totals land in `hourlyData`,
 * Camshaft+Crankshaft combined in `hourlyDataShaft`, and each shaft line on
 * its own in `hourlyDataCam` (line 3) / `hourlyDataCrank` (line 4). A snapshot
 * is written immediately on every state change and then refreshed on a
 * 5-minute interval, so the Hourly Production table always has data for the
 * active hour as soon as counters are incremented. Skipped while all totals
 * are still 0 so idle hours don't pollute the table. Uses refs (not effect
 * dependencies) so the interval is set up exactly once and always reads the
 * freshest state/updateState, avoiding a stale-closure bug where a snapshot
 * would revert unrelated fields to whatever they were at mount.
 */
export function useHourlySnapshot(
  current: ProductionState,
  updateState: (next: ProductionState) => void,
): void {
  const currentRef = useRef(current);
  const updateStateRef = useRef(updateState);
  const lastBcRef = useRef<Record<string, HourlySnapshot>>({});
  const lastShaftRef = useRef<Record<string, HourlySnapshot>>({});
  const lastCamRef = useRef<Record<string, HourlySnapshot>>({});
  const lastCrankRef = useRef<Record<string, HourlySnapshot>>({});

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { updateStateRef.current = updateState; }, [updateState]);

  function record(state: ProductionState, update: (next: ProductionState) => void) {
    if (getGrandTotal(state) === 0) return;
    const key = hourKey();
    const bc = groupSnapshot(state, 'bc');
    const shaft = groupSnapshot(state, 'shaft');
    const cam = groupSnapshot(state, 3);
    const crank = groupSnapshot(state, 4);
    const bcChanged = !sameSnapshot(lastBcRef.current[key], bc);
    const shaftChanged = !sameSnapshot(lastShaftRef.current[key], shaft);
    const camChanged = !sameSnapshot(lastCamRef.current[key], cam);
    const crankChanged = !sameSnapshot(lastCrankRef.current[key], crank);
    if (!bcChanged && !shaftChanged && !camChanged && !crankChanged) return;

    lastBcRef.current = { ...lastBcRef.current, [key]: bc };
    lastShaftRef.current = { ...lastShaftRef.current, [key]: shaft };
    lastCamRef.current = { ...lastCamRef.current, [key]: cam };
    lastCrankRef.current = { ...lastCrankRef.current, [key]: crank };
    update({
      ...state,
      hourlyData: { ...state.hourlyData, [key]: bc },
      hourlyDataShaft: { ...(state.hourlyDataShaft ?? {}), [key]: shaft },
      hourlyDataCam: { ...(state.hourlyDataCam ?? {}), [key]: cam },
      hourlyDataCrank: { ...(state.hourlyDataCrank ?? {}), [key]: crank },
    });
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
