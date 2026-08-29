'use client';

import '@/lib/chartSetup';
import { Chart } from 'react-chartjs-2';
import type { EntryLog } from '@/lib/types';
import { flaskTypeMatrix, cavityTypeMatrix, type FlaskMatrix } from '@/utils/charts';
import { useChartTheme } from '@/hooks/useTheme';

// rows (flask/cavity) x defect-type heatmap — cell colour tracks the summed qty,
// so a repeatedly-bad flask/cavity or a recurring defect stands out.
function Heatmap({ matrix, dense = false }: { matrix: FlaskMatrix; dense?: boolean }) {
  const { flasks, types, cells, max } = matrix;
  const ct = useChartTheme();
  const tickFont = dense ? 8 : 9;

  if (cells.length === 0) {
    return <div style={{ fontSize: dense ? 11 : 13, color: ct.tick, padding: '8px 0' }}>Belum ada data</div>;
  }

  return (
    <Chart
      type="matrix"
      data={{
        datasets: [
          {
            label: 'Qty',
            data: cells as any,
            backgroundColor: (ctx: any) => {
              const v = ctx.raw?.v ?? 0;
              const alpha = max === 0 ? 0 : 0.15 + 0.75 * (v / max);
              return `rgba(220, 38, 38, ${alpha})`;
            },
            borderWidth: 1,
            borderColor: ct.gridBorder,
            width: (ctx: any) => (ctx.chart.chartArea?.width ?? 0) / types.length - 2,
            height: (ctx: any) => (ctx.chart.chartArea?.height ?? 0) / flasks.length - 2,
          } as any,
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              title: (items: any) => `${items[0].raw.y} · ${items[0].raw.x}`,
              label: (item: any) => `Qty: ${item.raw.v}`,
              afterLabel: (item: any) =>
                item.raw.lots?.length ? `Lot: ${item.raw.lots.join(', ')}` : '',
            },
          },
        },
        scales: {
          x: { type: 'category', labels: types, offset: true, grid: { display: false }, ticks: { color: ct.tick, font: { size: tickFont }, maxRotation: 45 } },
          y: { type: 'category', labels: flasks, reverse: true, offset: true, grid: { display: false }, ticks: { color: ct.tick, font: { size: tickFont } } },
        },
      }}
    />
  );
}

// variant: 'flask' (Block Cylinder), 'cavity' (Camshaft/Crankshaft, y = 1..8),
// or 'both' — the "Semua" view, splitting one frame between flask x defect (BC
// logs) and cavity x defect (shaft logs).
export function DefectHeatmap({
  logs,
  variant,
}: {
  logs: EntryLog[];
  variant: 'flask' | 'cavity' | 'both';
}) {
  const ct = useChartTheme();

  if (variant === 'flask') return <Heatmap matrix={flaskTypeMatrix(logs)} />;
  if (variant === 'cavity') return <Heatmap matrix={cavityTypeMatrix(logs)} />;

  const captionStyle = { fontSize: 9, color: ct.tick, marginBottom: 2 } as const;
  const bcLogs = logs.filter((log) => (log.group ?? 'bc') !== 'shaft');
  const shaftLogs = logs.filter((log) => log.group === 'shaft');
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%', height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={captionStyle}>Flask (BC)</div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <Heatmap matrix={flaskTypeMatrix(bcLogs)} dense />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={captionStyle}>Cavity (Cam / Crank)</div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <Heatmap matrix={cavityTypeMatrix(shaftLogs)} dense />
        </div>
      </div>
    </div>
  );
}
