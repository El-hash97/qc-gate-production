import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisualPanels } from '@/components/visual/VisualPanels';
import type { PanelData } from '@/utils/visualPanels';

const data: PanelData = {
  ok: 9, repair: 1, ng: 0, total: 10, target: 20, achievement: 50, remaining: 10, etaMin: null,
  oee: { av: 1, pe: 1, rq: 0.9, oee: 0.9 }, stopMin: { AV: 0, PE: 0, RQ: 0 },
  hourly: [{ hour: '07:00', produced: 10, plan: 72 }], currentHour: '07:00',
  topNg: [], topRepair: [{ label: 'Burry', count: 1 }], recent: [], lastStop: null,
};
const panels = () => document.querySelectorAll('section[data-panel]').length;

describe('VisualPanels', () => {
  beforeEach(() => localStorage.clear());

  it('shows every panel at first and hides / shows them all with H', () => {
    render(<VisualPanels data={data} running busy={[]} now={new Date()} onSelectStation={() => {}} />);
    expect(panels()).toBe(7);
    expect(screen.getByLabelText('KPI')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'h' });
    expect(panels()).toBe(0);
    fireEvent.keyDown(window, { key: 'h' });
    expect(panels()).toBe(7);
  });

  it('hides one panel and remembers it for this screen', () => {
    const { unmount } = render(<VisualPanels data={data} running busy={[]} now={new Date()} onSelectStation={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan Pareto' }));
    expect(panels()).toBe(6);
    unmount();
    render(<VisualPanels data={data} running busy={[]} now={new Date()} onSelectStation={() => {}} />);
    expect(screen.queryByLabelText('Pareto')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Panel/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan semua' }));
    expect(panels()).toBe(7);
  });

  it('opens a station from its workflow row', () => {
    const picked: string[] = [];
    render(<VisualPanels data={data} running busy={[false, true]} now={new Date()} onSelectStation={(id) => picked.push(id)} />);
    fireEvent.click(screen.getByRole('button', { name: /HSB05/ }));
    expect(picked).toEqual(['hsb05']);
  });
});
