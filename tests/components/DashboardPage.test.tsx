import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({
    state: {
      date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 40, repair1: 2, ng1: 1, ok2: 30, repair2: 1, ng2: 0,
      ok3: 8, repair3: 1, ng3: 1, ok4: 0, repair4: 0, ng4: 0,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {},
      defectDataShaft: { Dross: 3 }, repairDataShaft: {}, hourlyDataShaft: { '09:00': { ok: 8, repair: 1, ng: 1 } },
      hourlyDataCam: { '09:00': { ok: 8, repair: 1, ng: 1 } }, hourlyDataCrank: {},
      entryLogs: [
        { kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole Cope', qty: 1, lot: 'L1', flask: 'F1' },
        { kind: 'defect', group: 'shaft', line: 3, type: 'Dross', qty: 3, lot: 'L2', flask: 'F2' },
      ],
      savedAt: '',
    },
    isFetching: false,
    isError: false,
  }),
}));
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null, Bar: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));

import DashboardPage from '@/app/dashboard/page';

describe('DashboardPage', () => {
  it('shows the current operator and shift', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Budi — Shift Red')).toBeInTheDocument();
  });

  it('shows combined achievement percentage by default', () => {
    render(<DashboardPage />);
    // BC total 74 + Camshaft/Crankshaft total 10 = 84 against a target of 100.
    expect(screen.getByText('Achievement: 84%')).toBeInTheDocument();
  });

  it('shows connection status from the hook', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Real-time Connected')).toBeInTheDocument();
  });

  it('scopes the numbers to Block Cylinder when B/C is selected', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'B/C' }));
    expect(screen.getByText('Achievement: 74%')).toBeInTheDocument();
    expect(screen.getByText('Gas Hole Cope')).toBeInTheDocument();
    expect(screen.queryByText('Dross')).not.toBeInTheDocument();
  });

  it('scopes the numbers to Camshaft (line 3) on its own tab', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    expect(screen.getByText('Achievement: 10%')).toBeInTheDocument();
    expect(screen.getByText('Dross')).toBeInTheDocument();
    expect(screen.queryByText('Gas Hole Cope')).not.toBeInTheDocument();
  });

  it('keeps Camshaft and Crankshaft separate', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Crankshaft' }));
    // the line-3 Dross entry must not show under Crankshaft (line 4)
    expect(screen.queryByText('Dross')).not.toBeInTheDocument();
    expect(screen.getByText('Achievement: 0%')).toBeInTheDocument();
  });

  it('shows per-line hourly on the Camshaft tab', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    expect(screen.getByText('Hourly Production')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });
});
