import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { HourlyChart } from '@/components/production/HourlyChart';

const hourly = {
  '09:00': { ok: 8, repair: 1, ng: 1 },
  '10:00': { ok: 6, repair: 0, ng: 0 },
};

describe('HourlyChart', () => {
  beforeEach(() => chartSpy.mockClear());

  it('plots OK/Repair/NG bars plus a cumulative line', () => {
    render(<HourlyChart hourlyData={hourly} />);
    const [props] = chartSpy.mock.calls[0];
    // padded to >= 4 hour slots so a 2-hour shift doesn't draw as giant bars
    expect(props.data.labels.length).toBe(4);
    expect(props.data.labels.slice(0, 2)).toEqual(['09:00', '10:00']);
    const cumulative = props.data.datasets.find((d: any) => d.label === 'Kumulatif');
    expect(cumulative.data).toEqual([10, 16, null, null]);
    expect(props.data.datasets.some((d: any) => d.label === 'Target')).toBe(false);
  });

  it('adds a flat target line when a target is given', () => {
    render(<HourlyChart hourlyData={hourly} target={100} />);
    const [props] = chartSpy.mock.calls[0];
    const target = props.data.datasets.find((d: any) => d.label === 'Target');
    expect(target.data).toEqual([100, 100, null, null]);
  });
});
