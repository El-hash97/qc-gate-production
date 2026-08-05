'use client';

import { useEffect, useRef } from 'react';
import { getOkTotal, getRepairTotal, getNgTotal, getGrandTotal } from '@/utils/rates';
import type { ProductionState } from '@/lib/types';

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

function buildSnapshot(state: ProductionState) {
  const now = new Date();
  const key = `${String(now.getHours()).padStart(2, '0')}:00`;
  return {
    key,
    values: { ok: getOkTotal(state), repair: getRepairTotal(state), ng: getNgTotal(state) },
  };
}

/**
 * Records hourly OK/Repair/NG snapshots keyed by the current hour (e.g.
 * "14:00"). A snapshot is written immediately on every state change and then
 * refreshed on a 5-minute interval, so the Hourly Production table always has
 * data for the active hour as soon as counters are incremented. Skipped while
 * totals are still 0 so idle hours don't pollute the table. Uses refs (not
 * effect dependencies) so the interval is set up exactly once and always
 * reads the freshest state/updateState, avoiding a stale-closure bug where a
 * snapshot would revert unrelated fields to whatever they were at mount.
 */
export function useHourlySnapshot(
  current: ProductionState,
  updateState: (next: ProductionState) => void,
): void {
  const currentRef = useRef(current);
  const updateStateRef = useRef(updateState);
  const lastRecordedRef = useRef<Record<string, { ok: number; repair: number; ng: number }>>({});

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { updateStateRef.current = updateState; }, [updateState]);

  useEffect(() => {
    function recordFromRef() {
      const snapshot = currentRef.current;
      if (getGrandTotal(snapshot) === 0) return;
      const { key, values } = buildSnapshot(snapshot);
      const last = lastRecordedRef.current[key];
      if (last && last.ok === values.ok && last.repair === values.repair && last.ng === values.ng) return;
      lastRecordedRef.current = { ...lastRecordedRef.current, [key]: values };
      updateStateRef.current({ ...snapshot, hourlyData: { ...snapshot.hourlyData, [key]: values } });
    }

    const interval = setInterval(recordFromRef, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (getGrandTotal(current) === 0) return;
    const { key, values } = buildSnapshot(current);
    const last = lastRecordedRef.current[key];
    if (last && last.ok === values.ok && last.repair === values.repair && last.ng === values.ng) return;
    lastRecordedRef.current = { ...lastRecordedRef.current, [key]: values };
    updateState({ ...current, hourlyData: { ...current.hourlyData, [key]: values } });
  }, [current]);
}
