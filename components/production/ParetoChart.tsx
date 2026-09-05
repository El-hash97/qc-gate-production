'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import { pareto, padLabels } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

// Grey, low-opacity fill for the wireframe skeleton slots.
const GHOST = 'rgba(148, 163, 184, 0.15)';

// Pareto bars, worst offender first: red, then yellow, orange, warm fades.
const PARETO_COLORS = ['#dc2626', '#eab308', '#f97316', '#f59e0b', '#fb923c', '#facc15', '#fdba74'];

interface ParetoChartProps {
  data: Record<string, number>;
  // Every real bar doubles as an upload/view button for a per-defect photo.
  // hasPhoto is checked per defect label; onBarClick receives the defect name.
  hasPhoto?: (defectType: string) => boolean;
  onBarClick?: (defectType: string) => void;
}

// Vertical Pareto bar chart: one bar per defect/repair type, tallest (most
// frequent) on the left. Bar height is that type's share of the total (y axis
// in %); the raw pcs count sits above each bar. Sparse data is padded with
// faint grey skeleton bars so 1-2 types don't render as giant blocks.
export function ParetoChart({ data, hasPhoto, onBarClick }: ParetoChartProps) {
  const { labels, counts } = pareto(data);
  const ct = useChartTheme();

  const total = counts.reduce((sum, n) => sum + n, 0);
  const pct = counts.map((n) => (total === 0 ? 0 : Math.round((n / total) * 100)));

  const paddedLabels = padLabels(labels);
  const real = counts.length;
  const skeletonPct = real > 0 ? Math.max(...pct) : 40;
  const barData = paddedLabels.map((_, i) => (i < real ? pct[i] : skeletonPct));
  const barColor = paddedLabels.map((_, i) =>
    i < real ? (PARETO_COLORS[i] ?? PARETO_COLORS[PARETO_COLORS.length - 1]) : GHOST,
  );

  // Leave hasPhoto/onBarClick undefined when view === 'all' (no photo slot).
  const clickable = typeof onBarClick === 'function';

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
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        // No animation on refresh — keeps the chart steady while the dashboard polls.
        animation: false,
        // Any real bar opens its defect-photo upload/view modal; ghost/skeleton bars do nothing.
        onClick: (_event, elements) => {
          const idx = elements[0]?.index;
          if (idx == null || idx >= real || !clickable) return;
          onBarClick?.(labels[idx]);
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (!target) return;
          const idx = elements[0]?.index;
          target.style.cursor = idx != null && idx < real && clickable ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => (c.dataIndex < real ? `${counts[c.dataIndex]} pcs (${pct[c.dataIndex]}%)` : ''),
            },
          },
          datalabels: {
            display: (c) => c.datasetIndex === 0 && c.dataIndex < real,
            color: ct.label,
            anchor: 'end',
            align: 'top',
            offset: 2,
            font: { weight: 'bold', size: 11 },
            // Camera/plus icon per bar hints it's clickable and whether that defect already has a photo.
            formatter: (_v, c) => {
              if (c.dataIndex >= real) return '';
              const label = labels[c.dataIndex];
              const has = hasPhoto?.(label) ?? false;
              const icon = clickable ? (has ? ' 📷' : ' ➕') : '';
              return `${counts[c.dataIndex]} pcs${icon}`;
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: ct.tick, font: { size: 10 } } },
          y: {
            beginAtZero: true,
            // headroom so the pcs label above the tallest bar isn't clipped
            grace: '15%',
            grid: { color: ct.grid },
            ticks: { color: ct.tick, callback: (v) => `${v}%` },
          },
        },
      }}
    />
  );
}
