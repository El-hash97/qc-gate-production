import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar';

describe('HistoryFilterBar', () => {
  it('calls onShiftChange when a shift is selected', async () => {
    const onShiftChange = vi.fn();
    render(<HistoryFilterBar date="" shift="" onDateChange={() => {}} onShiftChange={onShiftChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Shift White');
    expect(onShiftChange).toHaveBeenCalledWith('Shift White');
  });

  it('includes an "all shifts" option', () => {
    render(<HistoryFilterBar date="" shift="" onDateChange={() => {}} onShiftChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'Semua Shift' })).toBeInTheDocument();
  });
});
