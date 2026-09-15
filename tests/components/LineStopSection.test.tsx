import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineStopSection } from '@/components/production/LineStopSection';

describe('LineStopSection', () => {
  it('shows a placeholder on the Jam Mulai/Selesai clock triggers before anything is picked', () => {
    render(<LineStopSection stops={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Jam Mulai' })).toHaveTextContent('--:--');
    expect(screen.getByRole('button', { name: 'Jam Selesai' })).toHaveTextContent('--:--');
  });

  it('adds a line stop once both times, via the clock picker, and a problem are filled in', async () => {
    const onChange = vi.fn();
    render(<LineStopSection stops={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jam Mulai' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 0' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.click(screen.getByRole('button', { name: 'Jam Selesai' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 30' }));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onChange).toHaveBeenCalledWith([
      { start: '07:00', end: '07:30', problem: 'Mesin macet', category: 'AV' },
    ]);
  });

  it('keeps Tambah disabled until both times are picked', async () => {
    render(<LineStopSection stops={[]} onChange={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Problem line stop'), 'Mesin macet');
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
  });
});
