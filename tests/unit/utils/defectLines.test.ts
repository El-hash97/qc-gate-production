import { describe, it, expect } from 'vitest';
import type { DefectLineMapping } from '@/lib/types';
import { matchesDefectLine, paretoByLine } from '@/utils/defectLines';

describe('matchesDefectLine', () => {
  it('matches case-insensitively', () => {
    expect(matchesDefectLine('KANDAMA FRONT', 'kandama')).toBe(true);
  });

  it('matches when the master name has no space but the real type does (the "Pinhole" case)', () => {
    expect(matchesDefectLine('Pin Hole Cope', 'Pinhole')).toBe(true);
  });

  it('matches bidirectionally — a longer master name against a shorter real type', () => {
    expect(matchesDefectLine('Kandama', 'Kandama Front')).toBe(true);
  });

  it('does not match unrelated names', () => {
    expect(matchesDefectLine('Crack', 'Kandama')).toBe(false);
  });
});

describe('paretoByLine', () => {
  it('always returns exactly 4 bars, in Melting/Moulding/Core Making/Finishing order', () => {
    const bars = paretoByLine({}, []);
    expect(bars.map((b) => b.line)).toEqual(['Melting', 'Moulding', 'Core Making', 'Finishing']);
  });

  it('counts a defect matching multiple lines in full for each line', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, line: 'Moulding', defectName: 'Gas Hole' },
    ];
    const bars = paretoByLine({ 'Gas Hole Cope': 10 }, mappings);
    const melting = bars.find((b) => b.line === 'Melting')!;
    const moulding = bars.find((b) => b.line === 'Moulding')!;
    expect(melting.total).toBe(10);
    expect(moulding.total).toBe(10);
  });

  it('computes each line percent as its share of the sum of all 4 line totals', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, line: 'Moulding', defectName: 'Gas Hole' },
    ];
    const bars = paretoByLine({ 'Gas Hole Cope': 10 }, mappings);
    const percents = Object.fromEntries(bars.map((b) => [b.line, b.percent]));
    expect(percents).toEqual({ Melting: 50, Moulding: 50, 'Core Making': 0, Finishing: 0 });
  });

  it('gives a zero-match line a 0 total and 0 percent, not an omitted bar', () => {
    const mappings: DefectLineMapping[] = [{ id: 1, line: 'Melting', defectName: 'Kandama' }];
    const bars = paretoByLine({ 'Kandama Front': 5 }, mappings);
    const finishing = bars.find((b) => b.line === 'Finishing')!;
    expect(finishing.total).toBe(0);
    expect(finishing.percent).toBe(0);
    expect(finishing.breakdown).toEqual([]);
  });

  it('is all zeros when there are no mappings at all', () => {
    const bars = paretoByLine({ 'Kandama Front': 5 }, []);
    expect(bars.every((b) => b.total === 0 && b.percent === 0)).toBe(true);
  });

  it('breaks a line total down by contributing defect type, sorted by count descending, with its own percent of that line', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, line: 'Melting', defectName: 'Kandama' },
      { id: 2, line: 'Melting', defectName: 'Gas Hole' },
    ];
    const bars = paretoByLine({ 'Kandama Front': 10, 'Gas Hole Cope': 30 }, mappings);
    const melting = bars.find((b) => b.line === 'Melting')!;
    expect(melting.total).toBe(40);
    expect(melting.breakdown).toEqual([
      { type: 'Gas Hole Cope', count: 30, percent: 75 },
      { type: 'Kandama Front', count: 10, percent: 25 },
    ]);
  });

  it('ignores a defectData entry with a zero or negative count', () => {
    const mappings: DefectLineMapping[] = [{ id: 1, line: 'Melting', defectName: 'Kandama' }];
    const bars = paretoByLine({ 'Kandama Front': 0 }, mappings);
    const melting = bars.find((b) => b.line === 'Melting')!;
    expect(melting.total).toBe(0);
    expect(melting.breakdown).toEqual([]);
  });
});
