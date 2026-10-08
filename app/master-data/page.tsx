'use client';

import { useState } from 'react';
import { useDefectLines, useAddDefectLine, useDeleteDefectLine } from '@/hooks/useDefectLines';
import { useToast } from '@/components/ui/ToastProvider';
import { DEFECT_LINE_NAMES, DEFECT_PRODUCTS } from '@/lib/types';
import type { DefectLineName, DefectProduct } from '@/lib/types';
import modalStyles from '@/components/production/EntryModal.module.css';
import styles from './page.module.css';

type Drafts = Record<string, string>;

export default function MasterDataPage() {
  const { mappings, isLoading } = useDefectLines();
  const addMutation = useAddDefectLine();
  const deleteMutation = useDeleteDefectLine();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Drafts>({});

  function draftKey(product: DefectProduct, line: DefectLineName) {
    return `${product}:${line}`;
  }

  function handleAdd(product: DefectProduct, line: DefectLineName) {
    const key = draftKey(product, line);
    const defectName = (drafts[key] ?? '').trim();
    if (!defectName) return;
    addMutation.mutate(
      { product, line, defectName },
      {
        onSuccess: () => setDrafts((prev) => ({ ...prev, [key]: '' })),
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
      {/* Tiap produk sumber line-nya beda (mis. Dross di B/C dari Moulding,
          di Camshaft dari stage lain), jadi tiap line diisi per produk. */}
      {isLoading && <p>Memuat data…</p>}
      <div className={styles.columns}>
        {DEFECT_LINE_NAMES.map((line) => (
          <div key={line} className={styles.column}>
            <h2 className={styles.columnTitle}>{line}</h2>
            {DEFECT_PRODUCTS.map((option) => (
              <div key={option.value} className={styles.productGroup}>
                <h3 className={styles.productLabel}>{option.label}</h3>
                <ul className={styles.list}>
                  {mappings.filter((m) => m.product === option.value && m.line === line).map((m) => (
                    <li key={m.id} className={styles.item}>
                      <span>{m.defectName}</span>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDelete(m.id)}
                        aria-label={`Hapus ${m.defectName} (${option.label})`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className={styles.addRow}>
                  <input
                    className={modalStyles.input}
                    aria-label={`Tambah defect ${option.label} untuk ${line}`}
                    placeholder="Tambah nama defect"
                    value={drafts[draftKey(option.value, line)] ?? ''}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [draftKey(option.value, line)]: event.target.value }))}
                    onKeyDown={(event) => event.key === 'Enter' && handleAdd(option.value, line)}
                  />
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => handleAdd(option.value, line)}
                    aria-label={`Tambah ke ${option.label} ${line}`}
                  >
                    Tambah
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
