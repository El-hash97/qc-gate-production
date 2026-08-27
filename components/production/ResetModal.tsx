'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useReset } from '@/hooks/useReset';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './EntryModal.module.css';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetModal({ isOpen, onClose }: ResetModalProps) {
  const [password, setPassword] = useState('');
  const { showToast } = useToast();
  const reset = useReset();

  function handleConfirm() {
    reset.mutate(password, {
      onSuccess: () => {
        showToast('Data berhasil direset & diarsipkan', 'success');
        setPassword('');
        onClose();
      },
      onError: (err) => {
        // Surface the server's reason (e.g. RESET_PASSWORD not configured on
        // the server) instead of always blaming the password.
        const message = err instanceof Error && err.message && err.message !== 'Reset failed'
          ? err.message
          : 'Password salah!';
        showToast(message, 'error');
      },
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Konfirmasi Reset">
      <p className={styles.description}>
        Semua data produksi akan dihapus. Masukkan password untuk melanjutkan.
      </p>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Password</span>
        <input
          type="password"
          className={styles.input}
          placeholder="Masukkan password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>Batal</button>
        <button type="button" className={styles.saveButtonNg} onClick={handleConfirm}>Reset Data</button>
      </div>
    </Modal>
  );
}
