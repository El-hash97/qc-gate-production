import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHourlySnapshot } from '@/hooks/useHourlySnapshot';
import type { ProductionState } from '@/lib/types';

const baseState: ProductionState = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 5, repair1: 1, ng1: 0, ok2: 3, repair2: 0, ng2: 1,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  entryLogs: [], savedAt: '',
};

describe('useHourlySnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a snapshot keyed by the current hour after 5 minutes', () => {
    const updateState = vi.fn();
    renderHook(() => useHourlySnapshot(baseState, updateState));

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(updateState).toHaveBeenCalledTimes(1);
    const [arg] = updateState.mock.calls[0];
    expect(arg.hourlyData).toEqual({ '14:00': { ok: 8, repair: 1, ng: 1 } });
  });

  it('records Camshaft (line 3) and Crankshaft (line 4) hourly separately', () => {
    const updateState = vi.fn();
    const shaft = { ...baseState, ok3: 4, ng3: 1, ok4: 2, repair4: 1 };
    renderHook(() => useHourlySnapshot(shaft, updateState));

    vi.advanceTimersByTime(5 * 60 * 1000);

    const [arg] = updateState.mock.calls[0];
    expect(arg.hourlyDataCam).toEqual({ '14:00': { ok: 4, repair: 0, ng: 1 } });
    expect(arg.hourlyDataCrank).toEqual({ '14:00': { ok: 2, repair: 1, ng: 0 } });
    expect(arg.hourlyDataShaft).toEqual({ '14:00': { ok: 6, repair: 1, ng: 1 } });
  });

  it('does not record a snapshot while totals are still 0', () => {
    const updateState = vi.fn();
    const empty = { ...baseState, ok1: 0, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0 };
    renderHook(() => useHourlySnapshot(empty, updateState));

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(updateState).not.toHaveBeenCalled();
  });

  it('always reads the latest state even if it changed after mount', () => {
    const updateState = vi.fn();
    const { rerender } = renderHook(
      ({ state }) => useHourlySnapshot(state, updateState),
      { initialProps: { state: baseState } },
    );

    const updated = { ...baseState, ok1: 99 };
    rerender({ state: updated });

    vi.advanceTimersByTime(5 * 60 * 1000);

    // A snapshot is written on mount and again when state changes; the last
    // one must reflect the freshest counters (99 + 3), not the mount value.
    const lastCall = updateState.mock.calls[updateState.mock.calls.length - 1];
    expect(lastCall[0].hourlyData['14:00'].ok).toBe(102);
  });
});
