// Shift changeover times (WIB, UTC+7, no DST): the day shift is archived and
// reset at 19:50, the night shift at 07:10. Pure, so both the server
// (lib/autoReset.ts) and the browser trigger (hooks/useAutoReset.ts) use it.
export const AUTO_RESET_TIMES_WIB = [[7, 10], [19, 50]] as const;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// The most recent changeover at or before `now`, as a UTC instant.
export function latestCutoff(now: Date): Date {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  let latest = 0;
  for (const dayBack of [0, 1]) {
    for (const [h, m] of AUTO_RESET_TIMES_WIB) {
      const at = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - dayBack, h, m) - WIB_OFFSET_MS;
      if (at <= now.getTime() && at > latest) latest = at;
    }
  }
  return new Date(latest);
}
