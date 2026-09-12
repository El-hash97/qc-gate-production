'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import { useChartTheme } from '@/hooks/useTheme';
import type { LineParetoBar } from '@/utils/defectLines';

// One fixed colour per line (not a Pareto ranking gradient — these are 4
// fixed categories, not sorted by size).
const LINE_COLORS: Record<string, string> = {
  Melting: '#dc2626',
  Moulding: '#3b82f6',
  'Core Making': '#22c55e',
  Finishing: '#a855f7',
};

interface LineParetoChartProps {
  bars: LineParetoBar[];
}

// Fixed 4-bar chart: one bar per foundry process line, height = that line's
// share of the 4-bar total. Unlike ParetoChart (one bar per defect type,
// tallest first), the category set and order here never change.
export function LineParetoChart({ bars }: LineParetoChartProps) {
  const ct = useChartTheme();
  const labels = bars.map((b) => b.line);
  const data = bars.map((b) => b.percent);
  const colors = bars.map((b) => LINE_COLORS[b.line] ?? '#94a3b8');

  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [{ type: 'bar' as const, data, backgroundColor: colors, borderRadius: 4 }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: { dataIndex: number }) => {
                const bar = bars[c.dataIndex];
                return `${bar.total} pcs (${bar.percent}%)`;
              },
              afterLabel: (c: { dataIndex: number }) => {
                const bar = bars[c.dataIndex];
                return bar.breakdown.map((item) => `${item.type}: ${item.count} pcs (${item.percent}%)`);
              },
            },
          },
          datalabels: {
            display: true,
            color: ct.label,
            anchor: 'end',
            align: 'top',
            offset: 2,
            font: { weight: 'bold', size: 11 },
            formatter: (_v: number, c: { dataIndex: number }) => `${bars[c.dataIndex].total} pcs`,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: ct.tick, font: { size: 10 } } },
          y: {
            beginAtZero: true,
            max: 100,
            grace: '15%',
            grid: { color: ct.grid },
            ticks: { color: ct.tick, callback: (v: number | string) => `${v}%` },
          },
        },
      }}
    />
  );
}
