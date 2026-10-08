import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';
import type { DefectLineMapping } from '@/lib/types';

describe('DefectRepairSummary', () => {
  it('sorts entries by count descending', () => {
    render(<DefectRepairSummary title="Defect Details" data={{ 'Gomi Drag': 1, Kake: 5 }} />);
    const items = screen.getAllByText(/Gomi Drag|Kake/);
    expect(items[0]).toHaveTextContent('Kake');
  });

  it('shows an empty-state message when there is no data', () => {
    render(<DefectRepairSummary title="Defect Details" data={{}} />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  });

  it('shows no line hint when mappings are omitted', () => {
    render(<DefectRepairSummary title="Defect Details" data={{ Kake: 5 }} />);
    expect(screen.queryByText(/Melting|Moulding|Core Making|Finishing/)).not.toBeInTheDocument();
  });

  it('shows the suspect line next to a matching entry', () => {
    const mappings: DefectLineMapping[] = [{ id: 1, product: 'bc', line: 'Melting', defectName: 'Kandama' }];
    render(<DefectRepairSummary title="Defect Details" data={{ 'Kandama Front': 5 }} mappings={mappings} />);
    expect(screen.getByText('Melting')).toBeInTheDocument();
  });

  it('shows every suspect line for an entry that matches more than one', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, product: 'bc', line: 'Melting', defectName: 'Gas Hole' },
      { id: 2, product: 'bc', line: 'Moulding', defectName: 'Gas Hole' },
    ];
    render(<DefectRepairSummary title="Defect Details" data={{ 'Gas Hole Cope': 5 }} mappings={mappings} />);
    expect(screen.getByText('Melting, Moulding')).toBeInTheDocument();
  });

  it('limits hints to the given product', () => {
    const mappings: DefectLineMapping[] = [
      { id: 1, product: 'bc', line: 'Melting', defectName: 'Kandama' },
      { id: 2, product: 'camshaft', line: 'Finishing', defectName: 'Kandama' },
    ];
    render(
      <DefectRepairSummary title="Defect Details" data={{ 'Kandama Front': 5 }} mappings={mappings} product="camshaft" />,
    );
    expect(screen.getByText('Finishing')).toBeInTheDocument();
    expect(screen.queryByText('Melting')).not.toBeInTheDocument();
  });
});
