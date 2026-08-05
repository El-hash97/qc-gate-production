'use client';

import { useQuery } from '@tanstack/react-query';
import type { HistoryRecord } from '@/lib/types';

export interface HistoryFilters {
  date?: string;
  shift?: string;
}

interface HistoryResponse {
  success: boolean;
  data: HistoryRecord[];
  error?: string;
}

async function fetchHistory(filters: HistoryFilters): Promise<HistoryRecord[]> {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.shift) params.set('shift', filters.shift);

  const res = await fetch(`/api/history?${params.toString()}`);
  const json: HistoryResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load history');
  return json.data;
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ['history', filters],
    queryFn: () => fetchHistory(filters),
  });
}
