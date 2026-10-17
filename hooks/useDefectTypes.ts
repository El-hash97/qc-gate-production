'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { typesFor } from '@/utils/constants';
import type { CustomDefectType, DefectProduct, DefectTypeKind } from '@/lib/types';

const DEFECT_TYPES_KEY = ['defectTypes'] as const;

async function fetchDefectTypes(): Promise<CustomDefectType[]> {
  const res = await fetch('/api/defect-types', { cache: 'no-store' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Gagal memuat daftar jenis');
  return json.data;
}

// Types added from Master Data (reference data, no polling). Until it loads —
// or if it fails — the pickers fall back to the built-in lists alone.
export function useDefectTypes() {
  const query = useQuery({ queryKey: DEFECT_TYPES_KEY, queryFn: fetchDefectTypes });
  return { custom: query.data ?? [], isLoading: query.isLoading };
}

// Built-in + added types for one product's NG or Repair picker, stable across
// renders so the modal's "selection still in list" check doesn't churn.
export function useTypesFor(product: DefectProduct, kind: DefectTypeKind): string[] {
  const { custom } = useDefectTypes();
  return useMemo(() => typesFor(product, kind, custom), [product, kind, custom]);
}

export function useAddDefectType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { product: DefectProduct; kind: DefectTypeKind; name: string }) => {
      const res = await fetch('/api/defect-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal menambah jenis');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFECT_TYPES_KEY }),
  });
}

export function useDeleteDefectType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/defect-types/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal menghapus jenis');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFECT_TYPES_KEY }),
  });
}
