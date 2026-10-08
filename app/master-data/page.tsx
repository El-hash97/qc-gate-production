'use client';

import { useState } from 'react';
import { useDefectLines, useAddDefectLine, useDeleteDefectLine } from '@/hooks/useDefectLines';
import { useToast } from '@/components/ui/ToastProvider';
import { DEFECT_LINE_NAMES, DEFECT_PRODUCTS } from '@/lib/types';
import type { DefectLineName, DefectProduct } from '@/lib/types';
import modalStyles from '@/components/production/EntryModal.module.css';
import styles from './page.module.css';

type Drafts = Record<string, string>;

const DEFAULT_SELECTED: Record<DefectLineName, DefectProduct> = {
  Melting: 'bc',
  Moulding: 'bc',
  'Core Making': 'bc',
  Finishing: 'bc',
};

export default function MasterDataPage() {
  const { mappings, isLoading } = useDefectLines();
  const addMutation = useAddDefectLine();
  const deleteMutation = useDeleteDefectLine();
  const { showToast } = useToast();
  // Tiap kolom line punya pilihan produk sendiri — hanya produk terpilih
  // yang tampil, supaya tidak semua terlihat sekaligus.
  const [selected, setSelected] = useState<Record<DefectLineName, DefectProduct>>(DEFAULT_SELECTED);
  const [drafts, setDrafts] = useState<Drafts>({});

  function draftKey(product: DefectProduct, line: DefectLineName) {
    return `${product}:${line}`;
  }

  function productLabel(product: DefectProduct) {
    return DEFECT_PRODUCTS.find((option) => option.value === product)?.label ?? product;
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
        {DEFECT_LINE_NAMES.map((line) => {
          const product = selected[line];
          const key = draftKey(product, line);
          return (
            <div key={line} className={styles.column}>
              <h2 className={styles.columnTitle}>{line}</h2>
              <div className={styles.productBtns} role="group" aria-label={`Produk untuk ${line}`}>
                {DEFECT_PRODUCTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={product === option.value ? styles.productBtnActive : styles.productBtn}
                    aria-pressed={product === option.value}
                    onClick={() => setSelected((prev) => ({ ...prev, [line]: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <ul className={styles.list}>
                {mappings.filter((m) => m.product === product && m.line === line).map((m) => (
                  <li key={m.id} className={styles.item}>
                    <span>{m.defectName}</span>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(m.id)}
                      aria-label={`Hapus ${m.defectName} (${productLabel(product)})`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.addRow}>
                <input
                  className={modalStyles.input}
                  aria-label={`Tambah defect ${productLabel(product)} untuk ${line}`}
                  placeholder="Tambah nama defect"
                  value={drafts[key] ?? ''}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                  onKeyDown={(event) => event.key === 'Enter' && handleAdd(product, line)}
                />
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => handleAdd(product, line)}
                  aria-label={`Tambah ke ${productLabel(product)} ${line}`}
                >
                  Tambah
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
