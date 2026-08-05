import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/ToastProvider';

function TriggerButton() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Data tersimpan', 'success')}>Trigger</button>;
}

describe('ToastProvider', () => {
  it('renders a toast after showToast is called', async () => {
    render(
      <ToastProvider>
        <TriggerButton />
      </ToastProvider>,
    );
    screen.getByRole('button', { name: 'Trigger' }).click();
    expect(await screen.findByText('Data tersimpan')).toBeInTheDocument();
  });

  it('throws when useToast is used outside a ToastProvider', () => {
    const Bad = () => { useToast(); return null; };
    expect(() => render(<Bad />)).toThrow('useToast must be used within a ToastProvider');
  });
});
