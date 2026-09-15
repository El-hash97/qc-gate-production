import { describe, it, expect, afterEach } from 'vitest';
import { setPrintStylesActive } from '@/utils/printCapture';

function addStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

describe('setPrintStylesActive', () => {
  afterEach(() => {
    document.querySelectorAll('style[data-test-print-capture]').forEach((el) => el.remove());
  });

  // jsdom's getComputedStyle doesn't reliably recompute the cascade from a
  // mutated MediaList, so these assert on the CSSOM state setPrintStylesActive
  // actually changes (the media query itself) rather than on computed style.
  it('makes an @media print rule also apply on screen when activated', () => {
    const style = addStyle('@media print { .probe { color: rgb(1, 2, 3); } }');
    style.setAttribute('data-test-print-capture', '');
    const rule = Array.from(style.sheet!.cssRules)[0] as CSSMediaRule;

    expect(rule.media.mediaText).toBe('print');
    setPrintStylesActive(true);
    expect(rule.media.mediaText).toBe('print, screen');
  });

  it('reverts the rule back to print-only when deactivated', () => {
    const style = addStyle('@media print { .probe2 { color: rgb(4, 5, 6); } }');
    style.setAttribute('data-test-print-capture', '');
    const rule = Array.from(style.sheet!.cssRules)[0] as CSSMediaRule;

    setPrintStylesActive(true);
    setPrintStylesActive(false);
    expect(rule.media.mediaText).toBe('print');
  });

  it('is a no-op for a media rule that is not print (leaves it untouched)', () => {
    const style = addStyle('@media screen { .probe3 { color: rgb(7, 8, 9); } }');
    style.setAttribute('data-test-print-capture', '');
    const rule = Array.from(style.sheet!.cssRules)[0] as CSSMediaRule;
    setPrintStylesActive(true);
    expect(rule.media.mediaText).toBe('screen');
  });

  it('does not throw when a stylesheet cannot be inspected (e.g. cross-origin)', () => {
    const fakeSheet = {
      get cssRules(): CSSRuleList { throw new DOMException('cross-origin', 'SecurityError'); },
    };
    const original = Object.getOwnPropertyDescriptor(document, 'styleSheets');
    Object.defineProperty(document, 'styleSheets', { value: [fakeSheet], configurable: true });
    try {
      expect(() => setPrintStylesActive(true)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(document, 'styleSheets', original);
    }
  });
});
