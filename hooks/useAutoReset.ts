'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import { latestCutoff } from '@/utils/shiftReset';

const CHECK_INTERVAL_MS = 30_000;

// Asks the server to archive + reset the shift once per changeover (07:10 /
// 19:50 WIB): on mount, then whenever the clock passes the next changeover.
// The server decides and resets at most once, so every open tab can call it.
// Afterwards the shared state is refetched so this tab drops the old shift.
export function useAutoReset() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    async function check() {
      const cutoff = latestCutoff(new Date()).getTime();
      if (firedFor.current === cutoff) return;
      firedFor.current = cutoff;
      try {
        const res = await fetch('/api/auto-reset', { method: 'POST' });
        const json = await res.json();
        if (json.success && json.reset) {
          queryClient.setQueryData(['productionState'], json.state);
          showToast('Shift otomatis disimpan ke History dan di-reset', 'success');
        }
      } catch {
        firedFor.current = null; // network hiccup - retry on the next tick
      }
      await queryClient.invalidateQueries({ queryKey: ['productionState'] });
    }
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [queryClient, showToast]);
}
