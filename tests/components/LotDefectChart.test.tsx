import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { LotDefectChart } from '@/components/production/LotDefectChart';
import { PRODUCT_LINE_COLOR } from '@/lib/types';
import type { EntryLog } from '@/lib/types';

describe('LotDefectChart', () => {
  beforeEach(() => chartSpy.mockClear());

  it('one dataset per product line, coloured by product identity, y-axis capped at the highest lot', () => {
    const logs: EntryLog[] = [
      { kind: 'defect', line: 3, type: 'Dross', qty: 1, lot: '12', flask: '1-6' },
      { kind: 'defect', line: 4, type: 'Dross', qty: 2, lot: '20', flask: '3' },
    ];
    render(<LotDefectChart logs={logs} />);
    const cfg = chartSpy.mock.calls[0][0];
    const ds = cfg.data.datasets;
    expect(ds).toHaveLength(2);
    expect(ds[0].borderColor).toBe(PRODUCT_LINE_COLOR[3]);
    expect(ds[1].borderColor).toBe(PRODUCT_LINE_COLOR[4]);
    expect(ds[1].data[0]).toMatchObject({ x: 'Dross', y: 20, flask: '3', qty: 2 });
    expect(cfg.options.scales.y.max).toBe(20);
    // integer step giving ~9-10 numbered ticks (ceil(20/9) = 3)
    expect(cfg.options.scales.y.ticks.stepSize).toBe(3);
  });

  it('shows an empty state when no log has a numeric lot', () => {
    render(<LotDefectChart logs={[{ kind: 'defect', line: 1, type: 'X', qty: 1, lot: 'n/a', flask: '1' }]} />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
    expect(chartSpy).not.toHaveBeenCalled();
  });
});
