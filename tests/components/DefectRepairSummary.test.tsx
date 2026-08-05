import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefectRepairSummary } from '@/components/production/DefectRepairSummary';

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
});
