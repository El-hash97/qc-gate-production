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
  // Leftmost bar (today's top offender) doubles as an upload/view button for
  // a "what does this defect look like right now" photo — see onFirstBarClick.
  hasPhoto?: boolean;
  onFirstBarClick?: () => void;
}

// Vertical Pareto bar chart: one bar per defect/repair type, tallest (most
// frequent) on the left. Bar height is that type's share of the total (y axis
// in %); the raw pcs count sits above each bar. Sparse data is padded with
// faint grey skeleton bars so 1-2 types don't render as giant blocks.
export function ParetoChart({ data, hasPhoto = false, onFirstBarClick }: ParetoChartProps) {
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
        // Leftmost real bar (today's top offender) opens the defect-photo
        // upload/view modal; ghost/skeleton bars (no real data yet) do nothing.
        onClick: (_event, elements) => {
          if (real > 0 && elements[0]?.index === 0) onFirstBarClick?.();
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (!target) return;
          target.style.cursor = real > 0 && elements[0]?.index === 0 ? 'pointer' : 'default';
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
            // Camera icon on the top-offender bar hints it's clickable, and
            // shows at a glance whether that defect already has a photo.
            formatter: (_v, c) => `${counts[c.dataIndex]} pcs${c.dataIndex === 0 ? (hasPhoto ? ' 📷' : ' ➕') : ''}`,
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
