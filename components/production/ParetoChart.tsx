'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import { pareto } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

interface ParetoChartProps {
  data: Record<string, number>;
  color: string;
}

// Horizontal Pareto: bars (count, sorted desc) on the bottom axis + a cumulative
// percentage line on a 0–100 top axis, sharing the category (y) axis.
export function ParetoChart({ data, color }: ParetoChartProps) {
  const { labels, counts, cumulativePct } = pareto(data);
  const ct = useChartTheme();

  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [
          {
            type: 'bar' as const,
            data: counts,
            backgroundColor: color,
            borderRadius: 4,
            xAxisID: 'x',
            order: 2,
          },
          {
            type: 'line' as const,
            data: cumulativePct,
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
            display: (ctx) => ctx.datasetIndex === 0,
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
