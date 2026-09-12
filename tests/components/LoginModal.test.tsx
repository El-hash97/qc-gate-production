import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginModal } from '@/components/layout/LoginModal';

describe('LoginModal', () => {
  it('renders nothing when closed', () => {
    render(<LoginModal isOpen={false} onClose={() => {}} onLogin={() => true} />);
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('calls onLogin with the typed username and password, and closes on success', async () => {
    const onLogin = vi.fn(() => true);
    const onClose = vi.fn();
    render(<LoginModal isOpen onClose={onClose} onLogin={onLogin} />);
    await userEvent.type(screen.getByLabelText('Username'), 'finishing');
    await userEvent.type(screen.getByLabelText('Password'), 'toyota@1');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(onLogin).toHaveBeenCalledWith('finishing', 'toyota@1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error and stays open when the credentials are rejected', async () => {
    const onClose = vi.fn();
    render(<LoginModal isOpen onClose={onClose} onLogin={() => false} />);
    await userEvent.type(screen.getByLabelText('Username'), 'wrong');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(screen.getByText(/username atau password salah/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits on pressing Enter in either field', async () => {
    const onLogin = vi.fn(() => true);
    render(<LoginModal isOpen onClose={() => {}} onLogin={onLogin} />);
    await userEvent.type(screen.getByLabelText('Username'), 'finishing');
    await userEvent.type(screen.getByLabelText('Password'), 'toyota@1{enter}');
    expect(onLogin).toHaveBeenCalledWith('finishing', 'toyota@1');
  });

  it('clears the fields and closes on Batal', async () => {
    const onClose = vi.fn();
    render(<LoginModal isOpen onClose={onClose} onLogin={() => false} />);
    await userEvent.type(screen.getByLabelText('Username'), 'finishing');
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
