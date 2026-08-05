'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductionState } from '@/lib/types';

const STATE_QUERY_KEY = ['productionState'] as const;
const POLL_INTERVAL_MS = 3000;
const OPTIMISTIC_GRACE_MS = 1500;

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

  const query = useQuery({
    queryKey: STATE_QUERY_KEY,
    queryFn: fetchState,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const mutation = useMutation({
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
      setTimeout(() => {
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
