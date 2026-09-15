// Filename for a downloaded shift report PDF (see ProductionDashboardView's
// "Download PDF", used from History). `state.date` is a free-text, locale
// string (e.g. "5 Agustus 2026", not necessarily ISO), so this sanitises by
// stripping punctuation/whitespace rather than trying to parse it as a date.
export function pdfFileName(state: { shift: string; date: string }): string {
  const shiftPart = state.shift.trim().replace(/\s+/g, '_');
  const datePart = state.date.trim()
    ? state.date.trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')
    : 'tanpa_tanggal';
  return `QC_Gate_${shiftPart}_${datePart}.pdf`;
}
