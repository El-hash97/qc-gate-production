import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefectModal } from '@/components/production/DefectModal';

describe('DefectModal', () => {
  it('lists all 10 fixed defect types', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} />);
    expect(screen.getAllByRole('option')).toHaveLength(10);
  });

  it('calls onSave with the selected defect type and quantity', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Kandama Rear');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Kandama Rear', 3);
  });

  it('does not save when quantity is negative', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} />);
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
