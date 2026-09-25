import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastProvider';

vi.mock('react-chartjs-2', () => ({ Doughnut: () => null, Bar: () => null, Chart: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({ mappings: [], isLoading: false }),
}));

import { ProductionDashboardView } from '@/components/production/ProductionDashboardView';
import type { ProductionState } from '@/lib/types';

const state: ProductionState = {
  date: '5 Agustus 2026', shift: 'Shift Red', operator: 'Budi', target: 100,
  targetBc: 100, targetCam: 0, targetCrank: 0,
  ok1: 40, repair1: 2, ng1: 1, ok2: 30, repair2: 1, ng2: 0,
  ok3: 0, repair3: 0, ng3: 0, ok4: 0, repair4: 0, ng4: 0,
  defectData: {}, repairData: {}, hourlyData: {},
  entryLogs: [], lineStops: [], savedAt: '',
};

describe('ProductionDashboardView export button', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "Export PDF" via window.print (unchanged live-Dashboard behaviour)', async () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    const original = window.print;
    window.print = printSpy;
    try {
      render(
        <ToastProvider>
          <ProductionDashboardView state={state} view="bc" onViewChange={() => {}} now={null} />
        </ToastProvider>,
      );
      expect(screen.getByRole('button', { name: 'Export PDF' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
      await vi.advanceTimersByTimeAsync(300);
      expect(printSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.print = original;
      vi.useRealTimers();
    }
  });

  it('shows "Download PDF" and saves the server-rendered file when exportMode is "download"', async () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ToastProvider>
        <ProductionDashboardView
          state={state} view="bc" onViewChange={() => {}} now={null}
          exportMode="download" downloadPdfUrl="/api/history/7/pdf?view=bc"
        />
      </ToastProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Export PDF' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/history/7/pdf?view=bc');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(printSpy).not.toHaveBeenCalled();
  });

  it('shows a pending state while the PDF is being generated', async () => {
    let resolveFetch!: (value: { ok: boolean; blob: () => Promise<Blob> }) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ToastProvider>
        <ProductionDashboardView
          state={state} view="bc" onViewChange={() => {}} now={null}
          exportMode="download" downloadPdfUrl="/api/history/7/pdf?view=bc"
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    const button = await screen.findByRole('button', { name: 'Menyiapkan PDF…' });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'])) });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument());
  });

  it('shows an error toast and resets when the server fails to generate the PDF', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    render(
      <ToastProvider>
        <ProductionDashboardView
          state={state} view="bc" onViewChange={() => {}} now={null}
          exportMode="download" downloadPdfUrl="/api/history/7/pdf?view=bc"
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByText('Gagal membuat PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).not.toBeDisabled();
  });
});

describe('ProductionDashboardView hourly table', () => {
  it('gives the Hourly (Tabel) panel the full-width class', () => {
    render(
      <ToastProvider>
        <ProductionDashboardView state={state} view="bc" onViewChange={() => {}} now={null} />
      </ToastProvider>,
    );
    const panel = screen.getByText('Hourly (Tabel)').closest('section')!;
    expect(panel.className).toMatch(/spanFull/);
  });

  it('gives the OEE per Jam panel the full-width class too', () => {
    render(
      <ToastProvider>
        <ProductionDashboardView state={state} view="bc" onViewChange={() => {}} now={null} />
      </ToastProvider>,
    );
    const panel = screen.getByText('OEE per Jam').closest('section')!;
    expect(panel.className).toMatch(/spanFull/);
  });

  it('forwards a pin-toggle click to onPinHour', () => {
    const withHour: ProductionState = {
      ...state,
      hourlyData: { '07:00': { ok: 5, repair: 0, ng: 0 } },
    };
    const onPinHour = vi.fn();
    render(
      <ToastProvider>
        <ProductionDashboardView
          state={withHour} view="bc" onViewChange={() => {}} now={null}
          onHourlyWindowChange={() => {}} onPinHour={onPinHour}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arahkan input manual ke jam 07:00' }));
    expect(onPinHour).toHaveBeenCalledWith('07:00');
  });

  it("shows a line stop's Item Problem under its hour, via lineStopsByHour", () => {
    const withStop: ProductionState = {
      ...state,
      hourlyData: { '07:00': { ok: 5, repair: 0, ng: 0 } },
      lineStops: [{ start: '07:10', end: '07:20', problem: 'Ganti tooling', category: 'AV' }],
    };
    render(
      <ToastProvider>
        <ProductionDashboardView state={withStop} view="bc" onViewChange={() => {}} now={null} />
      </ToastProvider>,
    );
    const row = screen.getByRole('row', { name: /07:00.*Ganti tooling/ });
    expect(row).toBeInTheDocument();
  });
});
