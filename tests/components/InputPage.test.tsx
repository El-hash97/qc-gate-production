import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/ToastProvider';

const updateStateMock = vi.fn();
const stateMock = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 5, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, savedAt: '',
};

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({ state: stateMock, updateState: updateStateMock }),
}));
vi.mock('@/hooks/useHourlySnapshot', () => ({ useHourlySnapshot: () => {} }));
vi.mock('@/hooks/useReset', () => ({ useReset: () => ({ mutate: vi.fn() }) }));

import InputPage from '@/app/input/page';

describe('InputPage', () => {
  beforeEach(() => {
    updateStateMock.mockClear();
  });

  it('renders the BC 1TR and BC 2TR OK counters with their current values', () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getAllByText('5')[0]).toBeInTheDocument();
  });

  it('calls updateState with an incremented OK count when + is clicked', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah OK' })[0]);
    expect(updateStateMock).toHaveBeenCalledWith(expect.objectContaining({ ok1: 6 }));
  });

  it('opens the Defect modal instead of incrementing directly when NG + is clicked', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah NG' })[0]);
    expect(screen.getByText('Input Defect (NG)')).toBeInTheDocument();
    expect(updateStateMock).not.toHaveBeenCalled();
  });

  it('opens the reset confirmation modal from the Reset button', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Konfirmasi Reset')).toBeInTheDocument();
  });

  it('renders Camshaft and Crankshaft sections using the Shaft defect list', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByText('Camshaft')).toBeInTheDocument();
    expect(screen.getByText('Crankshaft')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah NG' })[2]);
    expect(screen.getByText('Ireboshi')).toBeInTheDocument();
  });
});
