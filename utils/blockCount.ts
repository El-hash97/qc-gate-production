import type { StationDetail } from './stationDetails';

// Baritori's tooling can wear out after this many blocks; warn a bit before.
export const BLOCK_LIMIT = 32400;
export const BLOCK_WARN_AT = 32000;

const fmt = (n: number) => n.toLocaleString('en-US');

// Baritori's card with the running block count in its description, plus a
// warning from BLOCK_WARN_AT on.
export function withBlockCount(detail: StationDetail, produced: number): StationDetail {
  const notice = produced >= BLOCK_LIMIT
    ? { level: 'danger' as const, text: `Over ${fmt(BLOCK_LIMIT)} blocks — a part may be worn out or broken. Inspect before running more.` }
    : produced >= BLOCK_WARN_AT
      ? { level: 'warn' as const, text: `Nearing ${fmt(BLOCK_LIMIT)} blocks (${fmt(BLOCK_LIMIT - produced)} to go) — a part may be damaged. Inspect it.` }
      : undefined;
  return {
    ...detail,
    description: [...detail.description, `Blocks produced so far: ${fmt(produced)} pcs (limit ${fmt(BLOCK_LIMIT)}).`],
    notice,
  };
}
