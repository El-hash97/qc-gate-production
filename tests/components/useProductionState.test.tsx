import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useProductionState } from '@/hooks/useProductionState';
import type { ProductionState } from '@/lib/types';

const baseState: ProductionState = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 1, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '2026-08-05T07:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProductionState', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ success: true, data: baseState }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the initial state from GET /api/state', async () => {
    const { result } = renderHook(() => useProductionState(), { wrapper });
    await waitFor(() => expect(result.current.state).toEqual(baseState));
  });

  it('applies an optimistic update immediately when updateState is called', async () => {
    const { result } = renderHook(() => useProductionState(), { wrapper });
    await waitFor(() => expect(result.current.state).toEqual(baseState));

    const updated = { ...baseState, ok1: 2 };
    act(() => {
      result.current.updateState(updated);
    });

    await waitFor(() => expect(result.current.state?.ok1).toBe(2));
  });
});
