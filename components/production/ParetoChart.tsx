'use client';

import '@/lib/chartSetup';
import { Bar } from 'react-chartjs-2';

interface ParetoChartProps {
  data: Record<string, number>;
  color: string;
}

export function ParetoChart({ data, color }: ParetoChartProps) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <Bar
      data={{
        labels: sorted.map(([name]) => name),
        datasets: [{ data: sorted.map(([, count]) => count), backgroundColor: color, borderRadius: 4 }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        // No animation on refresh — keeps the bars steady while the dashboard
        // polls instead of re-growing them from zero each time.
        animation: false,
        plugins: {
          legend: { display: false },
          datalabels: { color: '#f0f1f5', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45, color: '#9ca3b8' } },
          y: { grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true, ticks: { color: '#9ca3b8', stepSize: 1 } },
        },
      }}
    />
  );
}
