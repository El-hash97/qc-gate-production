'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Returns whether the credentials matched, so this stays a plain
  // controlled form — the caller (TopNav, via useAuth) owns the actual
  // session state, same shape as onSave in DefectModal/RepairModal.
  onLogin: (username: string, password: string) => boolean;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function reset() {
    setUsername('');
    setPassword('');
    setError(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (onLogin(username, password)) {
      reset();
      onClose();
    } else {
      setError(true);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Login">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Username</span>
        <input
          className={styles.input}
          value={username}
          onChange={(event) => { setUsername(event.target.value); setError(false); }}
          onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
          autoFocus
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Password</span>
        <input
          type="password"
          className={styles.input}
          value={password}
          onChange={(event) => { setPassword(event.target.value); setError(false); }}
          onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
        />
      </label>
      {error && <p className={styles.error}>Username atau password salah</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={handleClose}>Batal</button>
        <button type="button" className={styles.submitButton} onClick={handleSubmit}>Masuk</button>
      </div>
    </Modal>
  );
}
