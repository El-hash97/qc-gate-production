import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineStopSection } from '@/components/production/LineStopSection';

describe('LineStopSection', () => {
  it('shows an empty Jam Mulai/Selesai manual input before anything is picked', () => {
    render(<LineStopSection stops={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Jam Mulai' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Jam Selesai' })).toHaveValue('');
  });

  it('adds a line stop once both times, a problem, and a countermeasure are filled in', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jam Mulai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 0' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.click(screen.getByRole('button', { name: 'Jam Selesai (jam melingkar)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 30' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.type(screen.getByPlaceholderText('Countermeasure'), 'Ganti oli');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:00', end: '07:30', problem: 'Mesin macet', countermeasure: 'Ganti oli', category: 'AV' },
    ]);
  });

  it('adds a line stop typed directly into the manual Jam Mulai/Selesai inputs, with an empty countermeasure by default', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Mulai' }), '730');
    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Selesai' }), '800');
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:30', end: '08:00', problem: 'Mesin macet', countermeasure: '', category: 'AV' },
    ]);
  });

  it('saves the picked station with an AV stop, and offers no station for PE', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Mulai' }), '730');
    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Selesai' }), '800');
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Hoist macet');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Station' }), 'hsb05');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:30', end: '08:00', problem: 'Hoist macet', countermeasure: '', category: 'AV', station: 'hsb05' },
    ]);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Kategori' }), 'PE');
    expect(screen.queryByRole('combobox', { name: 'Station' })).toBeNull();
  });

  it('keeps Tambah disabled until a start time and problem are picked', async () => {
    render(<LineStopSection stops={[]} onChange={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
    // a stop without Jam Selesai is fine: the start time + problem is enough
    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Mulai' }), '730');
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), '?');
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeEnabled();
  });

  it('adds a stop with no end time when Jam Selesai is left empty, and closes it with Selesai', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Jam Mulai' }), '730');
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Hoist macet');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    const stops = [{ start: '07:30', problem: 'Hoist macet', countermeasure: '', category: 'AV' as const }];
    expect(onChange).toHaveBeenCalledWith(stops);

    // the open stop shows a Selesai button that stamps the clock right then;
    // fake Date only (setTimeout stays real so userEvent keeps ticking) so
    // the recorded end is deterministic
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 9, 19, 8, 15));
      rerender(<LineStopSection stops={stops} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Selesai line stop' }));
      expect(onChange).toHaveBeenLastCalledWith([
        { start: '07:30', end: '08:15', problem: 'Hoist macet', countermeasure: '', category: 'AV' },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers no Selesai button on a stop that already has an end time', () => {
    render(<LineStopSection
      stops={[{ start: '07:30', end: '08:00', problem: 'Mesin macet', category: 'AV' }]}
      onChange={vi.fn()}
    />);
    expect(screen.queryByRole('button', { name: 'Selesai line stop' })).toBeNull();
    expect(screen.getByText('07:30–08:00')).toBeInTheDocument();
  });

  it('does not wrap a clock picker in a native <label> (jam/menit "mental" regression)', () => {
    // ClockTimeInput renders several of its own buttons (manual input, icon
    // button, and every dial button). A <label> ancestor with more than one
    // labelable descendant makes real browsers synthesize an extra click on
    // the first one whenever another is clicked, calling openPicker() again
    // and wiping the in-progress hour/minute back to the start. jsdom doesn't
    // simulate that browser default action, so this only asserts the
    // structural cause directly rather than the symptom.
    render(<LineStopSection stops={[]} onChange={vi.fn()} />);
    const icon = screen.getByRole('button', { name: 'Jam Mulai (jam melingkar)' });
    expect(icon.closest('label')).toBeNull();
  });
});
