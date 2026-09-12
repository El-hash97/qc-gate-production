import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { LineParetoChart } from '@/components/production/LineParetoChart';
import type { LineParetoBar } from '@/utils/defectLines';

const bars: LineParetoBar[] = [
  { line: 'Melting', total: 10, percent: 50, breakdown: [{ type: 'Gas Hole Cope', count: 10, percent: 100 }] },
  { line: 'Moulding', total: 10, percent: 50, breakdown: [{ type: 'Gas Hole Drag', count: 10, percent: 100 }] },
  { line: 'Core Making', total: 0, percent: 0, breakdown: [] },
  { line: 'Finishing', total: 0, percent: 0, breakdown: [] },
];

describe('LineParetoChart', () => {
  beforeEach(() => chartSpy.mockClear());

  it("draws one bar per fixed line, in order, height = that line's percent share", () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.data.labels).toEqual(['Melting', 'Moulding', 'Core Making', 'Finishing']);
    expect(props.data.datasets[0].data).toEqual([50, 50, 0, 0]);
  });

  it('y axis ticks render as percentages', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.scales.y.ticks.callback(50)).toBe('50%');
  });

  it('tooltip label shows the line total and percent', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.tooltip.callbacks.label({ dataIndex: 0 })).toBe('10 pcs (50%)');
  });

  it("tooltip afterLabel breaks the line down by contributing defect type, each with its own percent", () => {
    const withBreakdown: LineParetoBar[] = [
      {
        line: 'Melting', total: 40, percent: 100,
        breakdown: [
          { type: 'Gas Hole Cope', count: 30, percent: 75 },
          { type: 'Kandama Front', count: 10, percent: 25 },
        ],
      },
      bars[1], bars[2], bars[3],
    ];
    render(<LineParetoChart bars={withBreakdown} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.tooltip.callbacks.afterLabel({ dataIndex: 0 })).toEqual([
      'Gas Hole Cope: 30 pcs (75%)',
      'Kandama Front: 10 pcs (25%)',
    ]);
  });

  it('datalabel shows the pcs count above each bar', () => {
    render(<LineParetoChart bars={bars} />);
    const [props] = chartSpy.mock.calls[0];
    expect(props.options.plugins.datalabels.formatter(50, { dataIndex: 0 })).toBe('10 pcs');
  });
});
