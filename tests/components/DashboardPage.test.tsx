import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useProductionState', () => ({
  useProductionState: () => ({
    state: {
      date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
      targetBc: 100, targetCam: 100, targetCrank: 100,
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
    updateState: vi.fn(),
  }),
}));
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null, Bar: () => null, Chart: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));
vi.mock('@/hooks/useDefectPhotos', () => ({
  useDefectPhotoFlags: () => ({ hasPhoto: () => false }),
}));
const mockDashboardSettings = { hidden: new Set<string>() };
vi.mock('@/hooks/useDashboardSettings', () => ({
  useDashboardSettings: () => mockDashboardSettings,
}));
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({
    mappings: [
      { id: 1, line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, line: 'Moulding', defectName: 'Dross' },
    ],
    isLoading: false,
  }),
}));
const mockAuth = { authed: false, openLoginModal: vi.fn() };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

import DashboardPage from '@/app/dashboard/page';

describe('DashboardPage', () => {
  beforeEach(() => {
    mockAuth.authed = false;
  });

  it('shows the current operator and shift', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('Shift Red')).toBeInTheDocument();
  });

  it('defaults to the B/C view and shows its achievement percentage', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('button', { name: 'B/C' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Achievement: 74%')).toBeInTheDocument();
  });

  it('shows the combined achievement percentage on the "Semua" view', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Semua' }));
    // BC total 74 + Camshaft/Crankshaft total 10 = 84 against a target of 100.
    expect(screen.getByText('Achievement: 84%')).toBeInTheDocument();
  });

  it('shows the OEE card by default (B/C) and hides it on the mixed "Semua" view', async () => {
    render(<DashboardPage />);
    let card = within(screen.getByRole('group', { name: 'Ringkasan OEE' }));
    expect(card.getByRole('img', { name: /^OEE \d+ persen$/ })).toBeInTheDocument();
    for (const factor of ['AV', 'PE', 'RQ']) {
      expect(card.getByText(factor)).toBeInTheDocument();
    }
    // Falls back to the default 50 s cycle time when the shift has none stored.
    expect(card.getByText(/CT 50 dtk/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Semua' }));
    expect(screen.queryByRole('img', { name: /OEE/ })).not.toBeInTheDocument();
  });

  it('derives Camshaft and Crankshaft OEE capacity from the B/C cycle time', async () => {
    render(<DashboardPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    let card = within(screen.getByRole('group', { name: 'Ringkasan OEE' }));
    // 1 BC = 6 camshaft: 72 x 6 = 432 pcs/jam at a 50 / 6 = 8.3 s cycle time.
    expect(card.getByText(/CT 8,3 dtk/)).toBeInTheDocument();
    expect(card.getByText(/432 pcs\/jam/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Crankshaft' }));
    card = within(screen.getByRole('group', { name: 'Ringkasan OEE' }));
    // 1 BC = 3 crankshaft: 72 x 3 = 216 pcs/jam.
    expect(card.getByText(/CT 16,7 dtk/)).toBeInTheDocument();
    expect(card.getByText(/216 pcs\/jam/)).toBeInTheDocument();
  });

  it("puts the OEE card in its own fixed grid column, not centered by flex margins", async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'B/C' }));

    // .statusBar is a 3-column grid (1fr auto 1fr): the OEE card's column sits
    // between a dedicated PIC-card column and the connection-status column, so
    // its position can't be pulled sideways by "Real-time Connected" vs
    // "Syncing…" vs "Disconnected" changing width, or by PIC being unset —
    // margin:auto flex-centering (the previous approach) couldn't guarantee
    // that. This locks in the structure rather than the CSS itself.
    const oeeSlot = screen.getByRole('group', { name: 'Ringkasan OEE' }).parentElement!;
    expect(oeeSlot.className).toContain('oeeSlot');
    const statusBar = oeeSlot.parentElement!;
    expect(statusBar.className).toContain('statusBar');
    expect(statusBar.children).toHaveLength(3);
    expect(statusBar.children[0].className).toContain('statusLeft');
    expect(statusBar.children[1]).toBe(oeeSlot);
    expect(statusBar.children[2].className).toContain('statusRight');
  });

  it('shows connection status from the hook', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Real-time Connected')).toBeInTheDocument();
  });

  it('Export PDF button triggers the browser print dialog', () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    const original = window.print;
    window.print = printSpy;
    try {
      render(<DashboardPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
      vi.advanceTimersByTime(300);
      expect(printSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.print = original;
      vi.useRealTimers();
    }
  });

  it('renders the printed-report header with the scoped product label', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Laporan Harian Produksi')).toBeInTheDocument();
    expect(screen.getByText('Produk: BC 1TR + BC 2TR')).toBeInTheDocument();
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

  it('shows per-line hourly on the Camshaft tab, read-only while logged out', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    expect(screen.getByText('Hourly Production')).toBeInTheDocument();
    // The 09:00 row from hourlyDataCam — read-only text, not an editable field,
    // for a logged-out viewer (window editing is a member-only action).
    expect(screen.getByText('09:00–10:00')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument();
  });

  it('makes the hourly window editable on the Camshaft tab once logged in', async () => {
    mockAuth.authed = true;
    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    // Same 09:00 row, now an editable time field.
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
  });

  it('shows the Pareto Defect per Line panel aggregating NG by suspect line', () => {
    render(<DashboardPage />);
    // fixture defectData is { 'Gas Hole Cope': 1 } on the B/C default view —
    // matches the Melting mapping above, so that bar should carry the 1 pcs.
    expect(screen.getByText('Pareto Defect per Line')).toBeInTheDocument();
  });

  it('hides a panel whose id is in the shared hidden-panels set', () => {
    mockDashboardSettings.hidden = new Set(['distribution']);
    render(<DashboardPage />);
    expect(screen.queryByText('Production Distribution')).not.toBeInTheDocument();
    expect(screen.getByText('Hourly Production')).toBeInTheDocument();
    mockDashboardSettings.hidden = new Set();
  });
});
