'use client';

import '@/lib/chartSetup';
import { Doughnut } from 'react-chartjs-2';

interface ProductionChartProps {
  ok: number;
  repair: number;
  ng: number;
}

export function ProductionChart({ ok, repair, ng }: ProductionChartProps) {
  const total = ok + repair + ng;

  return (
    <Doughnut
      data={{
        labels: ['OK', 'Repair', 'NG'],
        datasets: [{
          data: [ok, repair, ng],
          backgroundColor: ['#22c55e', '#f59e0b', '#dc2626'],
          borderColor: 'transparent',
          borderWidth: 0,
        }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 13 },
            formatter: (value: number) => (total === 0 || value === 0 ? '' : value),
          },
        },
      }}
    />
  );
}
