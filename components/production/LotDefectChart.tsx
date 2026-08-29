'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import type { EntryLog } from '@/lib/types';
import { PRODUCT_LINE_COLOR, PRODUCT_LINE_LABELS } from '@/lib/types';
import { lotDefectData } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

// Dot-with-line: x = defect name, y = lot number (axis tops out at the highest
// lot entered). One series per product line, in that product's identity colour.
// Tooltip carries the flask/cavity spec and the qty for each point.
export function LotDefectChart({ logs }: { logs: EntryLog[] }) {
  const { types, maxLot, series } = lotDefectData(logs);
  const ct = useChartTheme();

  if (series.length === 0) {
    return <div style={{ fontSize: 13, color: ct.tick, padding: '8px 0' }}>Belum ada data</div>;
  }

  // Integer step that lands ~9–10 numbered ticks on the lot axis.
  const lotStep = Math.max(1, Math.ceil((maxLot || 1) / 9));

  return (
    <Chart
      type="line"
      data={{
        datasets: series.map((s) => ({
          label: PRODUCT_LINE_LABELS[s.line],
          data: s.points as any,
          borderColor: PRODUCT_LINE_COLOR[s.line],
          backgroundColor: PRODUCT_LINE_COLOR[s.line],
          showLine: true,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        })),
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: ct.tick, padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } } },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              title: (items: any) => String(items[0].raw.x),
              label: (item: any) => [
                `Lot: ${item.raw.y}`,
                `Flask/Cavity: ${item.raw.flask}`,
                `Qty: ${item.raw.qty}`,
              ],
            },
          },
        },
        scales: {
          x: { type: 'category', labels: types, offset: true, grid: { display: false }, ticks: { color: ct.tick, font: { size: 9 }, maxRotation: 45 } },
          y: {
            beginAtZero: true,
            max: maxLot || undefined,
            grid: { color: ct.grid },
            ticks: { color: ct.tick, precision: 0, stepSize: lotStep },
          },
        },
      }}
    />
  );
}
