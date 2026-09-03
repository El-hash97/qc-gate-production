'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import { pareto, padLabels } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

// Grey, low-opacity fill for the wireframe skeleton slots.
const GHOST = 'rgba(148, 163, 184, 0.15)';

interface ParetoChartProps {
  data: Record<string, number>;
  color: string;
}

// Horizontal Pareto: bars (count, sorted desc) on the bottom axis + a cumulative
// percentage line on a 0–100 top axis, sharing the category (y) axis.
export function ParetoChart({ data, color }: ParetoChartProps) {
  const { labels, counts, cumulativePct } = pareto(data);
  const ct = useChartTheme();

  // Keep at least MIN_CHART_SLOTS category rows so 1-2 defect types don't render
  // as a couple of giant bars. The extra rows show a faint grey skeleton bar
  // (on-scale with the real data) so the chart reads as a wireframe.
  const paddedLabels = padLabels(labels);
  const real = counts.length;
  const skeleton = Math.max(...counts, 1);
  const barData = paddedLabels.map((_, i) => (i < real ? counts[i] : skeleton));
  const barColor = paddedLabels.map((_, i) => (i < real ? color : GHOST));
  const lineData = paddedLabels.map((_, i) => (i < real ? cumulativePct[i] : null));

  return (
    <Chart
      type="bar"
      data={{
        labels: paddedLabels,
        datasets: [
          {
            type: 'bar' as const,
            data: barData,
            backgroundColor: barColor,
            borderRadius: 4,
            xAxisID: 'x',
            order: 2,
          },
          {
            type: 'line' as const,
            data: lineData,
            borderColor: '#60a5fa',
            backgroundColor: '#60a5fa',
            borderWidth: 2,
            pointRadius: 3,
            xAxisID: 'x2',
            order: 1,
          },
        ],
      }}
      options={{
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        // No animation on refresh — keeps the chart steady while the dashboard polls.
        animation: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            display: (ctx) => ctx.datasetIndex === 0 && ctx.dataIndex < real,
            color: ct.label,
            anchor: 'end',
            align: 'right',
            font: { weight: 'bold', size: 11 },
          },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: ct.grid }, ticks: { color: ct.tick, stepSize: 1 } },
          x2: {
            position: 'top',
            beginAtZero: true,
            max: 100,
            grid: { display: false },
            ticks: { color: '#60a5fa', callback: (v) => `${v}%` },
          },
          y: { grid: { display: false }, ticks: { font: { size: 9 }, color: ct.tick } },
        },
      }}
    />
  );
}
