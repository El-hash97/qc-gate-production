'use client';

import { useState } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductionState } from '@/lib/types';

const STATE_QUERY_KEY = ['productionState'] as const;
const POLL_INTERVAL_MS = 3000;
// Neon's serverless driver can take >1.5s on a cold compute; keep the grace
// window comfortably above that so a post-save poll can't land before the
// write is durable and bounce the field back to its old value.
const OPTIMISTIC_GRACE_MS = 3000;

// Exported for a direct unit test — the actual timing (fake-timer races
// against React Query's internals) isn't worth simulating end-to-end.
export function shouldPausePoll(pendingWrites: number, inGraceWindow: boolean): boolean {
  return pendingWrites > 0 || inGraceWindow;
}

interface StateResponse {
  success: boolean;
  data: ProductionState | null;
  error?: string;
}

async function fetchState(): Promise<ProductionState | null> {
  const res = await fetch('/api/state');
  const json: StateResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load state');
  return json.data;
}

async function postState(state: ProductionState): Promise<void> {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  const json: StateResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to save state');
}

export function useProductionState() {
  const queryClient = useQueryClient();
  const pendingWrites = useIsMutating({ mutationKey: STATE_QUERY_KEY });
  // True from the moment a save succeeds until OPTIMISTIC_GRACE_MS later.
  // pendingWrites alone isn't enough: it drops to 0 as soon as the POST
  // response arrives, but Neon's read path can still lag behind that write
  // for a bit — a poll landing in that gap would fetch the pre-write value
  // and bounce the field back to it.
  const [inGraceWindow, setInGraceWindow] = useState(false);

  const query = useQuery({
    queryKey: STATE_QUERY_KEY,
    queryFn: fetchState,
    // Pause the background poll while a save is in flight, and through the
    // grace window after it, so a stale GET can't overwrite what the user
    // just typed/clicked.
    refetchInterval: shouldPausePoll(pendingWrites, inGraceWindow) ? false : POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationKey: STATE_QUERY_KEY,
    mutationFn: postState,
    onMutate: async (nextState) => {
      await queryClient.cancelQueries({ queryKey: STATE_QUERY_KEY });
      const previous = queryClient.getQueryData<ProductionState | null>(STATE_QUERY_KEY);
      queryClient.setQueryData(STATE_QUERY_KEY, nextState);
      return { previous };
    },
    onError: (_err, _nextState, context) => {
      if (context) queryClient.setQueryData(STATE_QUERY_KEY, context.previous);
    },
    onSuccess: () => {
      // Grace window: don't let an in-flight background poll immediately
      // overwrite the optimistic value we just applied (mirrors the old
      // Socket.IO `_lastUserAction` 1.5s safety lock).
      setInGraceWindow(true);
      setTimeout(() => {
        setInGraceWindow(false);
        queryClient.invalidateQueries({ queryKey: STATE_QUERY_KEY });
      }, OPTIMISTIC_GRACE_MS);
    },
  });

  return {
    state: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    updateState: mutation.mutate,
    updateStateAsync: mutation.mutateAsync,
  };
}
