import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefectModal } from '@/components/production/DefectModal';
import { DEFECT_TYPES } from '@/utils/constants';

describe('DefectModal', () => {
  it('lists all 22 fixed defect types', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} />);
    expect(screen.getAllByRole('option')).toHaveLength(22);
  });

  it('calls onSave with the selected defect type, quantity, lot, and flask', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Kandama Rear');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '3');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L123');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F45');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Kandama Rear', 3, 'L123', 'F45');
  });

  it('does not save when quantity is negative', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} />);
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '-5');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save when lot or flask is empty', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('resets to the new list\'s first option when the types prop changes', () => {
    const { rerender } = render(
      <DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} />,
    );
    rerender(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={['Ireboshi', 'Hike']} />);
    expect(screen.getByRole('listbox')).toHaveValue('Ireboshi');
  });
});
