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

  it('renders the three product tabs and all four fixed line columns', () => {
    render(<MasterDataPage />);
    expect(screen.getByRole('button', { name: 'B/C' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Camshaft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crankshaft' })).toBeInTheDocument();
    expect(screen.getByText('Melting')).toBeInTheDocument();
    expect(screen.getByText('Moulding')).toBeInTheDocument();
    expect(screen.getByText('Core Making')).toBeInTheDocument();
    expect(screen.getByText('Finishing')).toBeInTheDocument();
  });

  it('lists each defect under its own line for the active product', () => {
    render(<MasterDataPage />);
    expect(screen.getByText('Kandama')).toBeInTheDocument();
    expect(screen.getByText('Gomi')).toBeInTheDocument();
    // Camshaft-only entry stays hidden until its tab is active.
    expect(screen.queryByText('Bari')).not.toBeInTheDocument();
  });

  it('switches the listed defects when another product tab is picked', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Camshaft' }));
    expect(screen.queryByText('Kandama')).not.toBeInTheDocument();
    expect(screen.getByText('Bari')).toBeInTheDocument();
  });

  it("adds a defect name typed into a specific line's input, scoped to the active product", async () => {
    render(<MasterDataPage />);
    const input = screen.getByRole('textbox', { name: 'Tambah defect untuk Melting' });
    await userEvent.type(input, 'Yuzakai');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Melting' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ product: 'bc', line: 'Melting', defectName: 'Yuzakai' });
  });

  it('adds under the newly active product after switching tabs', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Crankshaft' }));
    const input = screen.getByRole('textbox', { name: 'Tambah defect untuk Finishing' });
    await userEvent.type(input, 'Kake');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Finishing' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ product: 'crankshaft', line: 'Finishing', defectName: 'Kake' });
  });

  it('does not add an empty defect name', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Melting' }));
    expect(addMutate).not.toHaveBeenCalled();
  });

  it('deletes a defect by its id via its own delete button', async () => {
    render(<MasterDataPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Kandama' }));
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate.mock.calls[0][0]).toBe(1);
  });
});
