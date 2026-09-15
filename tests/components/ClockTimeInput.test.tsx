import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClockTimeInput } from '@/components/ui/ClockTimeInput';

// jsdom has no PointerEvent constructor, so testing-library's fireEvent.pointerDown
// falls back to a plain Event that drops clientX/clientY. Build the event by hand
// instead — real browsers (mobile included) do have PointerEvent, so the component
// itself uses it unmodified; only the test needs this workaround.
function pointerEvent(type: string, init: { clientX: number; clientY: number }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX: init.clientX, clientY: init.clientY, pointerId: 1 });
  return event;
}

describe('ClockTimeInput', () => {
  it('shows the current value on the closed trigger, 24h with no AM/PM', () => {
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Jam mulai' })).toHaveTextContent('14:05');
    expect(screen.queryByText(/AM|PM/i)).not.toBeInTheDocument();
  });

  it('opens the hour dial when the trigger is clicked', async () => {
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
    // 24 individual hour buttons, 00-23, no AM/PM anywhere.
    expect(screen.getByRole('button', { name: 'Jam 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jam 23' })).toBeInTheDocument();
    expect(screen.queryByText(/AM|PM/i)).not.toBeInTheDocument();
  });

  it('moves to the minute dial after picking an hour', async () => {
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    expect(screen.queryByRole('button', { name: 'Jam 0' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menit 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menit 55' })).toBeInTheDocument();
  });

  it('commits hour + minute selection only after OK is pressed', async () => {
    const onChange = vi.fn();
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 30' }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChange).toHaveBeenCalledWith('07:30');
  });

  it('discards the draft when Batal is pressed', async () => {
    const onChange = vi.fn();
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onChange).not.toHaveBeenCalled();
    // trigger still shows the original, uncommitted value
    expect(screen.getByRole('button', { name: 'Jam mulai' })).toHaveTextContent('14:05');
  });

  it('reopens on a fresh draft from the current value each time', async () => {
    const onChange = vi.fn();
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
    // back to the hour step, not stuck on minute from the aborted attempt
    expect(screen.getByRole('button', { name: 'Jam 14' })).toBeInTheDocument();
  });

  describe('dragging the minute hand', () => {
    beforeEach(() => {
      // The dial face is a 200x200 square; center at (100,100), so pointer
      // events at absolute (client) coordinates map onto clock-degree angles.
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200,
        x: 0, y: 0, toJSON: () => {},
      });
    });

    it('picks an arbitrary minute (not just the 5-minute marks) from pointer position', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
      await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));

      const dial = screen.getByTestId('minute-dial-face');
      // Point at (150, 100): straight right of center (100,100) -> 90° -> minute 15.
      fireEvent(dial, pointerEvent('pointerdown', { clientX: 150, clientY: 100 }));

      await userEvent.click(screen.getByRole('button', { name: 'OK' }));
      expect(onChange).toHaveBeenCalledWith('07:15');
    });

    it('tracks the pointer while dragging', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
      await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));

      const dial = screen.getByTestId('minute-dial-face');
      fireEvent(dial, pointerEvent('pointerdown', { clientX: 150, clientY: 100 })); // -> minute 15
      fireEvent(dial, pointerEvent('pointermove', { clientX: 100, clientY: 200 })); // -> minute 30
      fireEvent(dial, pointerEvent('pointerup', { clientX: 100, clientY: 200 }));

      await userEvent.click(screen.getByRole('button', { name: 'OK' }));
      expect(onChange).toHaveBeenCalledWith('07:30');
    });

    it('stops tracking the pointer after release', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Jam mulai' }));
      await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));

      const dial = screen.getByTestId('minute-dial-face');
      fireEvent(dial, pointerEvent('pointerdown', { clientX: 150, clientY: 100 })); // -> minute 15
      fireEvent(dial, pointerEvent('pointerup', { clientX: 150, clientY: 100 }));
      // move after release must not change the draft anymore
      fireEvent(dial, pointerEvent('pointermove', { clientX: 100, clientY: 200 })); // would be minute 30

      await userEvent.click(screen.getByRole('button', { name: 'OK' }));
      expect(onChange).toHaveBeenCalledWith('07:15');
    });
  });
});
