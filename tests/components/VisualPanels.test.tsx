import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisualPanels, usePanelModes } from '@/components/visual/VisualPanels';
import type { PanelData } from '@/utils/visualPanels';

const data: PanelData = {
  ok: 9, repair: 1, ng: 0, total: 10, target: 20, achievement: 50, remaining: 10, etaMin: null,
  oee: { av: 1, pe: 1, rq: 0.9, oee: 0.9 }, stopMin: { AV: 0, PE: 0, RQ: 0 },
  hourly: [{ hour: '07:00', produced: 10, plan: 72 }], currentHour: '07:00',
  topNg: [], topRepair: [{ label: 'Burry', count: 1 }], recent: [], lastStop: null,
};
type Props = Omit<Parameters<typeof VisualPanels>[0], 'panels'>;
function Panels({ readOnly, ...props }: Props & { readOnly?: boolean }) {
  return <VisualPanels {...props} panels={usePanelModes(readOnly)} />;
}
// one screen = its own query cache, all screens share the fake database below
function Screen(props: Props & { readOnly?: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}><Panels {...props} /></QueryClientProvider>;
}
const base = { data, running: true, busy: [], now: new Date(), onSelectStation: () => {} };
const panels = () => document.querySelectorAll('section[data-panel]').length;

// stands in for /api/display-settings/overview
let saved: { modes: Record<string, string> };
beforeEach(() => {
  saved = { modes: {} };
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') saved = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ success: true, data: saved }));
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('VisualPanels', () => {
  it('shows every panel at first and hides / shows them all with H, on this screen only', async () => {
    render(<Screen {...base} />);
    await waitFor(() => expect(panels()).toBe(8));
    expect(screen.getByLabelText('KPI')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'h' });
    expect(panels()).toBe(0);
    expect(saved.modes).toEqual({});
    fireEvent.keyDown(window, { key: 'h' });
    expect(panels()).toBe(8);
  });

  it('saves a hidden panel to the database, so every screen follows', async () => {
    const { unmount } = render(<Screen {...base} />);
    await waitFor(() => expect(panels()).toBe(8));
    fireEvent.click(screen.getByRole('button', { name: 'Hide NG Pareto' }));
    await waitFor(() => expect(panels()).toBe(7));
    await waitFor(() => expect(saved.modes).toEqual({ paretoNg: 'hidden' }));
    unmount();
    // another screen, a guest's
    render(<Screen {...base} readOnly />);
    await waitFor(() => expect(panels()).toBe(7));
    expect(screen.queryByLabelText('NG Pareto')).toBeNull();
  });

  it('turns all panels off and back on from the Panels switch', async () => {
    saved = { modes: { paretoNg: 'hidden' } };
    render(<Screen {...base} />);
    await waitFor(() => expect(panels()).toBe(7));
    fireEvent.click(screen.getByRole('button', { name: 'Display settings' }));
    const panelSwitch = screen.getByRole('switch', { name: 'Panels' });
    fireEvent.click(panelSwitch); // some still showing → all off
    await waitFor(() => expect(panels()).toBe(0));
    fireEvent.click(panelSwitch); // all back on, Pareto included
    await waitFor(() => expect(panels()).toBe(8));
  });

  it('has three switches: panels, 3D pins and station tags', async () => {
    render(<Screen {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Display settings' }));
    expect(screen.getAllByRole('switch').map((s) => s.closest('label')!.textContent)).toEqual(['Panels', '3D pins', 'Station tags']);
    fireEvent.click(screen.getByRole('switch', { name: 'Station tags' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Station tags' })).not.toBeChecked());
    await waitFor(() => expect(saved.modes).toEqual({ labels: 'hidden' }));
    expect(panels()).toBe(8);
  });

  it('opens a station from its workflow row', () => {
    const picked: string[] = [];
    render(<Screen {...base} busy={[false, true]} onSelectStation={(id) => picked.push(id)} />);
    fireEvent.click(screen.getByRole('button', { name: /HSB05/ }));
    expect(picked).toEqual(['hsb05']);
  });

  it('shows guests the shared layout, with no way to change it', async () => {
    saved = { modes: { paretoNg: 'hidden' } };
    render(<Screen {...base} readOnly />);
    await waitFor(() => expect(panels()).toBe(7));
    expect(screen.queryByRole('button', { name: 'Display settings' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Hide|Collapse)/ })).toBeNull();
    fireEvent.keyDown(window, { key: 'h' });
    expect(panels()).toBe(7);
  });
});
