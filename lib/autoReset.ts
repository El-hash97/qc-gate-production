import { sql } from './db';
import { resetProductionState } from './reset';
import type { ProductionState } from './types';
import { latestCutoff } from '@/utils/shiftReset';

export type AutoResetResult = { reset: false } | { reset: true; state: ProductionState };

// Archive + reset the shift once per changeover. Any open Dashboard/Input tab
// and the backup Vercel cron all call this; the conditional UPDATE is an
// atomic claim, so only the first caller after a changeover resets and the
// rest are no-ops. A manual Reset also stamps last_reset_at, so it counts.
export async function autoResetIfDue(now: Date = new Date()): Promise<AutoResetResult> {
  const cutoff = latestCutoff(now);
  const claimed = (await sql`
    UPDATE production_state SET last_reset_at = now()
    WHERE id = 1 AND last_reset_at < ${cutoff.toISOString()}
    RETURNING id
  `) as { id: number }[];
  if (claimed.length === 0) return { reset: false };
  try {
    return { reset: true, state: await resetProductionState() };
  } catch (err) {
    // Release the claim so the next caller retries this changeover.
    await sql`UPDATE production_state SET last_reset_at = ${new Date(cutoff.getTime() - 1000).toISOString()} WHERE id = 1`;
    throw err;
  }
}
