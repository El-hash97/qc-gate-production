import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefectModal } from '@/components/production/DefectModal';
import { DEFECT_TYPES } from '@/utils/constants';

describe('DefectModal', () => {
  it('lists all fixed defect types plus Other', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} />);
    expect(screen.getAllByRole('option')).toHaveLength(DEFECT_TYPES.length + 1);
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });

  it('saves a manually typed defect when Other is selected', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} />);
    await userEvent.click(screen.getByRole('option', { name: 'Other' }));
    await userEvent.type(screen.getByLabelText('Defect Lainnya'), 'Retak halus');
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith('Retak halus', 1, 'L1', 'F1');
  });

  it('does not save an empty Other value', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} />);
    await userEvent.click(screen.getByRole('option', { name: 'Other' }));
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    await userEvent.type(screen.getByLabelText('Nomor Flask'), 'F1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('relabels the flask field via the flaskLabel prop', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} flaskLabel="Nomor Cavity" />);
    expect(screen.getByLabelText('Nomor Cavity')).toBeInTheDocument();
  });

  it('calls onSave with the selected defect type, quantity, lot, and flask', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} />);
    await userEvent.click(screen.getByRole('option', { name: 'Kandama Rear' }));
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
    expect(screen.getByRole('option', { name: 'Ireboshi' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the Over Dimensi detail fields immediately after picking it with Enter', async () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} />);
    const search = screen.getByRole('textbox', { name: 'Jenis Defect' });
    await userEvent.type(search, 'Over Dimensi{enter}');
    expect((search as HTMLInputElement).value).toBe('Over Dimensi');
    expect(screen.getByText('Detail Over Dimensi')).toBeInTheDocument();
  });

  it('narrows the defect list to matches when searching', async () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Jenis Defect' }), 'kandama');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Kandama Front', 'Kandama Rear', 'Kandama Drag', 'Kandama Cope', 'Other']);
  });
});

describe('DefectModal flask boxes (Block Cylinder)', () => {
  // Stand-in for the Input page's lookup: flasks 2 and 4 are already logged under lot L1.
  const taken = (lot: string) => (lot.trim().toLowerCase() === 'l1' ? ['2', '4'] : []);

  it('replaces the flask text field with boxes 1-5', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} takenFlasks={taken} />);
    const group = screen.getByRole('group', { name: 'Nomor Flask' });
    expect(group).toBeInTheDocument();
    for (const n of ['1', '2', '3', '4', '5']) {
      expect(screen.getByRole('button', { name: `Flask ${n}` })).toBeEnabled();
    }
    expect(screen.queryByRole('textbox', { name: 'Nomor Flask' })).not.toBeInTheDocument();
  });

  it('saves the picked flask box', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} takenFlasks={taken} />);
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L9');
    await userEvent.click(screen.getByRole('button', { name: 'Flask 3' }));
    expect(screen.getByRole('button', { name: 'Flask 3' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).toHaveBeenCalledWith(DEFECT_TYPES[0], 1, 'L9', '3');
  });

  it('greys out and disables flasks already logged under the typed lot', async () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} takenFlasks={taken} />);
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    expect(screen.getByRole('button', { name: 'Flask 2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Flask 4' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Flask 1' })).toBeEnabled();
  });

  it('drops a picked flask once the lot changes to one that already has it', async () => {
    const onSave = vi.fn();
    render(<DefectModal isOpen onClose={() => {}} onSave={onSave} types={DEFECT_TYPES} takenFlasks={taken} />);
    await userEvent.click(screen.getByRole('button', { name: 'Flask 2' }));
    await userEvent.type(screen.getByLabelText('Nomor Lot'), 'L1');
    expect(screen.getByRole('button', { name: 'Flask 2' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not wrap the boxes in a native <label> (would re-click the first box)', () => {
    render(<DefectModal isOpen onClose={() => {}} onSave={() => {}} types={DEFECT_TYPES} takenFlasks={taken} />);
    expect(screen.getByRole('button', { name: 'Flask 1' }).closest('label')).toBeNull();
  });
});
