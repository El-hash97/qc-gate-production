// Temporarily makes every `@media print` rule in the document's stylesheets
// also apply on screen. html2canvas (used by the "Download PDF" flow, see
// ProductionDashboardView) only ever renders screen media — it has no notion
// of print media at all — so without this, a screenshot-based PDF export
// would look nothing like the already-correct, already-tested print
// stylesheet the browser's own "Export PDF" (window.print()) uses. Reusing
// that one stylesheet here means both exports stay visually identical with
// no separate, drifting copy of the print rules.
//
// Call with `true` right before capturing, `false` right after — leaving it
// on would also affect the real print dialog.
export function setPrintStylesActive(active: boolean): void {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet (e.g. a Google Fonts <link>) — not inspectable, nothing to do
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSMediaRule) || !rule.media.mediaText.includes('print')) continue;
      const hasScreen = rule.media.mediaText.includes('screen');
      if (active && !hasScreen) rule.media.appendMedium('screen');
      else if (!active && hasScreen) rule.media.deleteMedium('screen');
    }
  }
}
