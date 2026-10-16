import { sql } from './db';

// Shared display settings (which Overview panels, pins and tags show), one
// JSON row per page so every screen in the plant follows the same layout.
export const DISPLAY_KEYS = ['overview'] as const;
export type DisplayKey = (typeof DISPLAY_KEYS)[number];

const MODES = ['open', 'folded', 'hidden'] as const;
type Mode = (typeof MODES)[number];
export interface DisplaySettings {
  modes: Record<string, Mode>;
}

export function isDisplayKey(value: string): value is DisplayKey {
  return (DISPLAY_KEYS as readonly string[]).includes(value);
}

// Keep only well-formed entries: short id → one of the three modes.
export function cleanSettings(value: unknown): DisplaySettings {
  const raw = (value as { modes?: unknown } | null)?.modes;
  const modes: Record<string, Mode> = {};
  if (raw && typeof raw === 'object') {
    for (const [id, mode] of Object.entries(raw)) {
      if (id.length <= 40 && (MODES as readonly unknown[]).includes(mode)) modes[id] = mode as Mode;
    }
  }
  return { modes };
}

export async function getDisplaySettings(key: DisplayKey): Promise<DisplaySettings> {
  try {
    const rows = (await sql`SELECT value FROM display_settings WHERE key = ${key}`) as { value: unknown }[];
    return cleanSettings(rows[0]?.value);
  } catch (err) {
    // Table not created yet (scripts/migrate-display-settings.mjs): show the
    // default layout instead of breaking the page.
    if ((err as { code?: string }).code === '42P01') return { modes: {} };
    throw err;
  }
}

export async function saveDisplaySettings(key: DisplayKey, value: unknown): Promise<DisplaySettings> {
  const clean = cleanSettings(value);
  await sql`
    INSERT INTO display_settings (key, value, saved_at) VALUES (${key}, ${JSON.stringify(clean)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, saved_at = now()
  `;
  return clean;
}
