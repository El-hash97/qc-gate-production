import { describe, it, expect } from 'vitest';
import { canonicalType, mergeTypeVariants, typeKey } from '@/utils/typeName';

describe('typeKey', () => {
  it('ignores case and extra spaces', () => {
    expect(typeKey('  Yuzakai   cope ')).toBe(typeKey('Yuzakai Cope'));
  });
});

describe('canonicalType', () => {
  it('reuses an existing spelling that differs only in case/spacing', () => {
    expect(canonicalType('yuzakai  cope', ['Gomi Drag', 'Yuzakai Cope'])).toBe('Yuzakai Cope');
  });

  it('keeps a genuinely new name, tidied', () => {
    expect(canonicalType('  Dross  cope ', ['Gomi Drag'])).toBe('Dross cope');
  });

  it('does not merge different types that only share a prefix', () => {
    expect(canonicalType('Yuzakai Cope', ['Yuzakai'])).toBe('Yuzakai Cope');
  });
});

describe('mergeTypeVariants', () => {
  it('sums case variants under the spelling with the most pcs', () => {
    expect(mergeTypeVariants({ 'Yuzakai Cope': 8, 'Yuzakai cope': 31, Yuzakai: 7 })).toEqual({
      'Yuzakai cope': 39,
      Yuzakai: 7,
    });
  });
});
