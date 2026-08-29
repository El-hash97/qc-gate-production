import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const useHistoryMock = vi.fn();
vi.mock('@/hooks/useHistory', () => ({ useHistory: (...args: any[]) => useHistoryMock(...args) }));

const exportMock = vi.fn();
vi.mock('@/utils/excelExport', () => ({ exportShiftToExcel: (...args: any[]) => exportMock(...args) }));

const restoreMock = vi.fn();
vi.mock('@/hooks/useRestoreHistory', () => ({
  useRestoreHistory: () => ({ mutate: restoreMock, isPending: false, isError: false, error: null }),
}));
vi.mock('@/hooks/useProductionState', () => ({ useProductionState: () => ({ state: null }) }));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null, Chart: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));

import HistoryPage from '@/app/history/page';

const record = {
  id: 1, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

describe('HistoryPage', () => {
  it('renders a row per history record', () => {
    useHistoryMock.mockReturnValue({ data: [record], isLoading: false, isError: false });
    render(<HistoryPage />);
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('2026-08-04')).toBeInTheDocument();
  });

  it('shows an empty state when there is no history yet', () => {
    useHistoryMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<HistoryPage />);
    expect(screen.getByText('Belum ada histori shift')).toBeInTheDocument();
  });

  it('exports a record to Excel when its Export button is clicked', async () => {
    useHistoryMock.mockReturnValue({ data: [record], isLoading: false, isError: false });
    render(<HistoryPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(exportMock).toHaveBeenCalledWith(record);
  });

  it('restores a record after confirming the Edit dialog', async () => {
    useHistoryMock.mockReturnValue({ data: [record], isLoading: false, isError: false });
    render(<HistoryPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit shift dari history')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ya, edit' }));
    expect(restoreMock).toHaveBeenCalledWith(1, expect.anything());
  });
});
