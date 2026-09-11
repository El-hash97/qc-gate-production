import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntryLogList } from '@/components/production/EntryLogList';
import type { EntryLog } from '@/lib/types';

describe('EntryLogList', () => {
  it('shows the product name for entries tagged with a line', () => {
    const logs: EntryLog[] = [
      { kind: 'defect', line: 1, group: 'bc', type: 'Gomi Cope', qty: 2, lot: 'L1', flask: 'F1' },
      { kind: 'repair', line: 3, group: 'shaft', type: 'Dakon', qty: 1, lot: 'L9', flask: 'F9' },
    ];
    const { container } = render(<EntryLogList title="Lot / Flask Log" logs={logs} />);

    expect(screen.getByText('BC 1TR')).toBeInTheDocument();
    expect(screen.getByText('Camshaft')).toBeInTheDocument();
    expect(container.textContent).toContain('Gomi Cope · Lot L1 / Flask F1');
    // shaft entries label the slot as Cavity, not Flask
    expect(container.textContent).toContain('Dakon · Lot L9 / Cavity F9');
  });

  it('still renders entries with no line (legacy) without a product label', () => {
    const logs: EntryLog[] = [
      { kind: 'defect', type: 'Crack', qty: 1, lot: 'L2', flask: 'F2' },
    ];
    const { container } = render(<EntryLogList title="Lot / Flask Log" logs={logs} />);

    expect(container.textContent).toContain('Crack · Lot L2 / Flask F2');
    expect(screen.queryByText('BC 1TR')).not.toBeInTheDocument();
  });

  it('appends the die number for Mejashi Bore repairs that have one', () => {
    const logs: EntryLog[] = [
      { kind: 'repair', line: 1, group: 'bc', type: 'Mejashi Bore 2', qty: 1, lot: 'L1', flask: 'F1', die: 3 },
    ];
    const { container } = render(<EntryLogList title="Lot / Flask Log" logs={logs} />);
    expect(container.textContent).toContain('Mejashi Bore 2 · Lot L1 / Flask F1 · Die 3');
  });

  it('omits the die suffix when an entry has none', () => {
    const logs: EntryLog[] = [
      { kind: 'repair', line: 1, group: 'bc', type: 'Dakon', qty: 1, lot: 'L1', flask: 'F1' },
    ];
    const { container } = render(<EntryLogList title="Lot / Flask Log" logs={logs} />);
    expect(container.textContent).toContain('Dakon · Lot L1 / Flask F1');
    expect(container.textContent).not.toContain('Die');
  });

  it('shows the empty state when there are no logs', () => {
    render(<EntryLogList title="Lot / Flask Log" logs={[]} />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  });
});
