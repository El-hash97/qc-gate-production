import { DEFECT_LINE_NAMES, type DefectLineMapping, type DefectLineName } from '@/lib/types';

// Master-data names are short/generic ("Kandama"); logged defect types are
// the full DEFECT_TYPES/SHAFT_DEFECT_TYPES strings ("Kandama Front"). Strip
// whitespace (not just lowercase) so a one-word master entry like "Pinhole"
// still matches "Pin Hole Cope" — a heuristic, not a guarantee; a mismatch
// is fixed by editing the master-data spelling, not by changing this code.
export function matchesDefectLine(defectType: string, masterName: string): boolean {
  const a = defectType.toLowerCase().replace(/\s+/g, '');
  const b = masterName.toLowerCase().replace(/\s+/g, '');
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export interface LineParetoBreakdownItem {
  type: string;
  count: number;
  // This type's share of its own line's total (not the grand total).
  percent: number;
}

export interface LineParetoBar {
  line: DefectLineName;
  total: number;
  // This line's share of the sum of all 4 bars' totals — always sums to
  // 100 across the 4 bars, even though `total` itself can double-count a
  // defect that's suspect for more than one line.
  percent: number;
  breakdown: LineParetoBreakdownItem[];
}

/**
 * Aggregates a shift's `defectData` (defect type -> pcs, the same shape
 * ParetoChart consumes) into one bar per fixed suspect line. A defect
 * matching several lines' master data is counted in full for each —
 * deliberately, this is a "which line to go inspect" view, not an exclusive
 * root-cause split.
 */
export function paretoByLine(
  defectData: Record<string, number>,
  mappings: DefectLineMapping[],
): LineParetoBar[] {
  const bars: LineParetoBar[] = DEFECT_LINE_NAMES.map((line) => {
    const namesForLine = mappings.filter((m) => m.line === line).map((m) => m.defectName);
    const breakdown: LineParetoBreakdownItem[] = [];
    let total = 0;
    for (const [type, count] of Object.entries(defectData)) {
      if (count <= 0) continue;
      if (namesForLine.some((name) => matchesDefectLine(type, name))) {
        breakdown.push({ type, count, percent: 0 });
        total += count;
      }
    }
    breakdown.sort((a, b) => b.count - a.count);
    for (const item of breakdown) {
      item.percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
    }
    return { line, total, percent: 0, breakdown };
  });

  const grandTotal = bars.reduce((sum, bar) => sum + bar.total, 0);
  for (const bar of bars) {
    bar.percent = grandTotal > 0 ? Math.round((bar.total / grandTotal) * 100) : 0;
  }
  return bars;
}

/**
 * Which fixed line(s) a single defect/repair name is suspect for, in the
 * fixed Melting/Moulding/Core Making/Finishing order (never mapping order).
 * Used by the Defect/Repair Details lists to hint "go check this line" next
 * to each row.
 */
export function suspectLinesFor(name: string, mappings: DefectLineMapping[]): DefectLineName[] {
  const matched = new Set(mappings.filter((m) => matchesDefectLine(name, m.defectName)).map((m) => m.line));
  return DEFECT_LINE_NAMES.filter((line) => matched.has(line));
}
