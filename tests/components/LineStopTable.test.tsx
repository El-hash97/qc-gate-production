import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineStopTable } from '@/components/production/LineStopTable';
import type { LineStop } from '@/lib/types';

describe('LineStopTable', () => {
  it('shows the empty state with no stops', () => {
    render(<LineStopTable stops={[]} />);
    expect(screen.getByText('Belum ada line stop')).toBeInTheDocument();
  });

  it('renders one row per stop with waktu, durasi and category, and no total row', () => {
    const stops: LineStop[] = [
      { start: '08:00', end: '08:45', problem: 'Ganti tooling', category: 'AV' },
    ];
    const { container } = render(<LineStopTable stops={stops} />);

    expect(container.textContent).toContain('08:00–08:45');
    expect(container.textContent).toContain('45m');
    expect(screen.getByText('Ganti tooling')).toBeInTheDocument();
    expect(screen.getByText('AV')).toBeInTheDocument();
    expect(screen.queryByText('Total Line Stop')).not.toBeInTheDocument();
  });

  it('adds a Total Line Stop footer summing duration when more than one stop', () => {
    const stops: LineStop[] = [
      { start: '08:00', end: '08:30', problem: 'A', category: 'AV' },
      { start: '13:00', end: '14:15', problem: 'B', category: 'PE' },
    ];
    render(<LineStopTable stops={stops} />);

    expect(screen.getByText('Total Line Stop')).toBeInTheDocument();
    expect(screen.getByText('1j 45m')).toBeInTheDocument();
  });
});
