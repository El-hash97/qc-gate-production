import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
