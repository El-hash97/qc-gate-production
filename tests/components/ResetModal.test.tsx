import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ResetModal } from '@/components/production/ResetModal';

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ResetModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows an error toast when the password is wrong', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Password salah!' }),
    });
    const onClose = vi.fn();
    renderWithProviders(<ResetModal isOpen onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('Masukkan password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Reset Data' }));

    expect(await screen.findByText('Password salah!')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('surfaces the server reason when reset is not configured', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: 'Reset password belum dikonfigurasi di server (RESET_PASSWORD).',
      }),
    });
    renderWithProviders(<ResetModal isOpen onClose={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('Masukkan password'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Reset Data' }));

    expect(
      await screen.findByText('Reset password belum dikonfigurasi di server (RESET_PASSWORD).'),
    ).toBeInTheDocument();
  });

  it('closes and shows a success toast when the password is correct', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { ok1: 0 } }),
    });
    const onClose = vi.fn();
    renderWithProviders(<ResetModal isOpen onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('Masukkan password'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Reset Data' }));

    expect(await screen.findByText('Data berhasil direset & diarsipkan')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
