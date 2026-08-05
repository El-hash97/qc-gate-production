'use client';

import { useEffect, useRef } from 'react';
import { getOkTotal, getRepairTotal, getNgTotal, getGrandTotal } from '@/utils/rates';
import type { ProductionState } from '@/lib/types';

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Records an hourly OK/Repair/NG snapshot every 5 minutes, keyed by the
 * current hour (e.g. "14:00") — matches the original app's
 * `setInterval(updateHourlyTable, 300000)` behavior. Skips recording while
 * totals are still 0 so idle hours don't pollute the table. Uses refs (not
 * effect dependencies) so the interval is set up exactly once and always
 * reads the freshest state/updateState, avoiding a stale-closure bug where
 * a snapshot would revert unrelated fields to whatever they were at mount.
 */
export function useHourlySnapshot(
  current: ProductionState,
  updateState: (next: ProductionState) => void,
): void {
  const currentRef = useRef(current);
  const updateStateRef = useRef(updateState);

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { updateStateRef.current = updateState; }, [updateState]);

  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = currentRef.current;
      const total = getGrandTotal(snapshot);
      if (total === 0) return;

      const now = new Date();
      const key = `${String(now.getHours()).padStart(2, '0')}:00`;

      updateStateRef.current({
        ...snapshot,
        hourlyData: {
          ...snapshot.hourlyData,
          [key]: { ok: getOkTotal(snapshot), repair: getRepairTotal(snapshot), ng: getNgTotal(snapshot) },
        },
      });
    }, SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);
}
