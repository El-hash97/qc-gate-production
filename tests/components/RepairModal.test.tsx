import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepairModal } from '@/components/production/RepairModal';
import { REPAIR_TYPES } from '@/utils/constants';

describe('RepairModal', () => {
  it('lists all fixed repair types plus Other', () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />);
    expect(screen.getAllByRole('option')).toHaveLength(REPAIR_TYPES.length + 1);
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });

  it('saves a manually typed repair when Other is selected', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Other');
    await userEvent.type(screen.getByLabelText('Repair Lainnya'), 'Gerinda ulang');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Gerinda ulang', 1, 'L1', 'F1');
  });

  it('relabels the flask field via the flaskLabel prop', () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} flaskLabel="Nomor Cavity" />);
    expect(screen.getByLabelText('Nomor Cavity')).toBeInTheDocument();
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

  it('does not show the die popup for the default Mejashi Bore 1 selection on mount', () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />);
    expect(screen.queryByText('Pilih Nomor Die')).not.toBeInTheDocument();
  });

  it('shows the die popup as soon as a Mejashi Bore type is picked', async () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Mejashi Bore 3');
    expect(screen.getByText('Pilih Nomor Die')).toBeInTheDocument();
  });

  it('includes the picked die number when saving a Mejashi Bore repair', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Mejashi Bore 3');
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.queryByText('Pilih Nomor Die')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Mejashi Bore 3', 1, 'L1', 'F1', 2);
  });

  it('blocks Simpan and opens the die popup if Mejashi Bore was accepted as the default without a die chosen', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    // Default selection is already "Mejashi Bore 1" — fill the rest and save
    // without ever touching the type list.
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Pilih Nomor Die')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Mejashi Bore 1', 1, 'L1', 'F1', 4);
  });

  it('does not require a die number for a non-Mejashi-Bore repair', async () => {
    const onSave = vi.fn();
    render(<RepairModal isOpen onClose={() => {}} onSave={onSave} types={REPAIR_TYPES} />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Dakon');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Dakon', 1, 'L1', 'F1');
    expect(screen.queryByText('Pilih Nomor Die')).not.toBeInTheDocument();
  });

  it('resets to the new list\'s first option when the types prop changes', () => {
    const { rerender } = render(
      <RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />,
    );
    rerender(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={['Ireboshi', 'Hike']} />);
    expect(screen.getByRole('listbox')).toHaveValue('Ireboshi');
  });

  it('narrows the repair list to matches when searching', async () => {
    render(<RepairModal isOpen onClose={() => {}} onSave={() => {}} types={REPAIR_TYPES} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Jenis Repair' }), 'mejashi');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Mejashi Bore 1', 'Mejashi Bore 2', 'Mejashi Bore 3', 'Mejashi Bore 4', 'Other']);
  });
});
