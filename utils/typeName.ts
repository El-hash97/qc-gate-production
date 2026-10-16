// Defect/repair names typed via "Other" drift in case and spacing ("Yuzakai
// Cope" vs "Yuzakai cope"); compared by this key they are the same type.
export function typeKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// The spelling to store for a typed name: an already-known spelling that
// matches it (fixed list or one logged earlier), else the tidied input.
export function canonicalType(name: string, known: Iterable<string>): string {
  const key = typeKey(name);
  for (const candidate of known) {
    if (typeKey(candidate) === key) return candidate;
  }
  return name.trim().replace(/\s+/g, ' ');
}

// Merge tallies whose names differ only in case/spacing. The merged entry
// keeps the spelling that carries the most pcs.
export function mergeTypeVariants(data: Record<string, number>): Record<string, number> {
  const groups = new Map<string, { label: string; top: number; total: number }>();
  for (const [name, count] of Object.entries(data)) {
    const key = typeKey(name);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { label: name, top: count, total: count });
    } else {
      group.total += count;
      if (count > group.top) {
        group.label = name;
        group.top = count;
      }
    }
  }
  const out: Record<string, number> = {};
  for (const { label, total } of groups.values()) out[label] = total;
  return out;
}
