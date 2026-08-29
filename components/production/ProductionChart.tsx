'use client';

import '@/lib/chartSetup';
import { Doughnut } from 'react-chartjs-2';
import { useChartTheme } from '@/hooks/useTheme';

interface ProductionChartProps {
  ok: number;
  repair: number;
  ng: number;
}

const ROWS: { key: 'ok' | 'repair' | 'ng'; label: string; color: string }[] = [
  { key: 'ok', label: 'OK', color: '#22c55e' },
  { key: 'repair', label: 'Repair', color: '#f59e0b' },
  { key: 'ng', label: 'NG', color: '#dc2626' },
];

export function ProductionChart({ ok, repair, ng }: ProductionChartProps) {
  const values = { ok, repair, ng };
  const total = ok + repair + ng;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const ct = useChartTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
      <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0, height: '100%' }}>
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
            // No enter/update animation — the dashboard polls every few seconds and
            // a re-spinning donut on each refresh reads as the chart "jumping".
            animation: false,
            cutout: '55%',
            plugins: {
              legend: { display: false },
              datalabels: {
                color: '#fff',
                font: { weight: 'bold', size: 12 },
                formatter: (value: number) => (total === 0 || value === 0 ? '' : value),
              },
            },
          }}
        />
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        {ROWS.map((row) => (
          <li key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
            <span style={{ color: ct.tick, minWidth: 44 }}>{row.label}</span>
            <span style={{ fontWeight: 700, color: ct.label }}>{values[row.key]}</span>
            <span style={{ color: ct.tick }}>· {pct(values[row.key])}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
