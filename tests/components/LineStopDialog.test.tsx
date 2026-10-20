import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineStopDialog } from '@/components/visual/LineStopDialog';
import type { DatedStop } from '@/utils/stopHistory';

const NOW = new Date(2026, 9, 19, 9, 45); // 19 Oct 2026, 09:45
const d = (date: string, extra: Partial<DatedStop>): DatedStop =>
  ({ date, start: '08:00', end: '08:20', problem: 'x', category: 'AV', station: 'qc1', ...extra });

const a = d('2026-10-19', { problem: 'Hoist macet', countermeasure: 'Ganti sensor', station: 'hsb05' });
const b = d('2026-10-19', { start: '09:00', end: '09:45', problem: 'Lampu mati', live: true });
// still going on: no end yet, counted to `now`
const c = d('2026-10-19', { start: '09:15', end: undefined, problem: 'Belum kelar', live: true });
const old = d('2026-10-01', { problem: 'Bulan lalu' });

const open = (stops: DatedStop[], active: DatedStop | null = null, onClose = vi.fn()) =>
  render(<LineStopDialog title="QC Gate 1" stops={stops} active={active} now={NOW} onClose={onClose} />);

describe('LineStopDialog', () => {
  it('lists each stop with its station name and date, newest first, and marks the active one', () => {
    open([a, b], b);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('QC Gate 1');
    expect(items[0]).toHaveTextContent('Lampu mati');
    expect(items[0]).toHaveTextContent('NOW');
    expect(items[1]).toHaveTextContent('HSB05');
    expect(items[1]).toHaveTextContent('19/10 · 08:00–08:20 · 20m');
    expect(items[1]).toHaveTextContent('Ganti sensor');
    expect(screen.getByText('2 stop · 1j 05m')).toBeInTheDocument();
  });

  it('measures an ongoing stop (no end yet) up to `now`, and labels it with an open interval', () => {
    open([c], c);
    expect(screen.getByText(/09:15–… · 30m/)).toBeInTheDocument();
    expect(screen.getByText('NOW')).toBeInTheDocument();
  });

  it('draws one dated bar per day and filters by 7 / 14 / 30 days', async () => {
    open([old, b]);
    // 30 days by default: both stops, 30 bars
    expect(screen.getAllByTestId('day')).toHaveLength(30);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('2× / 30 days')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.getAllByTestId('day')).toHaveLength(7);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    // every bar of a 7-day chart carries its date; today's bar says 1 stop
    const days = screen.getAllByTestId('day');
    expect(within(days[0]).getByText('13/10')).toBeInTheDocument();
    expect(days[6]).toHaveAttribute('title', '2026-10-19 · 1 stop · 45m');
  });

  it('shows the 30-day level next to the title: neutral, orange from 3, red from 10', () => {
    const many = (n: number) => Array.from({ length: n }, () => a);
    const { rerender } = open(many(2));
    expect(screen.getByText('2× / 30 days')).toHaveAttribute('data-level', 'ok');
    rerender(<LineStopDialog title="QC Gate 1" stops={many(3)} active={null} now={NOW} onClose={vi.fn()} />);
    expect(screen.getByText('3× / 30 days')).toHaveAttribute('data-level', 'orange');
    rerender(<LineStopDialog title="QC Gate 1" stops={many(10)} active={null} now={NOW} onClose={vi.fn()} />);
    expect(screen.getByText('10× / 30 days')).toHaveAttribute('data-level', 'red');
  });

  it('says so when the range has none, and closes on × and Escape', async () => {
    const onClose = vi.fn();
    open([], null, onClose);
    expect(screen.getByText('No line stop in the last 30 days')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
