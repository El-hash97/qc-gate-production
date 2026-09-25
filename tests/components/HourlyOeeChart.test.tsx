import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { HourlyOeeChart } from '@/components/production/HourlyOeeChart';

const oee = {
  '09:00': { av: 1, pe: 0.8333, rq: 0.9, oee: 0.75 },
  '10:00': { av: 0.5, pe: 1, rq: 0.8, oee: 0.4 },
};

describe('HourlyOeeChart', () => {
  beforeEach(() => chartSpy.mockClear());

  it('plots AV/PE/RQ/OEE as per-hour percentage lines', () => {
    render(<HourlyOeeChart oee={oee} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.type).toBe('line');
    // padded to >= 4 hour slots, real hours first
    expect(props.data.labels.length).toBe(4);
    expect(props.data.labels.slice(0, 2)).toEqual(['09:00', '10:00']);

    const byLabel = Object.fromEntries(props.data.datasets.map((d: any) => [d.label, d]));
    expect(Object.keys(byLabel).sort()).toEqual(['AV', 'OEE', 'PE', 'RQ']);
    expect(byLabel.OEE.data).toEqual([75, 40, null, null]);
    expect(byLabel.AV.data).toEqual([100, 50, null, null]);
    expect(byLabel.PE.data).toEqual([83, 100, null, null]);
    expect(byLabel.RQ.data).toEqual([90, 80, null, null]);
  });

  it('locks the y-axis to 0-100% with breathing room and x offset', () => {
    render(<HourlyOeeChart oee={oee} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.scales.y.suggestedMin).toBe(0);
    expect(props.options.scales.y.suggestedMax).toBe(100);
    expect(props.options.scales.y.grace).toBe('8%');
    expect(props.options.scales.x.offset).toBe(true);
    expect(props.options.clip).toBe(false);
  });
});
