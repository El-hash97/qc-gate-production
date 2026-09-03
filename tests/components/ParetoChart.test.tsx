import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
  Doughnut: () => null,
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { ParetoChart } from '@/components/production/ParetoChart';

const GHOST = 'rgba(148, 163, 184, 0.15)';

describe('ParetoChart', () => {
  beforeEach(() => {
    chartSpy.mockClear();
  });

  it('sorts entries by count descending and adds a cumulative % line', () => {
    render(<ParetoChart data={{ 'Gomi Drag': 2, Kake: 6 }} color="#dc2626" />);
    const [props] = chartSpy.mock.calls[0];
    // padded to >= 4 category slots so 2 types don't draw as giant bars
    expect(props.data.labels.length).toBe(4);
    expect(props.data.labels.slice(0, 2)).toEqual(['Kake', 'Gomi Drag']);
    // real counts first, then on-scale grey skeleton bars for the blank slots
    expect(props.data.datasets[0].data.slice(0, 2)).toEqual([6, 2]);
    expect(props.data.datasets[0].backgroundColor).toEqual([
      '#dc2626', '#dc2626', GHOST, GHOST,
    ]);
    // cumulative % line stops at the real data
    expect(props.data.datasets[1].data).toEqual([75, 100, null, null]);
  });

  it('renders a grey 4-slot wireframe when there is no data', () => {
    render(<ParetoChart data={{}} color="#dc2626" />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.data.labels.length).toBe(4);
    expect(props.data.datasets[0].backgroundColor).toEqual([GHOST, GHOST, GHOST, GHOST]);
    expect(props.data.datasets[1].data).toEqual([null, null, null, null]);
  });
});
