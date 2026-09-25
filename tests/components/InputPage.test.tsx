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

  it('defaults the cycle time field to 50 s, without the pcs/jam capacity breakdown', () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByText('CT B/C')).toBeInTheDocument();
    expect(screen.queryByText(/pcs\/jam/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('CT B/C')).toHaveValue(50);
  });

  it('commits an edited cycle time on blur', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    const input = screen.getByLabelText(/CT B\/C/);
    await userEvent.clear(input);
    await userEvent.type(input, '45');
    expect(updateStateMock).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(updateStateMock).toHaveBeenCalledWith(expect.objectContaining({ cycleTimeBc: 45 }));
  });

  it('opens the reset confirmation modal from the Reset button', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Konfirmasi Reset')).toBeInTheDocument();
  });

  it('places each product\'s Target/Progress/Achievement bar directly above its own OK/Repair/NG cards', () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    const [bcBadge, camBadge, crankBadge] = screen.getAllByText(/^Achievement:/);
    // [BC 1TR, BC 2TR, Camshaft, Crankshaft]
    const okButtons = screen.getAllByRole('button', { name: 'Tambah OK' });
    const ngButtons = screen.getAllByRole('button', { name: 'Tambah NG' });
    const isBefore = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    // BC's combined bar sits above both the BC 1TR and BC 2TR card rows.
    expect(isBefore(bcBadge, okButtons[0])).toBe(true);
    expect(isBefore(bcBadge, okButtons[1])).toBe(true);
    // Camshaft's bar sits after BC's cards (not clustered with the other bars
    // at the top of the page) and directly above Camshaft's own cards.
    expect(isBefore(ngButtons[1], camBadge)).toBe(true);
    expect(isBefore(camBadge, okButtons[2])).toBe(true);
    // Same for Crankshaft, after Camshaft's cards.
    expect(isBefore(ngButtons[2], crankBadge)).toBe(true);
    expect(isBefore(crankBadge, okButtons[3])).toBe(true);
  });

  it('renders Camshaft and Crankshaft sections using the Shaft defect list', async () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByRole('heading', { name: 'Camshaft' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Crankshaft' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah NG' })[2]);
    expect(screen.getByText('Ireboshi')).toBeInTheDocument();
  });

  it('shows no pinned-hour banner by default (real-time input)', () => {
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.queryByText(/input diarahkan ke jam/i)).not.toBeInTheDocument();
  });

  it('shows a banner naming the pinned hour when one is set', () => {
    hookReturn = { state: { ...stateMock, pinnedHour: '09:00' }, updateState: updateStateMock, isLoading: false };
    render(<ToastProvider><InputPage /></ToastProvider>);
    expect(screen.getByText(/input diarahkan ke jam 09:00/i)).toBeInTheDocument();
  });
});
