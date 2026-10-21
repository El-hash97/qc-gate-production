import type { StationDetail } from './stationDetails';

// Baritori's tooling can wear out after this many blocks; warn a bit before.
export const BLOCK_LIMIT = 32400;
export const BLOCK_WARN_AT = 32000;

// Baritori's card with a bar of the blocks produced since the last reset above
// its spec cards; `onReset` (when given) adds a Reset button to it.
export function withBlockCount(detail: StationDetail, produced: number, onReset?: () => void): StationDetail {
  return { ...detail, meter: { label: 'Blocks produced', value: produced, max: BLOCK_LIMIT, warnAt: BLOCK_WARN_AT, unit: 'pcs', onReset } };
}
