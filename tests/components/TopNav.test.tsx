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
});
