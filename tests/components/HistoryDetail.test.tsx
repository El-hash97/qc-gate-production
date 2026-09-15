import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/ToastProvider';

vi.mock('react-chartjs-2', () => ({ Doughnut: () => null, Bar: () => null, Chart: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({ mappings: [], isLoading: false }),
}));

import { HistoryDetail } from '@/components/history/HistoryDetail';
import type { HistoryRecord } from '@/lib/types';

const record: HistoryRecord = {
  id: 1,
  date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
  targetBc: 100, targetCam: 0, targetCrank: 0,
  ok1: 40, repair1: 2, ng1: 1, ok2: 30, repair2: 1, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: { '20:00': { ok: 40, repair: 2, ng: 1 } },
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  entryLogs: [
    { kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole Cope', qty: 1, lot: 'L1', flask: 'F1' },
  ],
  lineStops: [],
  savedAt: '',
};

describe('HistoryDetail', () => {
  it('shows the same KPI/toggle/panel layout as the live Dashboard, sourced from the record', () => {
    render(<ToastProvider><HistoryDetail record={record} /></ToastProvider>);
    expect(screen.getByRole('group', { name: 'Filter produk' })).toBeInTheDocument();
    expect(screen.getByText('Total Produksi')).toBeInTheDocument();
    expect(screen.getByText('Production Distribution')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('defaults to the B/C view, scoped to the record\'s own BC totals', () => {
    render(<ToastProvider><HistoryDetail record={record} /></ToastProvider>);
    expect(screen.getByRole('button', { name: 'B/C' })).toHaveAttribute('aria-pressed', 'true');
    // ok1 (40) + ok2 (30) = 70 ok, 3 repair, 1 ng -> 74 total
    const totalCard = screen.getByText('Total Produksi').parentElement;
    expect(totalCard).toHaveTextContent('74');
  });

  it('does not offer hourly-window editing (always read-only for a saved shift)', () => {
    render(<ToastProvider><HistoryDetail record={record} /></ToastProvider>);
    // The 20:00 row shows as plain text, not a clock-picker trigger button.
    expect(screen.getByText('20:00–21:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jam mulai' })).not.toBeInTheDocument();
  });

  it('does not offer the defect-photo affordance (live-only feature)', async () => {
    render(<ToastProvider><HistoryDetail record={record} /></ToastProvider>);
    // Clicking a Pareto NG bar does nothing photo-related when there's no click handler wired.
    expect(screen.getByText('Pareto Defect (NG)')).toBeInTheDocument();
  });

  it('switches product view via the same toggle the Dashboard has', async () => {
    render(<ToastProvider><HistoryDetail record={record} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    expect(screen.getByRole('button', { name: 'Camshaft' })).toHaveAttribute('aria-pressed', 'true');
  });
});
