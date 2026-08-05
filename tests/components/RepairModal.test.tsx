import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepairModal } from '@/components/production/RepairModal';

describe('RepairModal', () => {
  it('lists all 11 fixed repair types', () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(11);
  });

  it('calls onSave with the selected repair type and quantity', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Dakon');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Dakon', 2);
  });

  it('does not save when quantity is negative', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} />);
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '-1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
