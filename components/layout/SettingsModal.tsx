'use client';

import { Modal } from '@/components/ui/Modal';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panels: readonly { id: string; label: string }[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}

export function SettingsModal({ isOpen, onClose, panels, hidden, onToggle }: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Panel Dashboard">
      <div className={styles.list}>
        {panels.map((panel) => (
          <label key={panel.id} className={styles.item}>
            <input
              type="checkbox"
              checked={!hidden.has(panel.id)}
              onChange={() => onToggle(panel.id)}
            />
            {panel.label}
          </label>
        ))}
      </div>
    </Modal>
  );
}
