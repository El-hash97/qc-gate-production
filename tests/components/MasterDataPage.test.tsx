import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMappings = [
  { id: 1, line: 'Melting', defectName: 'Kandama' },
  { id: 2, line: 'Moulding', defectName: 'Gomi' },
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

  it('lists each defect under its own line', () => {
    render(<MasterDataPage />);
    expect(screen.getByText('Kandama')).toBeInTheDocument();
    expect(screen.getByText('Gomi')).toBeInTheDocument();
  });

  it("adds a defect name typed into a specific line's input", async () => {
    render(<MasterDataPage />);
    const input = screen.getByRole('textbox', { name: 'Tambah defect untuk Melting' });
    await userEvent.type(input, 'Yuzakai');
    await userEvent.click(screen.getByRole('button', { name: 'Tambah ke Melting' }));
    expect(addMutate).toHaveBeenCalledTimes(1);
    expect(addMutate.mock.calls[0][0]).toEqual({ line: 'Melting', defectName: 'Yuzakai' });
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
