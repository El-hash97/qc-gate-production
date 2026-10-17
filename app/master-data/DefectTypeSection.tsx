'use client';

import { useState } from 'react';
import { useAddDefectType, useDefectTypes, useDeleteDefectType } from '@/hooks/useDefectTypes';
import { useToast } from '@/components/ui/ToastProvider';
import { builtinTypes } from '@/utils/constants';
import { DEFECT_PRODUCTS } from '@/lib/types';
import type { DefectProduct, DefectTypeKind } from '@/lib/types';
import modalStyles from '@/components/production/EntryModal.module.css';
import styles from './page.module.css';

const KINDS: { value: DefectTypeKind; label: string }[] = [
  { value: 'defect', label: 'Defect (NG)' },
  { value: 'repair', label: 'Repair' },
];

// The NG / Repair pickers on the Input page = built-in list (locked here) +
// types added below, one list per product × kind.
export function DefectTypeSection() {
  const { custom } = useDefectTypes();
  const addMutation = useAddDefectType();
  const deleteMutation = useDeleteDefectType();
  const { showToast } = useToast();
  const [product, setProduct] = useState<DefectProduct>('bc');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const productLabel = DEFECT_PRODUCTS.find((p) => p.value === product)?.label ?? product;

  function handleAdd(kind: DefectTypeKind) {
    const key = `${product}:${kind}`;
    const name = (drafts[key] ?? '').trim();
    if (!name) return;
    addMutation.mutate(
      { product, kind, name },
      {
        onSuccess: () => setDrafts((prev) => ({ ...prev, [key]: '' })),
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : 'Gagal menambah jenis', 'error'),
      },
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onError: (err: unknown) => showToast(err instanceof Error ? err.message : 'Gagal menghapus jenis', 'error'),
    });
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Daftar Jenis Defect &amp; Repair</h2>
      <div className={styles.productTabs} role="group" aria-label="Produk daftar jenis">
        {DEFECT_PRODUCTS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={product === option.value ? styles.productBtnActive : styles.productBtn}
            aria-pressed={product === option.value}
            onClick={() => setProduct(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.typeColumns}>
        {KINDS.map(({ value: kind, label }) => {
          const key = `${product}:${kind}`;
          const added = custom.filter((t) => t.product === product && t.kind === kind);
          return (
            <div key={kind} className={styles.column}>
              <h3 className={styles.columnTitle}>{label} — {productLabel}</h3>
              <ul className={`${styles.list} ${styles.typeList}`} aria-label={`Daftar ${label} ${productLabel}`}>
                {builtinTypes(product, kind).map((name) => (
                  <li key={`b:${name}`} className={styles.item}>
                    <span>{name}</span>
                    <span className={styles.builtinTag}>bawaan</span>
                  </li>
                ))}
                {added.map((t) => (
                  <li key={t.id} className={`${styles.item} ${styles.addedItem}`}>
                    <span>{t.name}</span>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(t.id)}
                      aria-label={`Hapus ${t.name} dari ${label} ${productLabel}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.addRow}>
                <input
                  className={modalStyles.input}
                  aria-label={`Tambah jenis ${label} ${productLabel}`}
                  placeholder="Tambah jenis baru"
                  value={drafts[key] ?? ''}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                  onKeyDown={(event) => event.key === 'Enter' && handleAdd(kind)}
                />
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => handleAdd(kind)}
                  aria-label={`Tambah ke ${label} ${productLabel}`}
                >
                  Tambah
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
