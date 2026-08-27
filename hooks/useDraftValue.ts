'use client';

import { useState } from 'react';

/**
 * Keeps a text field editable without the 3-second background poll (or the
 * optimistic-update grace refetch) yanking a half-typed value back to what the
 * server last saved — the "field keeps bouncing" bug.
 *
 * While the user is typing, the field shows a local draft and nothing is
 * written. `commit(parse(draft))` runs once, on blur (or Enter), and only if
 * the value actually changed; after that the draft is dropped and the field
 * follows server state again.
 */
export function useDraftValue<T>(
  serverValue: T,
  commit: (value: T) => void,
  options: { parse: (raw: string) => T; format: (value: T) => string },
) {
  const { parse, format } = options;
  const [draft, setDraft] = useState<string | null>(null);

  function flush() {
    if (draft === null) return;
    const parsed = parse(draft);
    if (format(parsed) !== format(serverValue)) commit(parsed);
    setDraft(null);
  }

  return {
    value: draft ?? format(serverValue),
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onBlur: flush,
    onKeyDown: (event: { key: string; currentTarget: { blur: () => void } }) => {
      if (event.key === 'Enter') event.currentTarget.blur();
    },
  };
}
