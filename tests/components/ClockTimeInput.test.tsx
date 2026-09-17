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

const OPEN_LABEL = 'Jam mulai (jam melingkar)';

describe('ClockTimeInput', () => {
  it('shows the current value on the manual input, 24h with no AM/PM', () => {
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Jam mulai' })).toHaveValue('14:05');
    expect(screen.queryByText(/AM|PM/i)).not.toBeInTheDocument();
  });

  it('shows a placeholder on the manual input when there is no value yet', () => {
    render(<ClockTimeInput value="" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Jam mulai' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Jam mulai' })).toHaveAttribute('placeholder', '--:--');
  });

  describe('manual input auto-correct', () => {
    it('corrects a 3-digit typed value into HH:MM on blur', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, '730');
      await userEvent.tab();
      expect(onChange).toHaveBeenCalledWith('07:30');
    });

    it('treats a 4-digit value as HHMM', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, '1430');
      await userEvent.tab();
      expect(onChange).toHaveBeenCalledWith('14:30');
    });

    it('treats a 1-2 digit value as hour only, minute 00', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, '7');
      await userEvent.tab();
      expect(onChange).toHaveBeenCalledWith('07:00');
    });

    it('clamps an out-of-range hour/minute into a valid 24h time', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, '2599');
      await userEvent.tab();
      expect(onChange).toHaveBeenCalledWith('23:59');
    });

    it('commits on Enter as well as blur', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, '830{Enter}');
      expect(onChange).toHaveBeenCalledWith('08:30');
    });

    it('reverts to the last committed value when nothing recognizable was typed', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, 'abc');
      await userEvent.tab();
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('14:05');
    });

    it('does not call onChange when the corrected value is unchanged', async () => {
      const onChange = vi.fn();
      render(<ClockTimeInput value="07:30" ariaLabel="Jam mulai" onChange={onChange} />);
      const input = screen.getByRole('textbox', { name: 'Jam mulai' });
      await userEvent.clear(input);
      await userEvent.type(input, '0730');
      await userEvent.tab();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('opens the hour dial from the small clock icon button', async () => {
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
    // 24 individual hour buttons, 00-23, no AM/PM anywhere.
    expect(screen.getByRole('button', { name: 'Jam 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jam 23' })).toBeInTheDocument();
    expect(screen.queryByText(/AM|PM/i)).not.toBeInTheDocument();
  });

  it('moves to the minute dial after picking an hour', async () => {
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    expect(screen.queryByRole('button', { name: 'Jam 0' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menit 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menit 55' })).toBeInTheDocument();
  });

  it('commits hour + minute selection only after OK is pressed', async () => {
    const onChange = vi.fn();
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menit 30' }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChange).toHaveBeenCalledWith('07:30');
  });

  it('discards the draft when Batal is pressed', async () => {
    const onChange = vi.fn();
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
    await userEvent.click(screen.getByRole('button', { name: 'Jam 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onChange).not.toHaveBeenCalled();
    // manual input still shows the original, uncommitted value
    expect(screen.getByRole('textbox', { name: 'Jam mulai' })).toHaveValue('14:05');
  });

  it('reopens on a fresh draft from the current value each time', async () => {
    const onChange = vi.fn();
    render(<ClockTimeInput value="14:05" ariaLabel="Jam mulai" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
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
      await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
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
      await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
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
      await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }));
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
