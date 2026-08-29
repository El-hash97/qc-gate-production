import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { TopNav } from '@/components/layout/TopNav';

describe('TopNav', () => {
  it('renders links to all three routes', () => {
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Input' })).toHaveAttribute('href', '/input');
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
  });

  it('marks the current route as active', () => {
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' }).className).toMatch(/linkActive/);
  });

  it('fills in the clock after mount', () => {
    render(<TopNav />);
    // effect has run under act() — a HH.MM.SS string is present
    expect(screen.getByLabelText('Waktu real-time').textContent).toMatch(/\d{2}[.:]\d{2}[.:]\d{2}/);
  });
});
