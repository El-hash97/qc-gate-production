import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
const mockShowToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import MasterDataPage from '@/app/master-data/page';

describe('MasterDataPage', () => {
  beforeEach(() => {
    addMutate.mockClear();
    deleteMutate.mockClear();
    mockShowToast.mockClear();
  });

  it('renders all four fixed line columns', () => {
    render(<MasterDataPage />);
    expect(screen.getByText('Melting')).toBeInTheDocument();
    expect(screen.getByText('Moulding')).toBeInTheDocument();
    expect(screen.getByText('Core Making')).toBeInTheDocument();
    expect(screen.getByText('Finishing')).toBeInTheDocument();
  });

  it('lists every product group under its line, all visible at once', () => {
    render(<MasterDataPage />);
    expect(screen.getByText('Kandama')).toBeInTheDocument();
    expect(screen.getByText('Gomi')).toBeInTheDocument();
    expect(screen.getByText('Bari')).toBeInTheDocument();
  });

  it("adds a defect name typed into a specific product and line's input", async () => {
    render(<MasterDataPage />);
    const input = screen.getByRole('textbox', { name: 'Tambah defect B/C untuk Melting' });
    await userEvent.type(input, 'Yuzakai');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke B/C Melting' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ product: 'bc', line: 'Melting', defectName: 'Yuzakai' });
  });

  it('adds under another product of the same line', async () => {
    render(<MasterDataPage />);
    const input = screen.getByRole('textbox', { name: 'Tambah defect Camshaft untuk Finishing' });
    await userEvent.type(input, 'Kake');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Camshaft Finishing' }));
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
});
