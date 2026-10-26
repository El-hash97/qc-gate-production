'use client';

import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { FLAGS_KEY, toFlagSet } from '@/hooks/useDefectPhotos';
import { SETTINGS_KEY } from '@/components/visual/VisualPanels';
import { WINDOW_DAYS, lastDays } from '@/utils/stopHistory';

// A TV keeps its page open around the clock and every request counts toward
// Vercel's quota, so the page polls once here and fans the answer out to the
// per-panel queries (which no longer poll on their own).
const POLL_MS = 15_000;
// a save's round trip plus the hooks' 3s post-save grace window
const GRACE_MS = 6_000;

// Skip a key while it's being saved, or when its data changed (optimistic
// update, post-save refetch) recently enough that this poll's read may be stale.
export function shouldSkipLive(mutating: number, dataUpdatedAt: number, requestedAt: number): boolean {
  return mutating > 0 || dataUpdatedAt > requestedAt - GRACE_MS;
}

export function useLivePoll(page: 'overview' | 'dashboard') {
  const queryClient = useQueryClient();
  useQuery({
    queryKey: ['live', page],
    queryFn: async () => {
      const requestedAt = Date.now();
      const since = lastDays(WINDOW_DAYS, new Date())[0];
      const json = await (await fetch(`/api/live?page=${page}&since=${since}`, { cache: 'no-store' })).json();
      if (!json.success) throw new Error(json.error ?? 'Failed to load live data');
      const d = json.data;
      const entries: [QueryKey, unknown][] = page === 'dashboard'
        ? [[['productionState'], d.state], [FLAGS_KEY, toFlagSet(d.photoFlags)]]
        : [[['productionState'], d.state], [SETTINGS_KEY, d.modes ?? {}], [['blocksProduced'], d.blocks], [['lineStopHistory', since], d.lineStops]];
      for (const [key, value] of entries) {
        const updatedAt = queryClient.getQueryState(key)?.dataUpdatedAt ?? 0;
        if (!shouldSkipLive(queryClient.isMutating({ mutationKey: key }), updatedAt, requestedAt)) {
          queryClient.setQueryData(key, value);
        }
      }
      return requestedAt;
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: false,
  });
}
