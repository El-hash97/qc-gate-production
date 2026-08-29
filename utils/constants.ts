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

export const SHIFTS = ['Shift Red', 'Shift White'] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];
export type RepairType = (typeof REPAIR_TYPES)[number];
export type Shift = (typeof SHIFTS)[number];
