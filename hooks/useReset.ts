'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductionState } from '@/lib/types';

interface ResetResponse {
  success: boolean;
  data?: ProductionState;
  error?: string;
}

async function postReset(password: string): Promise<ProductionState> {
  const res = await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json: ResetResponse = await res.json();
  if (!json.success || !json.data) throw new Error(json.error ?? 'Reset failed');
  return json.data;
}

export function useReset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postReset,
    onSuccess: (freshState) => {
      queryClient.setQueryData(['productionState'], freshState);
    },
  });
}
