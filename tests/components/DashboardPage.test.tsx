import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({
    state: {
      date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
      ok1: 40, repair1: 2, ng1: 1, ok2: 30, repair2: 1, ng2: 0,
      defectData: { 'Gas Hole Cope': 1 }, repairData: {}, hourlyData: {}, savedAt: '',
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

  it('shows computed achievement percentage', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Achievement: 74%')).toBeInTheDocument();
  });

  it('shows connection status from the hook', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Real-time Connected')).toBeInTheDocument();
  });
});
