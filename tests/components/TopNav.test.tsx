import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

const mockAuth = {
  authed: false,
  loginModalOpen: false,
  openLoginModal: vi.fn(),
  closeLoginModal: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

import { TopNav } from '@/components/layout/TopNav';

describe('TopNav', () => {
  beforeEach(() => {
    mockAuth.authed = false;
    mockAuth.loginModalOpen = false;
    vi.clearAllMocks();
  });

  it('shows the logo and a centred title instead of nav links when logged out', () => {
    render(<TopNav />);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Input' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Toyota')).toHaveAttribute('src', '/logo.png');
    expect(screen.getByText('QC Gate Production')).toBeInTheDocument();
  });

  it('opens the login modal when the person icon is clicked while logged out', async () => {
    render(<TopNav />);
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(mockAuth.openLoginModal).toHaveBeenCalledTimes(1);
  });

  it('renders links to all three routes once logged in', () => {
    mockAuth.authed = true;
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Input' })).toHaveAttribute('href', '/input');
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.queryByAltText('Toyota')).not.toBeInTheDocument();
  });

  it('marks the current route as active once logged in', () => {
    mockAuth.authed = true;
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' }).className).toMatch(/linkActive/);
  });

  it('logs out when the person icon is clicked while logged in', async () => {
    mockAuth.authed = true;
    render(<TopNav />);
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
  });

  it('fills in the clock after mount', () => {
    render(<TopNav />);
    // effect has run under act() — a HH.MM.SS string is present
    expect(screen.getByLabelText('Waktu real-time').textContent).toMatch(/\d{2}[.:]\d{2}[.:]\d{2}/);
  });
});
