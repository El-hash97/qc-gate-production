import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DieNumberModal } from '@/components/production/DieNumberModal';

describe('DieNumberModal', () => {
  it('renders nothing when closed', () => {
    render(<DieNumberModal isOpen={false} onSelect={() => {}} />);
    expect(screen.queryByText('Pilih Nomor Die')).not.toBeInTheDocument();
  });

  it('shows four die cards, 1-2 on top and 3-4 below, when open', () => {
    render(<DieNumberModal isOpen onSelect={() => {}} />);
    expect(screen.getByText('Pilih Nomor Die')).toBeInTheDocument();
    const cards = screen.getAllByRole('button');
    expect(cards.map((c) => c.textContent)).toEqual(['1', '2', '3', '4']);
  });

  it('calls onSelect with the die number that was clicked', async () => {
    const onSelect = vi.fn();
    render(<DieNumberModal isOpen onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('has no way to dismiss it other than picking a die — no close/cancel button', () => {
    render(<DieNumberModal isOpen onSelect={() => {}} />);
    expect(screen.queryByRole('button', { name: /batal|tutup|close/i })).not.toBeInTheDocument();
  });
});
