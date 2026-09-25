'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import type { OeeBreakdown } from '@/utils/oee';
import { hourlyOeeSeries, padLabels } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

interface HourlyOeeChartProps {
  // Per-hour OEE factors, keyed "HH:00" — the same map the Hourly table reads.
  oee: Record<string, OeeBreakdown>;
}

// OEE is the emphasised line; AV/PE/RQ are its thinner components.
const LINES = [
  { key: 'oee', label: 'OEE', color: '#22c55e', width: 2.5, order: 1 },
  { key: 'av', label: 'AV', color: '#60a5fa', width: 1.5, order: 2 },
  { key: 'pe', label: 'PE', color: '#a78bfa', width: 1.5, order: 2 },
  { key: 'rq', label: 'RQ', color: '#f59e0b', width: 1.5, order: 2 },
] as const;

export function HourlyOeeChart({ oee }: HourlyOeeChartProps) {
  const series = hourlyOeeSeries(oee);
  const ct = useChartTheme();

  // Match the Hourly bar chart's minimum slot count so the two line up.
  const labels = padLabels(series.hours);
  const real = series.hours.length;

  const datasets = LINES.map(({ key, label, color, width, order }) => ({
    label,
    data: labels.map((_, i) => (i < real ? series[key][i] : null)),
    borderColor: color,
    backgroundColor: color,
    borderWidth: width,
    pointRadius: 2,
    tension: 0.25,
    spanGaps: true,
    order,
  }));

  return (
    <Chart
      type="line"
      data={{ labels, datasets }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        clip: false,
        layout: { padding: { top: 10, bottom: 4, left: 4, right: 8 } },
        plugins: {
          legend: { position: 'bottom', labels: { color: ct.tick, padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } } },
          datalabels: { display: false },
          tooltip: { callbacks: { label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) => `${c.dataset.label}: ${c.parsed.y ?? 0}%` } },
        },
        scales: {
          x: { offset: true, grid: { display: false }, ticks: { color: ct.tick, font: { size: 9 } } },
          y: {
            suggestedMin: 0,
            suggestedMax: 100,
            grace: '8%',
            grid: {
              color: (ctx: { tick: { value: number } }) =>
                ctx.tick.value >= 0 && ctx.tick.value <= 100 ? ct.grid : 'transparent',
            },
            ticks: {
              color: ct.tick,
              stepSize: 20,
              callback: (v: number | string) => {
                const n = Number(v);
                return n >= 0 && n <= 100 ? `${n}%` : '';
              },
            },
            border: { display: false },
          },
        },
        elements: { point: { hitRadius: 8 }, line: { capBezierPoints: false } },
      }}
    />
  );
}
