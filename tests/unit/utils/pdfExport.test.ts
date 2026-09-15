import { describe, it, expect } from 'vitest';
import { pdfFileName } from '@/utils/pdfExport';

describe('pdfFileName', () => {
  it('joins the shift and date into a safe filename', () => {
    expect(pdfFileName({ shift: 'Shift Red', date: '5 Agustus 2026' })).toBe('QC_Gate_Shift_Red_5_Agustus_2026.pdf');
  });

  it('collapses punctuation in the date to single underscores', () => {
    expect(pdfFileName({ shift: 'Shift White', date: '2026-08-05' })).toBe('QC_Gate_Shift_White_2026_08_05.pdf');
  });

  it('falls back to a placeholder when the record has no date', () => {
    expect(pdfFileName({ shift: 'Shift Red', date: '' })).toBe('QC_Gate_Shift_Red_tanpa_tanggal.pdf');
  });
});
