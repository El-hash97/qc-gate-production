import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const barSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Bar: (props: any) => { barSpy(props); return <div data-testid="bar-chart" />; },
  Doughnut: () => null,
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { ParetoChart } from '@/components/production/ParetoChart';

describe('ParetoChart', () => {
  beforeEach(() => {
    barSpy.mockClear();
  });

  it('sorts entries by count descending before charting', () => {
    render(<ParetoChart data={{ 'Gomi Drag': 2, Kake: 5 }} color="#dc2626" />);
    const [props] = barSpy.mock.calls[0];
    expect(props.data.labels).toEqual(['Kake', 'Gomi Drag']);
    expect(props.data.datasets[0].data).toEqual([5, 2]);
  });

  it('renders an empty chart when there is no data', () => {
    render(<ParetoChart data={{}} color="#dc2626" />);
    const [props] = barSpy.mock.calls[0];
    expect(props.data.labels).toEqual([]);
  });
});
