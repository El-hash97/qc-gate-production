import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const doughnutSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: any) => { doughnutSpy(props); return <div data-testid="doughnut-chart" />; },
  Bar: () => null,
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { ProductionChart } from '@/components/production/ProductionChart';

describe('ProductionChart', () => {
  beforeEach(() => {
    doughnutSpy.mockClear();
  });

  it('passes OK/Repair/NG totals as the doughnut dataset', () => {
    render(<ProductionChart ok={10} repair={2} ng={1} />);
    const [props] = doughnutSpy.mock.calls[0];
    expect(props.data.datasets[0].data).toEqual([10, 2, 1]);
  });

  it('hides datalabels for zero-value slices', () => {
    render(<ProductionChart ok={0} repair={0} ng={0} />);
    const [props] = doughnutSpy.mock.calls[0];
    const formatted = props.options.plugins.datalabels.formatter(0);
    expect(formatted).toBe('');
  });
});
