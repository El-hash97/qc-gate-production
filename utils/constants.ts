export const DEFECT_TYPES = [
  'Gas Hole Cope',
  'Gas Hole Drag',
  'Gomi Drag',
  'Gomi Cope',
  'Pin Hole Cope',
  'Kake Headment',
  'Tsurikomi Oil Pan',
  'Tsurikomi Front',
  'Kandama Front',
  'Kandama Rear',
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
  'Pin Hole Cope',
  'Kake',
  'Dakon',
] as const;

export const SHIFTS = ['Shift Red', 'Shift White'] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];
export type RepairType = (typeof REPAIR_TYPES)[number];
export type Shift = (typeof SHIFTS)[number];
