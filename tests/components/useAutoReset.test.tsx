import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { useAutoReset } from '@/hooks/useAutoReset';

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ToastProvider>{children}</ToastProvider></QueryClientProvider>
  );
}

describe('useAutoReset', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:49:00Z')); // 19:49 WIB
    fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true, reset: false }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks once on mount, stays quiet within the same shift, and asks again after 19:50 WIB', async () => {
    const client = new QueryClient();
    renderHook(() => useAutoReset(), { wrapper: wrapper(client) });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/auto-reset', { method: 'POST' });

    // 19:49:30 — same changeover, no new request.
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Past 19:50 — the next tick asks again.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('puts the fresh state into the cache when the server reset the shift', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, reset: true, state: { ok1: 0 } }) });
    const client = new QueryClient();
    const setSpy = vi.spyOn(client, 'setQueryData');
    renderHook(() => useAutoReset(), { wrapper: wrapper(client) });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(setSpy).toHaveBeenCalledWith(['productionState'], { ok1: 0 });
  });
});
