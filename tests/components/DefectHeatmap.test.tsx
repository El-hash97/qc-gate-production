import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const chartSpy = vi.fn();
vi.mock('react-chartjs-2', () => ({
  Chart: (props: any) => { chartSpy(props); return <div data-testid="chart" />; },
}));
vi.mock('@/lib/chartSetup', () => ({}));

import { DefectHeatmap } from '@/components/production/DefectHeatmap';
import type { EntryLog } from '@/lib/types';

const bc: EntryLog = { kind: 'defect', group: 'bc', type: 'Dross', qty: 3, lot: 'L1', flask: '2' };
const shaft: EntryLog = { kind: 'defect', group: 'shaft', type: 'Kake', qty: 1, lot: 'L2', flask: '1-6' };

describe('DefectHeatmap', () => {
  beforeEach(() => chartSpy.mockClear());

  it('flask variant: one matrix keyed by the flask number', () => {
    render(<DefectHeatmap logs={[bc]} variant="flask" />);
    expect(chartSpy).toHaveBeenCalledTimes(1);
    expect(chartSpy.mock.calls[0][0].data.datasets[0].data).toEqual([
      { x: 'Dross', y: '2', v: 3, lots: ['L1'] },
    ]);
  });

  it('cavity variant: range entry lights every cavity in 1..6', () => {
    render(<DefectHeatmap logs={[shaft]} variant="cavity" />);
    const cells = chartSpy.mock.calls[0][0].data.datasets[0].data;
    expect(cells.map((c: any) => c.y)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(cells.every((c: any) => c.v === 1)).toBe(true);
  });

  it('both variant: splits the frame into two matrices (flask BC + cavity shaft)', () => {
    render(<DefectHeatmap logs={[bc, shaft]} variant="both" />);
    expect(screen.getByText('Flask (BC)')).toBeInTheDocument();
    expect(screen.getByText('Cavity (Cam / Crank)')).toBeInTheDocument();
    expect(chartSpy).toHaveBeenCalledTimes(2);
  });
});
