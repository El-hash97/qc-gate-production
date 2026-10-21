'use client';

import { useQuery } from '@tanstack/react-query';

// Archived shifts only change at a reset, so a slow poll is plenty; the shift
// running now comes from the live production state instead.
const POLL_MS = 60_000;

async function fetchBlocksProduced(): Promise<number> {
  const json = await (await fetch('/api/blocks-produced')).json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load blocks produced');
  return json.data;
}

// Blocks produced in all archived shifts.
export function useBlocksProduced() {
  return useQuery({ queryKey: ['blocksProduced'], queryFn: fetchBlocksProduced, refetchInterval: POLL_MS, refetchOnWindowFocus: false });
}
