import { describe, it, expect } from 'vitest';
import type { EntryLog } from '@/lib/types';
import { entryDie, takenFlasks } from '@/utils/flask';

const log = (over: Partial<EntryLog>): EntryLog => ({
  kind: 'defect', group: 'bc', line: 1, type: 'Gas Hole Cope', qty: 1, lot: 'L1', flask: '2', ...over,
});

describe('takenFlasks', () => {
  it('returns the flasks already logged under that lot', () => {
    const logs = [log({ flask: '2' }), log({ flask: '4' }), log({ lot: 'L2', flask: '1' })];
    expect(takenFlasks(logs, 'L1', 1)).toEqual(['2', '4']);
  });

  it('counts NG and Repair entries alike', () => {
    const logs = [log({ kind: 'defect', flask: '1' }), log({ kind: 'repair', flask: '3' })];
    expect(takenFlasks(logs, 'L1', 1)).toEqual(['1', '3']);
  });

  it('only counts the same product: BC 1TR and BC 2TR are separate', () => {
    const logs = [log({ line: 1, flask: '1' }), log({ line: 2, flask: '2' })];
    expect(takenFlasks(logs, 'L1', 1)).toEqual(['1']);
    expect(takenFlasks(logs, 'L1', 2)).toEqual(['2']);
  });

  it('matches the lot ignoring surrounding spaces and letter case', () => {
    expect(takenFlasks([log({ lot: 'lot-7a', flask: '2' })], '  LOT-7A ', 1)).toEqual(['2']);
  });

  it('returns nothing for an empty lot', () => {
    expect(takenFlasks([log({ lot: '', flask: '2' })], '   ', 1)).toEqual([]);
  });

  it('lists each flask once', () => {
    expect(takenFlasks([log({ flask: '2' }), log({ flask: '2' })], 'L1', 1)).toEqual(['2']);
  });
});

describe('entryDie', () => {
  it('derives the Camshaft die from the cavity: 1-4 is Die 1, 5-8 is Die 2', () => {
    expect(entryDie(3, '1-3')).toBe(1);
    expect(entryDie(3, '2-4')).toBe(1);
    expect(entryDie(3, '1-5')).toBe(2);
    expect(entryDie(3, '2-8')).toBe(2);
  });

  it('gives no die for a Camshaft value that is not a picked cavity', () => {
    expect(entryDie(3, '')).toBeUndefined();
    expect(entryDie(3, '1-6,1-7')).toBeUndefined();
  });

  it('passes the given die through for other products', () => {
    expect(entryDie(1, '3', 2)).toBe(2);
    expect(entryDie(4, '1,5')).toBeUndefined();
  });
});
