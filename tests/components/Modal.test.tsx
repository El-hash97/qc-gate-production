import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test">content</Modal>);
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<Modal isOpen onClose={() => {}} title="Test">content</Modal>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test">content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay background is clicked', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test">content</Modal>);
    // getByText('content') matches the `.modal` div itself (RTL matches an
    // element whose direct text-node children equal the query), so its
    // parent is already the `.overlay` div — one level up, not two.
    const overlay = screen.getByText('content').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
