'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DefectLineMapping, DefectLineName } from '@/lib/types';

interface ListResponse {
  success: boolean;
  data: DefectLineMapping[];
  error?: string;
}

const DEFECT_LINES_KEY = ['defectLines'] as const;

async function fetchDefectLines(): Promise<DefectLineMapping[]> {
  const res = await fetch('/api/defect-lines', { cache: 'no-store' });
  const json: ListResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Gagal memuat master data defect');
  return json.data;
}

// Reference data edited rarely by an admin, not live shift data — a plain
// query with no polling interval, unlike useDefectPhotoFlags.
export function useDefectLines() {
  const query = useQuery({ queryKey: DEFECT_LINES_KEY, queryFn: fetchDefectLines });
  return { mappings: query.data ?? [], isLoading: query.isLoading };
}

export function useAddDefectLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ line, defectName }: { line: DefectLineName; defectName: string }) => {
      const res = await fetch('/api/defect-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, defectName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal menambah defect');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFECT_LINES_KEY }),
  });
}

export function useDeleteDefectLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/defect-lines/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal menghapus defect');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFECT_LINES_KEY }),
  });
}
