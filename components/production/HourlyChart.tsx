'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import type { HourlySnapshot } from '@/lib/types';
import { hourlySeries } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

interface HourlyChartProps {
  hourlyData: Record<string, HourlySnapshot>;
  // Shift target for the reference line. Only passed on the combined ("Semua")
  // view — the stored target is not split per line.
  target?: number;
}

export function HourlyChart({ hourlyData, target }: HourlyChartProps) {
  const { hours, ok, repair, ng, cumulative } = hourlySeries(hourlyData);
  const ct = useChartTheme();

  const datasets: any[] = [
    { type: 'bar' as const, label: 'OK', data: ok, backgroundColor: '#22c55e', stack: 'h', yAxisID: 'y', order: 3 },
    { type: 'bar' as const, label: 'Repair', data: repair, backgroundColor: '#f59e0b', stack: 'h', yAxisID: 'y', order: 3 },
    { type: 'bar' as const, label: 'NG', data: ng, backgroundColor: '#dc2626', stack: 'h', yAxisID: 'y', order: 3 },
    {
      type: 'line' as const,
      label: 'Kumulatif',
      data: cumulative,
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
      data: hours.map(() => target),
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
      data={{ labels: hours, datasets }}
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
