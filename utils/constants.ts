export const OVER_DIMENSI = 'Over Dimensi' as const;

export const DEFECT_TYPES = [
  'Gas Hole Cope',
  'Gas Hole Drag',
  'Gomi Drag',
  'Gomi Cope',
  'Gomi Oil Pan',
  'Pin Hole Cope',
  'Kake Headment',
  'Tsurikomi Front',
  'Tsurikomi Rear',
  'Tsurikomi Headment',
  'Tsurikomi Oil Pan',
  'Yumogori',
  'Kandama Front',
  'Kandama Rear',
  'Kandama Drag',
  'Kandama Cope',
  'Crack',
  'Kataochi',
  'Gyakubari',
  'Scabing',
  'Mikui',
  'Inspeksi',
  'Yuzakai',
  OVER_DIMENSI,
] as const;

export const REPAIR_TYPES = [
  'Mejashi Bore 1',
  'Mejashi Bore 2',
  'Mejashi Bore 3',
  'Mejashi Bore 4',
  'Gomi Drag',
  'Gomi Cope',
  'Gomi Front',
  'Gomi Rear',
  'Gomi Oil Pan',
  'Pin Hole Cope',
  'Kake',
  'Dakon',
  'Tsurikomi Front',
  'Tsurikomi Rear',
  'Tsurikomi Headment',
  'Tsurikomi Oil Pan',
  'Yumogori',
  'Kandama Front',
  'Kandama Rear',
  'Kandama Drag',
  'Kandama Cope',
  'Crack',
  'Kataochi',
  'Gyakubari',
  'Scabing',
  'Mikui',
  'Inspeksi',
  'Yuzakai',
  OVER_DIMENSI,
] as const;

// Shared defect/repair/NG list for the Camshaft and Crankshaft products.
export const SHAFT_DEFECT_TYPES = [
  'Gomi Drag',
  'Gomi Cope',
  'Tsurikomi',
  'Dakon',
  'Kake',
  'Ireboshi',
  'Hike',
  'Yumogori',
  'Kataochi',
  'Guichi',
  'Yuzakai',
  'Ihada Area Barcode',
  'Dross',
  'Yumoyou',
] as const;

export const SHAFT_REPAIR_TYPES = SHAFT_DEFECT_TYPES;

// Repair types that need a die (mould) number recorded — one of the four
// boring stations, each fed from a specific die, so which die the piece
// actually came from matters for traceability beyond the station name alone.
// Exact-list membership, not a prefix check, so a manually typed "Other"
// value can never accidentally match.
export const DIE_NUMBER_REPAIR_TYPES = [
  'Mejashi Bore 1', 'Mejashi Bore 2', 'Mejashi Bore 3', 'Mejashi Bore 4',
] as const;

export function needsDieNumber(repairType: string): boolean {
  return (DIE_NUMBER_REPAIR_TYPES as readonly string[]).includes(repairType);
}

export function needsOverDimensiDetail(type: string): boolean {
  return type === OVER_DIMENSI;
}

export const SHIFTS = ['Shift Red', 'Shift White'] as const;

export const SHIFT_TIMES = [
  { value: 'day', label: 'Day (07:00–19:00)' },
  { value: 'night', label: 'Night (20:00–08:00)' },
] as const;

export type ShiftTimeOption = (typeof SHIFT_TIMES)[number]['value'];

// PIC / Group Leader per shift. `key` is what gets stored; `photo` is a
// path under /public. Selecting a PIC also sets the shift.
export const PICS = [
  { key: 'suryo', name: 'SURYO HADI WIHARJO', shift: 'Shift Red', photo: '/pic/suryo.jpg' },
  { key: 'koewatno', name: 'KOEWATNO', shift: 'Shift White', photo: '/pic/koewatno.jpg' },
] as const;

export type PicKey = (typeof PICS)[number]['key'];

export function findPic(key: string | undefined) {
  return PICS.find((p) => p.key === key);
}

export type DefectType = (typeof DEFECT_TYPES)[number];
export type RepairType = (typeof REPAIR_TYPES)[number];
export type Shift = (typeof SHIFTS)[number];
