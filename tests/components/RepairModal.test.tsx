import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepairModal } from '@/components/production/RepairModal';
import { REPAIR_TYPES } from '@/utils/constants';

describe('RepairModal', () => {
  it('lists all 27 fixed repair types', () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />);
    expect(screen.getAllByRole('option')).toHaveLength(27);
  });

  it('calls onSave with the selected repair type, quantity, lot, and flask', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Dakon');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '2');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L9');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F2');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Dakon', 2, 'L9', 'F2');
  });

  it('does not save when quantity is negative', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '-1');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save when lot or flask is empty', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('resets to the new list\'s first option when the types prop changes', () => {
    const { rerender } = render(
      <RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />,
    );
    rerender(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={['Ireboshi', 'Hike']} />);
    expect(screen.getByRole('listbox')).toHaveValue('Ireboshi');
  });
});
