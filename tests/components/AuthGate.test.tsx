import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let pathname = '/dashboard';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

const mockAuth = { authed: false, mounted: true, openLoginModal: vi.fn() };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

import { AuthGate } from '@/components/layout/AuthGate';

describe('AuthGate', () => {
  beforeEach(() => {
    mockAuth.authed = false;
    mockAuth.mounted = true;
    vi.clearAllMocks();
  });

  it('renders the Dashboard unconditionally, logged in or not', () => {
    pathname = '/dashboard';
    render(<AuthGate><div>Dashboard content</div></AuthGate>);
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('blocks Input when not logged in', () => {
    pathname = '/input';
    render(<AuthGate><div>Input content</div></AuthGate>);
    expect(screen.queryByText('Input content')).not.toBeInTheDocument();
    expect(screen.getByText(/memerlukan login/i)).toBeInTheDocument();
  });

  it('blocks History when not logged in', () => {
    pathname = '/history';
    render(<AuthGate><div>History content</div></AuthGate>);
    expect(screen.queryByText('History content')).not.toBeInTheDocument();
  });

  it('blocks Master Data when not logged in', () => {
    pathname = '/master-data';
    render(<AuthGate><div>Master Data content</div></AuthGate>);
    expect(screen.queryByText('Master Data content')).not.toBeInTheDocument();
  });

  it('shows the protected content once logged in', () => {
    pathname = '/input';
    mockAuth.authed = true;
    render(<AuthGate><div>Input content</div></AuthGate>);
    expect(screen.getByText('Input content')).toBeInTheDocument();
  });

  it('does not judge a protected route before the session is known', () => {
    pathname = '/input';
    mockAuth.mounted = false;
    render(<AuthGate><div>Input content</div></AuthGate>);
    expect(screen.getByText('Input content')).toBeInTheDocument();
  });

  it("opens the login modal from the locked page's button", async () => {
    pathname = '/history';
    render(<AuthGate><div>History content</div></AuthGate>);
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(mockAuth.openLoginModal).toHaveBeenCalledTimes(1);
  });
});
