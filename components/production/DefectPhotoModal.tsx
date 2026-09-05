'use client';

import { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useDefectPhoto, useUploadDefectPhoto, useDeleteDefectPhoto } from '@/hooks/useDefectPhotos';
import { compressImageFile, isAcceptedImageType, MAX_SOURCE_FILE_BYTES } from '@/utils/imageCompress';
import type { PhotoChartType, PhotoGroup } from '@/lib/defectPhotos';
import styles from './EntryModal.module.css';
import photoStyles from './DefectPhotoModal.module.css';

interface DefectPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: PhotoGroup;
  chartType: PhotoChartType;
  title: string;
}

export function DefectPhotoModal({ isOpen, onClose, group, chartType, title }: DefectPhotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const photoQuery = useDefectPhoto(group, chartType, isOpen);
  const upload = useUploadDefectPhoto();
  const remove = useDeleteDefectPhoto();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!isAcceptedImageType(file.type)) {
      showToast('Format harus JPG, PNG, atau WEBP', 'error');
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      showToast('Ukuran file terlalu besar (maks 15MB)', 'error');
      return;
    }
    try {
      const imageData = await compressImageFile(file);
      upload.mutate(
        { group, chartType, imageData },
        {
          onSuccess: () => showToast('Foto berhasil diupload', 'success'),
          onError: (err) => showToast(err instanceof Error ? err.message : 'Gagal upload foto', 'error'),
        },
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses gambar', 'error');
    }
  }

  function handleDelete() {
    remove.mutate(
      { group, chartType },
      {
        onSuccess: () => showToast('Foto dihapus', 'success'),
        onError: (err) => showToast(err instanceof Error ? err.message : 'Gagal hapus foto', 'error'),
      },
    );
  }

  const photo = photoQuery.data;
  const isBusy = photoQuery.isLoading || upload.isPending || remove.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={photoStyles.hiddenInput}
        onChange={handleFileChange}
      />

      {photoQuery.isLoading && <p className={styles.description}>Memuat foto…</p>}

      {!photoQuery.isLoading && !photo && (
        <>
          <p className={styles.description}>
            Belum ada foto untuk defect ini. Upload foto untuk mendokumentasikan defect yang sedang terjadi.
          </p>
          <div className={photoStyles.dropzone} onClick={() => fileInputRef.current?.click()}>
            {upload.isPending ? 'Mengupload…' : '+ Upload Foto'}
          </div>
        </>
      )}

      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset */}
          <img src={photo.imageData} alt="Foto defect" className={photoStyles.preview} />
          <p className={photoStyles.updatedAt}>
            Diupload {new Date(photo.updatedAt).toLocaleString('id-ID')}
          </p>
        </>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>Tutup</button>
        {photo && (
          <button type="button" className={styles.cancelButton} onClick={handleDelete} disabled={isBusy}>
            Hapus
          </button>
        )}
        {photo && (
          <button
            type="button"
            className={styles.saveButtonNg}
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            {upload.isPending ? 'Mengupload…' : 'Ganti Foto'}
          </button>
        )}
      </div>
    </Modal>
  );
}
