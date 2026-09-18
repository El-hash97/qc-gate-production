import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '@/app/error';

describe('ErrorBoundary (app/error.tsx)', () => {
  it('shows a friendly message instead of the raw error, no white-screen crash', () => {
    render(<ErrorBoundary error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByText(/terjadi kesalahan/i)).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });

  it('calls reset() when "Coba Lagi" is pressed', async () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error('boom')} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('logs the error to the console for future diagnosis', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');
    render(<ErrorBoundary error={error} reset={vi.fn()} />);
    expect(errorSpy).toHaveBeenCalledWith(error);
    errorSpy.mockRestore();
  });

  it('offers a full page reload as a stronger fallback', () => {
    render(<ErrorBoundary error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByRole('button', { name: /muat ulang/i })).toBeInTheDocument();
  });
});
