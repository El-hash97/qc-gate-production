import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
  Doughnut: () => null,
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { ParetoChart } from '@/components/production/ParetoChart';

describe('ParetoChart', () => {
  beforeEach(() => {
    chartSpy.mockClear();
  });

  it('sorts entries by count descending and adds a cumulative % line', () => {
    render(<ParetoChart data={{ 'Gomi Drag': 2, Kake: 6 }} color="#dc2626" />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.data.labels).toEqual(['Kake', 'Gomi Drag']);
    expect(props.data.datasets[0].data).toEqual([6, 2]);
    // second dataset = running cumulative percentage
    expect(props.data.datasets[1].data).toEqual([75, 100]);
  });

  it('renders an empty chart when there is no data', () => {
    render(<ParetoChart data={{}} color="#dc2626" />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.data.labels).toEqual([]);
  });
});
