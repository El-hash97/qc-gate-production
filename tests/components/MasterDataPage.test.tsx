import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMappings = [
  { id: 1, product: 'bc', line: 'Melting', defectName: 'Kandama' },
  { id: 2, product: 'bc', line: 'Moulding', defectName: 'Gomi' },
  { id: 3, product: 'camshaft', line: 'Finishing', defectName: 'Bari' },
];
const addMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock('@/hooks/useDefectLines', () => ({
  useDefectLines: () => ({ mappings: mockMappings, isLoading: false }),
  useAddDefectLine: () => ({ mutate: addMutate }),
  useDeleteDefectLine: () => ({ mutate: deleteMutate }),
}));
const mockCustomTypes = [{ id: 7, product: 'camshaft', kind: 'repair', name: 'Gerinda Ulang' }];
const addTypeMutate = vi.fn();
const deleteTypeMutate = vi.fn();
vi.mock('@/hooks/useDefectTypes', () => ({
  useDefectTypes: () => ({ custom: mockCustomTypes, isLoading: false }),
  useAddDefectType: () => ({ mutate: addTypeMutate }),
  useDeleteDefectType: () => ({ mutate: deleteTypeMutate }),
}));
const mockShowToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import MasterDataPage from '@/app/master-data/page';

function lineColumn(line: string) {
  return screen.getByText(line).closest('div')!;
}

describe('MasterDataPage', () => {
  beforeEach(() => {
    addMutate.mockClear();
    addTypeMutate.mockClear();
    deleteTypeMutate.mockClear();
    deleteMutate.mockClear();
    mockShowToast.mockClear();
  });

  it('renders all four fixed line columns, each with its own 3 product buttons', () => {
    render(<MasterDataPage />);
    for (const line of ['Melting', 'Moulding', 'Core Making', 'Finishing']) {
      const column = lineColumn(line);
      const group = within(column).getByRole('group', { name: `Produk untuk ${line}` });
      expect(within(group).getByRole('button', { name: 'B/C' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(group).getByRole('button', { name: 'Camshaft' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: 'Crankshaft' })).toBeInTheDocument();
    }
  });

  it('shows only the picked product per column', () => {
    render(<MasterDataPage />);
    // Defaults to B/C everywhere: Bari (Camshaft) stays hidden.
    expect(screen.getByText('Kandama')).toBeInTheDocument();
    expect(screen.queryByText('Bari')).not.toBeInTheDocument();
  });

  it('swaps one column to another product without touching the others', async () => {
    render(<MasterDataPage />);
    const finishing = lineColumn('Finishing');
    await userEvent.click(within(finishing).getByRole('button', { name: 'Camshaft' }));
    expect(within(finishing).getByText('Bari')).toBeInTheDocument();
    // Other columns still show B/C.
    expect(screen.getByText('Kandama')).toBeInTheDocument();
  });

  it("adds a defect name typed into a specific product and line's input", async () => {
    render(<MasterDataPage />);
    const input = screen.getByRole('textbox', { name: 'Tambah defect B/C untuk Melting' });
    await userEvent.type(input, 'Yuzakai');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke B/C Melting' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ product: 'bc', line: 'Melting', defectName: 'Yuzakai' });
  });

  it('adds under the picked product after switching one column', async () => {
    render(<MasterDataPage />);
    const finishing = lineColumn('Finishing');
    await userEvent.click(within(finishing).getByRole('button', { name: 'Camshaft' }));
    await userEvent.type(
      within(finishing).getByRole('textbox', { name: 'Tambah defect Camshaft untuk Finishing' }),
      'Kake',
    );
    await userEvent.click(within(finishing).getByRole('button', { name: 'Tambah ke Camshaft Finishing' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ product: 'camshaft', line: 'Finishing', defectName: 'Kake' });
  });

  it('does not add an empty defect name', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke B/C Melting' }));
    expect(addMutate).not.toHaveBeenCalled();
  });

  it('deletes a defect by its id via its own delete button', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Kandama (B/C)' }));
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate.mock.calls[0][0]).toBe(1);
  });

  describe('Daftar Jenis Defect & Repair', () => {
    function typeSection() {
      return screen.getByRole('heading', { name: /Daftar Jenis Defect/ }).closest('section')!;
    }

    it('lists the built-in B/C types as locked, without a delete button', () => {
      render(<MasterDataPage />);
      const ngList = within(typeSection()).getByRole('list', { name: 'Daftar Defect (NG) B/C' });
      expect(within(ngList).getByText('Gas Hole Cope')).toBeInTheDocument();
      expect(within(ngList).getAllByText('bawaan').length).toBeGreaterThan(0);
      expect(within(ngList).queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows added types for the picked product with a delete button', async () => {
      render(<MasterDataPage />);
      const section = typeSection();
      expect(within(section).queryByText('Gerinda Ulang')).not.toBeInTheDocument();
      await userEvent.click(within(section).getByRole('button', { name: 'Camshaft' }));
      await userEvent.click(within(section).getByRole('button', { name: 'Hapus Gerinda Ulang dari Repair Camshaft' }));
      expect(deleteTypeMutate.mock.calls[0][0]).toBe(7);
    });

    it('adds a new type to the picked product and kind', async () => {
      render(<MasterDataPage />);
      const section = typeSection();
      await userEvent.click(within(section).getByRole('button', { name: 'Crankshaft' }));
      await userEvent.type(within(section).getByRole('textbox', { name: 'Tambah jenis Defect (NG) Crankshaft' }), 'Retak Halus');
      await userEvent.click(within(section).getByRole('button', { name: 'Tambah ke Defect (NG) Crankshaft' }));
      expect(addTypeMutate.mock.calls[0][0]).toEqual({ product: 'crankshaft', kind: 'defect', name: 'Retak Halus' });
    });
  });
});

