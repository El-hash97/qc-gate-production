import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from '@/components/layout/SettingsModal';

const PANELS = [
  { id: 'a', label: 'Panel A' },
  { id: 'b', label: 'Panel B' },
];

describe('SettingsModal', () => {
  it('renders nothing when closed', () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} panels={PANELS} hidden={new Set()} onToggle={() => {}} />);
    expect(screen.queryByText('Panel A')).not.toBeInTheDocument();
  });

  it('checks every panel not in the hidden set', () => {
    render(<SettingsModal isOpen onClose={() => {}} panels={PANELS} hidden={new Set(['b'])} onToggle={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Panel A' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Panel B' })).not.toBeChecked();
  });

  it('calls onToggle with the clicked panel id', async () => {
    const onToggle = vi.fn();
    render(<SettingsModal isOpen onClose={() => {}} panels={PANELS} hidden={new Set()} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Panel A' }));
    expect(onToggle).toHaveBeenCalledWith('a');
  });
});
