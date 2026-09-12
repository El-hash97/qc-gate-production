import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeSelect, OTHER_TYPE } from '@/components/production/TypeSelect';

const TYPES = ['Gomi Drag', 'Gomi Cope', 'Kandama Rear', 'Crack'] as const;

describe('TypeSelect', () => {
  it('lists every type plus Other when the search box is empty', () => {
    render(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen />);
    expect(screen.getAllByRole('option')).toHaveLength(TYPES.length + 1);
  });

  it('filters the list to types containing the search text, case-insensitively', async () => {
    render(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Jenis Defect' }), 'gomi');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Gomi Drag', 'Gomi Cope', OTHER_TYPE]);
  });

  it('ranks a type that starts with the search text ahead of one that only contains it', async () => {
    // Original order deliberately puts the "contains only" matches first, so
    // a passing test proves the reordering actually happened.
    const mixed = ['Kandama Drag', 'Gas Hole Drag', 'Drag Gomi', 'Dragon Fly'] as const;
    render(<TypeSelect label="Jenis Defect" types={mixed} value={mixed[0]} onChange={() => {}} isOpen />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Jenis Defect' }), 'drag');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Drag Gomi', 'Dragon Fly', 'Kandama Drag', 'Gas Hole Drag', OTHER_TYPE]);
  });

  it('always keeps Other visible regardless of the filter', async () => {
    render(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Jenis Defect' }), 'zzz-nomatch');
    expect(screen.getByRole('option', { name: OTHER_TYPE })).toBeInTheDocument();
  });

  it('shows a hint when nothing matches the search', async () => {
    render(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Jenis Defect' }), 'zzz-nomatch');
    expect(screen.getByText(/tidak ditemukan/i)).toBeInTheDocument();
  });

  it('calls onChange with the type clicked from the filtered list', async () => {
    const onChange = vi.fn();
    render(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={onChange} isOpen />);
    await userEvent.selectOptions(screen.getByRole('listbox'), 'Kandama Rear');
    expect(onChange).toHaveBeenCalledWith('Kandama Rear');
  });

  it('clears the search box each time isOpen turns true', () => {
    const { rerender } = render(
      <TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen />,
    );
    const search = screen.getByRole('textbox', { name: 'Jenis Defect' }) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'gomi' } });
    expect(search.value).toBe('gomi');

    rerender(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen={false} />);
    rerender(<TypeSelect label="Jenis Defect" types={TYPES} value={TYPES[0]} onChange={() => {}} isOpen />);
    expect(search.value).toBe('');
  });
});
