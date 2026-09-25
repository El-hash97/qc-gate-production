'use client';

import { useEffect, useState } from 'react';
import styles from './EntryModal.module.css';

// Always available as a manual fallback when nothing in `types` fits. Shared
// so DefectModal/RepairModal compare their selection against the exact same
// string this component appends, rather than each declaring its own.
export const OTHER_TYPE = 'Other';

// Substring matches, but with the leading letters weighted first: a type
// whose name *starts* with the query sorts ahead of one that merely contains
// it partway through, since that's almost always the one being typed for.
// Stable within each of those two groups — original list order otherwise.
function rankBySearch(types: readonly string[], query: string): string[] {
  const startsWith: string[] = [];
  const containsOnly: string[] = [];
  for (const type of types) {
    const lower = type.toLowerCase();
    if (!lower.includes(query)) continue;
    (lower.startsWith(query) ? startsWith : containsOnly).push(type);
  }
  return [...startsWith, ...containsOnly];
}

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
  onSearch?: (query: string) => void;
}

/**
 * The searchable "pick a defect/repair type" control behind DefectModal and
 * RepairModal. Fixed lists run to 20+ entries, so a text filter above the
 * list gets an operator to the right one in a couple of keystrokes instead of
 * scrolling. "Other" is always appended, unaffected by the filter, as the
 * manual fallback for anything not in the list.
 *
 * Tablet-friendly: options are full-width buttons (44px min tap target),
 * clicking anywhere on the row selects it. Pressing Enter in the search
 * field selects the highlighted (first) filtered result — speeds up keyboard
 * / scanner input. When Over Dimensi is selected the parent immediately
 * shows its detail fields.
 */
export function TypeSelect({
  label, types, value, onChange, isOpen, searchPlaceholder = 'Cari jenis…', onSearch,
}: TypeSelectProps) {
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setHighlighted(0);
      onSearch?.('');
    }
  }, [isOpen]);

  const query = search.trim().toLowerCase();
  const filtered = query ? rankBySearch(types, query) : [...types];
  const allOptions = [...filtered, OTHER_TYPE];

  // Keep highlighted in bounds when filter changes
  useEffect(() => {
    if (highlighted >= allOptions.length) setHighlighted(0);
  }, [allOptions.length, highlighted]);

  function handleSelect(target: string) {
    onChange(target);
    // Clear search so the full list shows again and parent can reveal
    // the next stage (Lot/Flask or Over Dimensi detail). This also makes
    // isSearching false so the detail popup isn't hidden while typing.
    setSearch('');
    setHighlighted(0);
    onSearch?.('');
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = allOptions[highlighted] ?? allOptions[0];
      if (target) handleSelect(target);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % allOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + allOptions.length) % allOptions.length);
    }
  }

  const isSearching = search.trim().length > 0;

  return (
    <div className={styles.field}>
      <label>
        <span className={styles.fieldLabel}>{label}</span>
        {!isSearching && value && (
          <div className={styles.selectedValue} aria-live="polite">
            Terpilih: <strong>{value}</strong>
          </div>
        )}
        <input
          type="text"
          className={`${styles.input} ${styles.searchInput}`}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => {
            const v = event.target.value;
            setSearch(v);
            setHighlighted(0);
            onSearch?.(v);
          }}
          onKeyDown={handleSearchKeyDown}
          aria-label={label}
        />
      </label>
      <div
        role="listbox"
        aria-label={`${label} options`}
        className={styles.typeList}
      >
        {allOptions.map((type, idx) => (
          <button
            key={type}
            type="button"
            role="option"
            aria-selected={value === type}
            className={
              value === type
                ? styles.typeOptionActive
                : idx === highlighted
                  ? styles.typeOptionHighlighted
                  : styles.typeOption
            }
            onClick={() => handleSelect(type)}
          >
            {type}
          </button>
        ))}
      </div>
      {query && filtered.length === 0 && (
        <p className={styles.searchEmpty}>Tidak ditemukan &mdash; pilih {OTHER_TYPE} untuk jenis lain</p>
      )}
    </div>
  );
}
