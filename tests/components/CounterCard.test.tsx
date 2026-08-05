import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CounterCard } from '@/components/production/CounterCard';

describe('CounterCard', () => {
  it('shows the label and value', () => {
    render(<CounterCard label="OK" variant="ok" value={12} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onIncrement when + is clicked', async () => {
    const onIncrement = vi.fn();
    render(<CounterCard label="OK" variant="ok" value={0} onIncrement={onIncrement} onDecrement={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tambah OK' }));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('calls onDecrement when − is clicked', async () => {
    const onDecrement = vi.fn();
    render(<CounterCard label="OK" variant="ok" value={5} onIncrement={() => {}} onDecrement={onDecrement} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kurang OK' }));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });
});
