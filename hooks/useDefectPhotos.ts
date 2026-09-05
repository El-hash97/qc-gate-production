'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';

interface FlagsResponse {
  success: boolean;
  data: { group: PhotoGroup; chartType: PhotoChartType; updatedAt: string }[];
  error?: string;
}

interface PhotoResponse {
  success: boolean;
  data: { imageData: string; updatedAt: string } | null;
  error?: string;
}

const FLAGS_KEY = ['defectPhotoFlags'] as const;
const FLAGS_POLL_MS = 5000;

async function fetchFlags(): Promise<Set<string>> {
  // no-store: a plain GET like this can get cached by the browser (confirmed
  // in testing — right after an upload, a default fetch() still served the
  // pre-upload empty list). This must always hit the server.
  const res = await fetch('/api/defect-photos', { cache: 'no-store' });
  const json: FlagsResponse = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Failed to load photo flags');
  return new Set(json.data.map((f) => `${f.group}:${f.chartType}`));
}

// Which of the 6 (group x NG/repair) slots currently have a photo — lightweight,
// polled independently of the actual image bytes.
export function useDefectPhotoFlags() {
  const query = useQuery({ queryKey: FLAGS_KEY, queryFn: fetchFlags, refetchInterval: FLAGS_POLL_MS });
  return {
    hasPhoto: (group: PhotoGroup, chartType: PhotoChartType) => query.data?.has(`${group}:${chartType}`) ?? false,
  };
}

// Fetches one slot's actual image — only enabled while its modal is open.
export function useDefectPhoto(group: PhotoGroup, chartType: PhotoChartType, enabled: boolean) {
  return useQuery({
    queryKey: ['defectPhoto', group, chartType],
    queryFn: async () => {
      const res = await fetch(`/api/defect-photos/${group}/${chartType}`, { cache: 'no-store' });
      const json: PhotoResponse = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to load photo');
      return json.data;
    },
    enabled,
  });
}

export function useUploadDefectPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ group, chartType, imageData }: { group: PhotoGroup; chartType: PhotoChartType; imageData: string }) => {
      const res = await fetch(`/api/defect-photos/${group}/${chartType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal upload foto');
    },
    onSuccess: (_data, { group, chartType }) => {
      queryClient.invalidateQueries({ queryKey: FLAGS_KEY });
      queryClient.invalidateQueries({ queryKey: ['defectPhoto', group, chartType] });
    },
  });
}

export function useDeleteDefectPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ group, chartType }: { group: PhotoGroup; chartType: PhotoChartType }) => {
      const res = await fetch(`/api/defect-photos/${group}/${chartType}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal hapus foto');
    },
    onSuccess: (_data, { group, chartType }) => {
      queryClient.invalidateQueries({ queryKey: FLAGS_KEY });
      queryClient.invalidateQueries({ queryKey: ['defectPhoto', group, chartType] });
    },
  });
}
