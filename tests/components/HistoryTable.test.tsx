import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryTable } from '@/components/history/HistoryTable';
import type { HistoryRecord } from '@/lib/types';

const record: HistoryRecord = {
  id: 1, date: '2026-08-04', shift: 'Shift Red', operator: 'Budi', target: 100,
  ok1: 50, repair1: 2, ng1: 1, ok2: 40, repair2: 1, ng2: 0,
  defectData: {}, repairData: {}, hourlyData: {}, entryLogs: [], savedAt: '',
};

describe('HistoryTable', () => {
  it('shows an empty state when there are no records', () => {
    render(<HistoryTable records={[]} expandedId={null} onToggle={() => {}} renderDetail={() => null} onExport={() => {}} onEdit={() => {}} />);
    expect(screen.getByText('Belum ada histori shift')).toBeInTheDocument();
  });

  it('renders one row per record with OK/Repair/NG totals summed across both products', () => {
    render(<HistoryTable records={[record]} expandedId={null} onToggle={() => {}} renderDetail={() => null} onExport={() => {}} onEdit={() => {}} />);
    const row = screen.getByText('Budi').closest('tr')!;
    expect(row).toHaveTextContent('90'); // ok1 + ok2
    expect(row).toHaveTextContent('3');  // repair1 + repair2
    expect(row).toHaveTextContent('1');  // ng1 + ng2
  });

  it('renders the detail row only for the expanded record', () => {
    render(
      <HistoryTable
        records={[record]}
        expandedId={1}
        onToggle={() => {}}
        renderDetail={() => <div data-testid="detail">detail content</div>}
        onExport={() => {}}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByTestId('detail')).toBeInTheDocument();
  });

  it('calls onExport without triggering onToggle when Export is clicked', async () => {
    const onToggle = vi.fn();
    const onExport = vi.fn();
    render(<HistoryTable records={[record]} expandedId={null} onToggle={onToggle} renderDetail={() => null} onExport={onExport} onEdit={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith(record);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('calls onEdit without triggering onToggle when Edit is clicked', async () => {
    const onToggle = vi.fn();
    const onEdit = vi.fn();
    render(<HistoryTable records={[record]} expandedId={null} onToggle={onToggle} renderDetail={() => null} onExport={() => {}} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(record);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
