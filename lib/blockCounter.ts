import { sql } from './db';
import { getBlocksProduced } from './history';
import { getProductionState } from './productionState';
import { getGrandTotal } from '@/utils/rates';

const KEY = 'baritori-blocks';

export interface BlockCounter {
  // blocks of all archived shifts
  archived: number;
  // blocks produced when the counter was last reset (0 = never)
  baseline: number;
}

async function getBaseline(): Promise<number> {
  try {
    const rows = (await sql`SELECT value FROM counter_baselines WHERE key = ${KEY}`) as { value: number }[];
    return rows[0]?.value ?? 0;
  } catch (err) {
    // Table not created yet (scripts/migrate-counter-baselines.mjs): count from the start.
    if ((err as { code?: string }).code === '42P01') return 0;
    throw err;
  }
}

export async function getBlockCounter(): Promise<BlockCounter> {
  const [archived, baseline] = await Promise.all([getBlocksProduced(), getBaseline()]);
  return { archived, baseline };
}

// Start the counter over, e.g. once the worn part has been replaced: everything
// produced so far (archived shifts + the one running) becomes the new zero.
export async function resetBlockCounter(): Promise<BlockCounter> {
  const [archived, state] = await Promise.all([getBlocksProduced(), getProductionState()]);
  const baseline = archived + (state ? getGrandTotal(state, 'bc') : 0);
  await sql`
    INSERT INTO counter_baselines (key, value, saved_at) VALUES (${KEY}, ${baseline}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, saved_at = now()
  `;
  return { archived, baseline };
}
