'use client';

import { useQuery } from '@tanstack/react-query';
import { WINDOW_DAYS, lastDays, type DatedStop } from '@/utils/stopHistory';

// Archived shifts only change at a reset, so a slow poll is plenty; the shift
// running now comes from the live production state instead.
const POLL_MS = 60_000;

async function fetchArchived(since: string): Promise<DatedStop[]> {
  const json = await (await fetch(`/api/line-stops?since=${since}`)).json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load line stop history');
  return json.data;
}

// Line stops (with a station) of the last WINDOW_DAYS days from archived shifts.
export function useLineStopHistory() {
  const since = lastDays(WINDOW_DAYS, new Date())[0];
  return useQuery({
    queryKey: ['lineStopHistory', since],
    queryFn: () => fetchArchived(since),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: false,
  });
}
