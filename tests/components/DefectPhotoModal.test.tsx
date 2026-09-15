import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAuth = { authed: false, openLoginModal: vi.fn() };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockPhotoQuery: { data: { imageData: string; updatedAt: string } | null; isLoading: boolean } = {
  data: null,
  isLoading: false,
};
const uploadMutate = vi.fn();
const removeMutate = vi.fn();
vi.mock('@/hooks/useDefectPhotos', () => ({
  useDefectPhoto: () => mockPhotoQuery,
  useUploadDefectPhoto: () => ({ mutate: uploadMutate, isPending: false }),
  useDeleteDefectPhoto: () => ({ mutate: removeMutate, isPending: false }),
}));

import { DefectPhotoModal } from '@/components/production/DefectPhotoModal';

describe('DefectPhotoModal', () => {
  beforeEach(() => {
    mockAuth.authed = false;
    mockPhotoQuery.data = null;
    mockPhotoQuery.isLoading = false;
    vi.clearAllMocks();
  });

  it('hides upload controls and shows a login prompt when logged out with no photo', () => {
    render(
      <DefectPhotoModal
        isOpen group="bc" chartType="ng" defectType="Gas Hole" title="Gas Hole"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Belum ada foto untuk defect ini.')).toBeInTheDocument();
    expect(screen.queryByText('+ Upload Foto')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login untuk kelola foto' })).toBeInTheDocument();
  });

  it('hides delete/replace and shows a login prompt when logged out with a photo', () => {
    mockPhotoQuery.data = { imageData: 'data:image/png;base64,abc', updatedAt: new Date().toISOString() };
    render(
      <DefectPhotoModal
        isOpen group="bc" chartType="ng" defectType="Gas Hole" title="Gas Hole"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByAltText('Foto defect')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ganti Foto' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login untuk kelola foto' })).toBeInTheDocument();
  });

  it('opens the login modal when the logged-out prompt is clicked', async () => {
    render(
      <DefectPhotoModal
        isOpen group="bc" chartType="ng" defectType="Gas Hole" title="Gas Hole"
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Login untuk kelola foto' }));
    expect(mockAuth.openLoginModal).toHaveBeenCalledTimes(1);
  });

  it('shows upload/delete/replace controls once logged in', () => {
    mockAuth.authed = true;
    mockPhotoQuery.data = { imageData: 'data:image/png;base64,abc', updatedAt: new Date().toISOString() };
    render(
      <DefectPhotoModal
        isOpen group="bc" chartType="ng" defectType="Gas Hole" title="Gas Hole"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ganti Foto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login untuk kelola foto' })).not.toBeInTheDocument();
  });

  it('shows the upload dropzone once logged in with no photo yet', () => {
    mockAuth.authed = true;
    render(
      <DefectPhotoModal
        isOpen group="bc" chartType="ng" defectType="Gas Hole" title="Gas Hole"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('+ Upload Foto')).toBeInTheDocument();
  });
});
