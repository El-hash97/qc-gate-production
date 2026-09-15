import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-chartjs-2', () => ({ Doughnut: () => null, Bar: () => null, Chart: () => null }));
vi.mock('@/lib/chartSetup', () => ({}));
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({ mappings: [], isLoading: false }),
}));

const html2pdfChain = { set: vi.fn(), from: vi.fn(), save: vi.fn() };
const html2pdfFactory = vi.fn(() => html2pdfChain);
vi.mock('html2pdf.js', () => ({ default: () => html2pdfFactory() }));

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
    vi.clearAllMocks();
    html2pdfChain.set.mockReturnValue(html2pdfChain);
    html2pdfChain.from.mockReturnValue(html2pdfChain);
    html2pdfChain.save.mockResolvedValue(undefined);
    html2pdfFactory.mockReturnValue(html2pdfChain);
  });

  it('defaults to "Export PDF" via window.print (unchanged live-Dashboard behaviour)', async () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    const original = window.print;
    window.print = printSpy;
    try {
      render(<ProductionDashboardView state={state} view="bc" onViewChange={() => {}} now={null} />);
      expect(screen.getByRole('button', { name: 'Export PDF' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
      await vi.advanceTimersByTimeAsync(300);
      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(html2pdfFactory).not.toHaveBeenCalled();
    } finally {
      window.print = original;
      vi.useRealTimers();
    }
  });

  it('shows "Download PDF" and generates a real file with html2pdf when exportMode is "download"', async () => {
    vi.useFakeTimers();
    const printSpy = vi.fn();
    const original = window.print;
    window.print = printSpy;
    try {
      render(
        <ProductionDashboardView
          state={state} view="bc" onViewChange={() => {}} now={null}
          exportMode="download" pdfFileName="QC_Gate_Shift_Red_5_Agustus_2026.pdf"
        />,
      );
      expect(screen.queryByRole('button', { name: 'Export PDF' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
      await vi.advanceTimersByTimeAsync(300);
      expect(html2pdfFactory).toHaveBeenCalled();
      expect(html2pdfChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'QC_Gate_Shift_Red_5_Agustus_2026.pdf' }),
      );
      expect(html2pdfChain.save).toHaveBeenCalled();
      expect(printSpy).not.toHaveBeenCalled();
    } finally {
      window.print = original;
      vi.useRealTimers();
    }
  });
});
