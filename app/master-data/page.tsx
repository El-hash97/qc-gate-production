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
  const [product, setProduct] = useState<DefectProduct>('bc');
  const [drafts, setDrafts] = useState<Drafts>({});

  function draftKey(line: DefectLineName) {
    return `${product}:${line}`;
  }

  function handleAdd(line: DefectLineName) {
    const key = draftKey(line);
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
          di Camshaft dari stage lain), jadi mapping diisi per produk. */}
      <div className={styles.productTabs} role="group" aria-label="Filter produk">
        {DEFECT_PRODUCTS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={product === option.value ? styles.productTabActive : styles.productTab}
            aria-pressed={product === option.value}
            onClick={() => setProduct(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {isLoading && <p>Memuat data…</p>}
      <div className={styles.columns}>
        {DEFECT_LINE_NAMES.map((line) => (
          <div key={line} className={styles.column}>
            <h2 className={styles.columnTitle}>{line}</h2>
            <ul className={styles.list}>
              {mappings.filter((m) => m.product === product && m.line === line).map((m) => (
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
                value={drafts[draftKey(line)] ?? ''}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [draftKey(line)]: event.target.value }))}
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
