'use client';

import { useEffect, useState } from 'react';
import styles from './EntryModal.module.css';

// Always available as a manual fallback when nothing in `types` fits. Shared
// so DefectModal/RepairModal compare their selection against the exact same
// string this component appends, rather than each declaring its own.
export const OTHER_TYPE = 'Other';

interface TypeSelectProps {
  label: string;
  types: readonly string[];
  value: string;
  onChange: (value: string) => void;
  // Clears the search box each time this flips to true, so a filter left
  // over from the last time this modal opened (e.g. for BC 1TR's NG) doesn't
  // silently hide options the next time it opens for a different counter
  // that reuses the same list (e.g. BC 2TR's).
  isOpen: boolean;
  searchPlaceholder?: string;
}

/**
 * The searchable "pick a defect/repair type" control behind DefectModal and
 * RepairModal. The fixed lists run to 20+ entries, so a text filter above the
 * list gets an operator to the right one in a couple of keystrokes instead of
 * scrolling. "Other" is always appended, unaffected by the filter, as the
 * manual fallback for anything not in the list.
 */
export function TypeSelect({
  label, types, value, onChange, isOpen, searchPlaceholder = 'Cari jenis…',
}: TypeSelectProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  const query = search.trim().toLowerCase();
  const filtered = query ? types.filter((type) => type.toLowerCase().includes(query)) : types;

  return (
    <div className={styles.field}>
      <label>
        <span className={styles.fieldLabel}>{label}</span>
        <input
          type="text"
          className={`${styles.input} ${styles.searchInput}`}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <select
        className={styles.select}
        size={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {filtered.map((type) => <option key={type} value={type}>{type}</option>)}
        <option value={OTHER_TYPE}>{OTHER_TYPE}</option>
      </select>
      {query && filtered.length === 0 && (
        <p className={styles.searchEmpty}>Tidak ditemukan &mdash; pilih {OTHER_TYPE} untuk jenis lain</p>
      )}
    </div>
  );
}
