import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineStopDialog } from '@/components/visual/LineStopDialog';
import type { LineStop } from '@/lib/types';

const a: LineStop = { start: '08:00', end: '08:20', problem: 'Hoist macet', countermeasure: 'Ganti sensor', category: 'AV', station: 'hsb05' };
const b: LineStop = { start: '09:00', end: '09:45', problem: 'Lampu mati', category: 'AV', station: 'qc1' };

describe('LineStopDialog', () => {
  it('lists each stop with its station name, newest first, and marks the active one', () => {
    render(<LineStopDialog stops={[a, b]} active={b} onClose={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('QC Gate 1');
    expect(items[0]).toHaveTextContent('Lampu mati');
    expect(items[0]).toHaveTextContent('NOW');
    expect(items[1]).toHaveTextContent('HSB05');
    expect(items[1]).toHaveTextContent('08:00–08:20 · 20m');
    expect(items[1]).toHaveTextContent('Ganti sensor');
    expect(screen.getByText('2 stop · 1j 05m')).toBeInTheDocument();
  });

  it('says so when there is none, and closes on × and Escape', async () => {
    const onClose = vi.fn();
    render(<LineStopDialog stops={[]} active={null} onClose={onClose} />);
    expect(screen.getByText('No line stop yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
