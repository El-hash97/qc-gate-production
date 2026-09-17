import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HourlyTable } from '@/components/production/HourlyTable';

const factors = { av: 1, pe: 1, rq: 1, oee: 1 };

describe('HourlyTable', () => {
  it('renders rows sorted by hour', () => {
    render(<HourlyTable hourlyData={{ '15:00': { ok: 2, repair: 0, ng: 0 }, '07:00': { ok: 5, repair: 1, ng: 0 } }} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows[0]).toHaveTextContent('07:00');
    expect(rows[1]).toHaveTextContent('15:00');
  });

  it('keeps a night shift in production order (20:00 onward, not wrapped to the top)', () => {
    render(
      <HourlyTable
        hourlyData={{
          '23:00': { ok: 1, repair: 0, ng: 0 },
          '00:00': { ok: 2, repair: 0, ng: 0 },
          '20:00': { ok: 3, repair: 0, ng: 0 },
          '21:00': { ok: 4, repair: 0, ng: 0 },
        }}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent?.slice(0, 5))).toEqual(['20:00', '21:00', '23:00', '00:00']);
  });

  it('renders an empty body when there is no hourly data', () => {
    render(<HourlyTable hourlyData={{}} />);
    expect(screen.getAllByRole('row')).toHaveLength(1); // header row only
  });

  it('auto-generates a one-hour range in the Jam column when read-only', () => {
    render(<HourlyTable hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 }, '23:00': { ok: 1, repair: 0, ng: 0 } }} />);
    // Row order isn't the point here (see the dedicated night-shift-order
    // test below) — just that each hour's default window renders correctly,
    // including the 23:00 -> 00:00 midnight wrap.
    expect(screen.getByRole('row', { name: /07:00/ })).toHaveTextContent('07:00–08:00');
    expect(screen.getByRole('row', { name: /23:00/ })).toHaveTextContent('23:00–00:00');
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

  it('commits an edited window once OK is pressed in the clock picker', async () => {
    const onWindowChange = vi.fn();
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }}
        editable
        onWindowChange={onWindowChange}
      />,
    );
    // default window is 07:00-08:00; open the "Jam selesai" clock and set it to 07:45.
    await userEvent.click(screen.getByRole('button', { name: 'Jam selesai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 45' }));
    expect(onWindowChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onWindowChange).toHaveBeenCalledWith('07:00', { start: '07:00', end: '07:45' });
  });

  it('leaves out the Plan/Actual and OEE columns when no factors are supplied', () => {
    render(<HourlyTable hourlyData={{ '07:00': { ok: 5, repair: 0, ng: 0 } }} hourlyPlan={{ '07:00': 72 }} />);
    for (const header of ['Plan', 'Actual', 'AV', 'OEE']) {
      expect(screen.queryByRole('columnheader', { name: header })).not.toBeInTheDocument();
    }
  });

  it('shows the formula Plan and the Actual total when factors are supplied', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 40, repair: 3, ng: 2 } }}
        hourlyPlan={{ '07:00': 72 }}
        oee={{ '07:00': factors }}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Plan' })).toBeInTheDocument();
    const cells = within(screen.getByRole('row', { name: /07:00/ })).getAllByRole('cell');
    // Jam, OK, Repair, NG, Plan, Actual, AV, PE, RQ, OEE
    expect(cells[4]).toHaveTextContent('72');
    expect(cells[5]).toHaveTextContent('45'); // 40 + 3 + 2
  });

  it('colours Actual against Plan: red below, amber within 10%, green on target', () => {
    render(
      <HourlyTable
        hourlyData={{
          '07:00': { ok: 40, repair: 0, ng: 0 }, // 40 / 72 -> red
          '08:00': { ok: 66, repair: 0, ng: 0 }, // 66 / 72 -> amber (>= 90%)
          '09:00': { ok: 72, repair: 0, ng: 0 }, // 72 / 72 -> green
        }}
        hourlyPlan={{ '07:00': 72, '08:00': 72, '09:00': 72 }}
        oee={{ '07:00': factors, '08:00': factors, '09:00': factors }}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    const actual = (i: number) => within(rows[i]).getAllByRole('cell')[5];
    expect(actual(0).className).toMatch(/rateBad/);
    expect(actual(1).className).toMatch(/rateWarn/);
    expect(actual(2).className).toMatch(/rateGood/);
  });

  it('adds a "/ N%" suffix to Actual only when the hour missed its Plan', () => {
    render(
      <HourlyTable
        hourlyData={{
          '07:00': { ok: 40, repair: 0, ng: 0 }, // 40/72 = 56% -> missed
          '08:00': { ok: 72, repair: 0, ng: 0 }, // met exactly -> no suffix
          '09:00': { ok: 80, repair: 0, ng: 0 }, // exceeded -> no suffix
        }}
        hourlyPlan={{ '07:00': 72, '08:00': 72, '09:00': 72 }}
        oee={{ '07:00': factors, '08:00': factors, '09:00': factors }}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    const actual = (i: number) => within(rows[i]).getAllByRole('cell')[5];
    expect(actual(0)).toHaveTextContent('40 / 56%');
    expect(actual(1)).toHaveTextContent('72');
    expect(actual(1).textContent).not.toContain('/');
    expect(actual(2)).toHaveTextContent('80');
    expect(actual(2).textContent).not.toContain('/');
  });

  it('shows the Actual total alone when there is no Plan to compare against', () => {
    render(
      <HourlyTable
        hourlyData={{ '07:00': { ok: 10, repair: 0, ng: 0 } }}
        hourlyPlan={{}}
        oee={{ '07:00': factors }}
      />,
    );
    const cell = within(screen.getByRole('row', { name: /07:00/ })).getAllByRole('cell')[5];
    expect(cell).toHaveTextContent('10');
    expect(cell.textContent).not.toContain('/');
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
