import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HourlyTable } from '@/components/production/HourlyTable';

describe('HourlyTable', () => {
  it('renders rows sorted by hour', () => {
    render(<HourlyTable hourlyData={{ '15:00': { ok: 2, repair: 0, ng: 0 }, '07:00': { ok: 5, repair: 1, ng: 0 } }} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows[0]).toHaveTextContent('07:00');
    expect(rows[1]).toHaveTextContent('15:00');
  });

  it('renders an empty body when there is no hourly data', () => {
    render(<HourlyTable hourlyData={{}} />);
    expect(screen.getAllByRole('row')).toHaveLength(1); // header row only
  });

  it('shows the per-hour target read-only when not editable', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        hourlyTarget={{ '07:00': 40 }}
      />,
    );
    expect(screen.getByRole('row', { name: /07:00/ })).toHaveTextContent('40');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('commits an edited per-hour target on blur', async () => {
    const onTargetChange = vi.fn();
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        hourlyTarget={{ '07:00': 40 }}
        editable
        onTargetChange={onTargetChange}
      />,
    );
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '50');
    expect(onTargetChange).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onTargetChange).toHaveBeenCalledWith('07:00', 50);
  });

  it('auto-generates a one-hour range in the Jam column when read-only', () => {
    render(<HourlyTable hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 }, '23:00': { ok: 1, repair: 0, ng: 0 } }} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('07:00–08:00');
    expect(rows[1]).toHaveTextContent('23:00–00:00');
  });

  it('shows the stored window instead of the default when one is set', () => {
    render(
      <HourlyTable
        hourlyData={{ '12:00': { ok: 5, repair: 0, ng: 0 } }}
        hourlyWindow={{ '12:00': { start: '12:00', end: '12:45' } }}
      />,
    );
    expect(screen.getByRole('row', { name: /12:00/ })).toHaveTextContent('12:00–12:45');
  });

  it('commits an edited window on blur', () => {
    const onWindowChange = vi.fn();
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        editable
        onWindowChange={onWindowChange}
      />,
    );
    const end = screen.getByLabelText('Jam selesai');
    fireEvent.change(end, { target: { value: '07:45' } });
    expect(onWindowChange).not.toHaveBeenCalled();
    fireEvent.blur(end);
    expect(onWindowChange).toHaveBeenCalledWith('07:00', { start: '07:00', end: '07:45' });
  });

  it('leaves out the OEE columns when no factors are supplied', () => {
    render(<HourlyTable hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }} />);
    expect(screen.queryByRole('columnheader', { name: 'OEE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'AV' })).not.toBeInTheDocument();
  });

  it('renders AV/PE/RQ/OEE as percentages when factors are supplied', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 60, repair: 8, ng: 4 } }}
        oee={{ '07:00': { av: 1, pe: 0.8333, rq: 0.8333, oee: 0.6944 } }}
      />,
    );
    for (const header of ['AV', 'PE', 'RQ', 'OEE']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    const row = screen.getByRole('row', { name: /07:00/ });
    expect(row).toHaveTextContent('100%');
    expect(row).toHaveTextContent('83%');
    expect(row).toHaveTextContent('69%');
  });
});
