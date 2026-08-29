'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductionState } from '@/lib/types';

interface RestoreResponse {
  success: boolean;
  data?: ProductionState;
  error?: string;
}

async function postRestore(id: number): Promise<ProductionState> {
  const res = await fetch(`/api/history/${id}/restore`, { method: 'POST' });
  const json: RestoreResponse = await res.json();
  if (!json.success || !json.data) throw new Error(json.error ?? 'Restore failed');
  return json.data;
}

// "Edit" a history record: pull it back into the live shift, drop it from
// history. Both the dashboard and the input page read ['productionState'], so
// priming that key makes the restored shift show up everywhere immediately.
export function useRestoreHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postRestore,
    onSuccess: (state) => {
      queryClient.setQueryData(['productionState'], state);
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
