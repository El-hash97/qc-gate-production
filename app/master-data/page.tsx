'use client';

import { useState } from 'react';
import { useDefectLines, useAddDefectLine, useDeleteDefectLine } from '@/hooks/useDefectLines';
import { useToast } from '@/components/ui/ToastProvider';
import { DEFECT_LINE_NAMES } from '@/lib/types';
import type { DefectLineName } from '@/lib/types';
import modalStyles from '@/components/production/EntryModal.module.css';
import styles from './page.module.css';

type Drafts = Record<DefectLineName, string>;

const EMPTY_DRAFTS: Drafts = { Melting: '', Moulding: '', 'Core Making': '', Finishing: '' };

export default function MasterDataPage() {
  const { mappings, isLoading } = useDefectLines();
  const addMutation = useAddDefectLine();
  const deleteMutation = useDeleteDefectLine();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS);

  function handleAdd(line: DefectLineName) {
    const defectName = drafts[line].trim();
    if (!defectName) return;
    addMutation.mutate(
      { line, defectName },
      {
        onSuccess: () => setDrafts((prev) => ({ ...prev, [line]: '' })),
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : 'Gagal menambah defect', 'error'),
      },
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onError: (err: unknown) => showToast(err instanceof Error ? err.message : 'Gagal menghapus defect', 'error'),
    });
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Master Data — Suspect Defect Line</h1>
      {isLoading && <p>Memuat data…</p>}
      <div className={styles.columns}>
        {DEFECT_LINE_NAMES.map((line) => (
          <div key={line} className={styles.column}>
            <h2 className={styles.columnTitle}>{line}</h2>
            <ul className={styles.list}>
              {mappings.filter((m) => m.line === line).map((m) => (
                <li key={m.id} className={styles.item}>
                  <span>{m.defectName}</span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(m.id)}
                    aria-label={`Hapus ${m.defectName}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.addRow}>
              <input
                className={modalStyles.input}
                aria-label={`Tambah defect untuk ${line}`}
                placeholder="Tambah nama defect"
                value={drafts[line]}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [line]: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd(line)}
              />
              <button
                type="button"
                className={styles.addButton}
                onClick={() => handleAdd(line)}
                aria-label={`Tambah ke ${line}`}
              >
                Tambah
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
