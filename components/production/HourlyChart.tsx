'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import type { HourlySnapshot } from '@/lib/types';
import { hourlySeries, padLabels } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

// Grey, low-opacity fill for the wireframe skeleton slots.
const GHOST = 'rgba(148, 163, 184, 0.15)';

interface HourlyChartProps {
  hourlyData: Record<string, HourlySnapshot>;
  // Shift target for the reference line. Only passed on the combined ("Semua")
  // view — the stored target is not split per line.
  target?: number;
}

export function HourlyChart({ hourlyData, target }: HourlyChartProps) {
  const { hours, ok, repair, ng, cumulative } = hourlySeries(hourlyData);
  const ct = useChartTheme();

  // Keep at least MIN_CHART_SLOTS hour slots so a shift with 1-2 recorded hours
  // doesn't render as a couple of giant bars. The extra slots show a faint grey
  // skeleton bar (on-scale with the busiest real hour) so it reads as a wireframe.
  const labels = padLabels(hours);
  const real = hours.length;
  const skeleton = Math.max(1, ...hours.map((_, i) => ok[i] + repair[i] + ng[i]));
  const pad = (arr: number[]) => labels.map((_, i) => (i < real ? arr[i] : null));

  const datasets: any[] = [
    {
      type: 'bar' as const, label: 'OK', stack: 'h', yAxisID: 'y', order: 3,
      data: labels.map((_, i) => (i < real ? ok[i] : skeleton)),
      backgroundColor: labels.map((_, i) => (i < real ? '#22c55e' : GHOST)),
    },
    { type: 'bar' as const, label: 'Repair', data: pad(repair), backgroundColor: '#f59e0b', stack: 'h', yAxisID: 'y', order: 3 },
    { type: 'bar' as const, label: 'NG', data: pad(ng), backgroundColor: '#dc2626', stack: 'h', yAxisID: 'y', order: 3 },
    {
      type: 'line' as const,
      label: 'Kumulatif',
      data: pad(cumulative),
      borderColor: '#60a5fa',
      backgroundColor: '#60a5fa',
      borderWidth: 2,
      pointRadius: 2,
      yAxisID: 'y2',
      order: 1,
    },
  ];

  if (target && target > 0) {
    datasets.push({
      type: 'line' as const,
      label: 'Target',
      data: labels.map((_, i) => (i < hours.length ? target : null)),
      borderColor: ct.tick,
      borderDash: [6, 4],
      borderWidth: 1,
      pointRadius: 0,
      yAxisID: 'y2',
      order: 2,
    });
  }

  return (
    <Chart
      type="bar"
      data={{ labels, datasets }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: ct.tick, padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } } },
          datalabels: { display: false },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: ct.tick, font: { size: 9 } } },
          y: { stacked: true, beginAtZero: true, grid: { color: ct.grid }, ticks: { color: ct.tick, stepSize: 1 } },
          y2: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { color: '#60a5fa' } },
        },
      }}
    />
  );
}
