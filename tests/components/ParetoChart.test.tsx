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

  it('draws one vertical bar per type, tallest first, height in % of total', () => {
    render(<ParetoChart data={{ 'Gomi Drag': 2, Kake: 6 }} />);
    const [props] = chartSpy.mock.calls[0];
    // vertical bars (not indexAxis: 'y'), single dataset — no cumulative line
    expect(props.options.indexAxis).toBeUndefined();
    expect(props.data.datasets).toHaveLength(1);
    // padded to >= 4 category slots so 2 types don't draw as giant bars
    expect(props.data.labels.length).toBe(4);
    expect(props.data.labels.slice(0, 2)).toEqual(['Kake', 'Gomi Drag']);
    // bar height = share of total (6/8, 2/8), then on-scale grey skeleton bars
    expect(props.data.datasets[0].data.slice(0, 2)).toEqual([75, 25]);
    expect(props.data.datasets[0].backgroundColor).toEqual([
      '#dc2626', '#eab308', GHOST, GHOST,
    ]);
    // y axis ticks render as percentages
    expect(props.options.scales.y.ticks.callback(50)).toBe('50%');
    // pcs count above each real bar; the top-offender bar also hints it's
    // the upload/view button for a defect photo (➕ = no photo yet)
    expect(props.options.plugins.datalabels.formatter(75, { dataIndex: 0 })).toBe('6 pcs ➕');
    expect(props.options.plugins.datalabels.formatter(25, { dataIndex: 1 })).toBe('2 pcs');
  });

  it('renders a grey 4-slot wireframe when there is no data', () => {
    render(<ParetoChart data={{}} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.data.labels.length).toBe(4);
    expect(props.data.datasets[0].backgroundColor).toEqual([GHOST, GHOST, GHOST, GHOST]);
    expect(props.data.datasets[0].data).toEqual([40, 40, 40, 40]);
  });

  it('shows a camera icon on the top bar once a photo exists', () => {
    render(<ParetoChart data={{ Kake: 6 }} hasPhoto />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.datalabels.formatter(100, { dataIndex: 0 })).toBe('6 pcs 📷');
  });

  it('clicking the leftmost real bar fires onFirstBarClick', () => {
    const onFirstBarClick = vi.fn();
    render(<ParetoChart data={{ Kake: 6 }} onFirstBarClick={onFirstBarClick} />);
    const [props] = chartSpy.mock.calls[0];
    props.options.onClick({}, [{ index: 0 }]);
    expect(onFirstBarClick).toHaveBeenCalledTimes(1);
  });

  it('clicking any other bar does not fire onFirstBarClick', () => {
    const onFirstBarClick = vi.fn();
    render(<ParetoChart data={{ Kake: 6, 'Gomi Drag': 2 }} onFirstBarClick={onFirstBarClick} />);
    const [props] = chartSpy.mock.calls[0];
    props.options.onClick({}, [{ index: 1 }]);
    expect(onFirstBarClick).not.toHaveBeenCalled();
  });

  it('clicking the leftmost slot does not fire onFirstBarClick when it is only a ghost bar', () => {
    const onFirstBarClick = vi.fn();
    render(<ParetoChart data={{}} onFirstBarClick={onFirstBarClick} />);
    const [props] = chartSpy.mock.calls[0];
    props.options.onClick({}, [{ index: 0 }]);
    expect(onFirstBarClick).not.toHaveBeenCalled();
  });
});
