'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Archived shifts only change at a reset; the Overview's useLivePoll keeps
// this fresh, and the shift running now comes from the live production state.

// archived: blocks of all archived shifts; baseline: the count at the last reset
export interface BlockCounter {
  archived: number;
  baseline: number;
}

async function call(method: 'GET' | 'POST'): Promise<BlockCounter> {
  const json = await (await fetch('/api/blocks-produced', { method })).json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load blocks produced');
  return json.data;
}

export function useBlocksProduced() {
  return useQuery({ queryKey: ['blocksProduced'], queryFn: () => call('GET'), refetchOnWindowFocus: false });
}

export function useResetBlockCounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call('POST'),
    onSuccess: (counter) => queryClient.setQueryData(['blocksProduced'], counter),
  });
}
