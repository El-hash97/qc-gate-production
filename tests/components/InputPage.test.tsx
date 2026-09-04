import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/ToastProvider';

const updateStateMock = vi.fn();
const stateMock = {
  date: '2026-08-05', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 5, repair1: 0, ng1: 0, ok2: 0, repair2: 0, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: {}, repairData: {}, hourlyData: {},
  defectDataShaft: {}, repairDataShaft: {}, hourlyDataShaft: {},
  entryLogs: [], savedAt: '',
};
let hookReturn: { state: unknown; updateState: unknown; isLoading: boolean };

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => hookReturn,
}));
vi.mock('@/hooks/useHourlySnapshot', () => ({ useHourlySnapshot: () => {} }));
vi.mock('@/hooks/useReset', () => ({ useReset: () => ({ mutate: vi.fn() }) }));

import InputPage from '@/app/input/page';

describe('InputPage', () => {
  beforeEach(() => {
    updateStateMock.mockClear();
    hookReturn = { state: stateMock, updateState: updateStateMock, isLoading: false };
  });

  it('shows a loading placeholder and writes nothing while the shift is still loading', async () => {
    hookReturn = { state: null, updateState: updateStateMock, isLoading: true };
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByText('Memuat data shift…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tambah OK' })).not.toBeInTheDocument();
    expect(updateStateMock).not.toHaveBeenCalled();
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

  it('commits a per-group Target field once on blur, not on every keystroke', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    const target = screen.getAllByLabelText('Target')[0]; // BC is the first group
    await userEvent.clear(target);
    await userEvent.type(target, '250');
    expect(updateStateMock).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(updateStateMock).toHaveBeenCalledTimes(1);
    // target stays the sum of the three group targets (Cam + Crank are 0 here)
    expect(updateStateMock).toHaveBeenCalledWith(expect.objectContaining({ targetBc: 250, target: 250 }));
  });

  it('opens the reset confirmation modal from the Reset button', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Konfirmasi Reset')).toBeInTheDocument();
  });

  it('renders Camshaft and Crankshaft sections using the Shaft defect list', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByRole('heading', { name: 'Camshaft' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Crankshaft' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah NG' })[2]);
    expect(screen.getByText('Ireboshi')).toBeInTheDocument();
  });
});
