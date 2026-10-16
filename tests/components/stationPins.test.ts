import { describe, it, expect } from 'vitest';
import { PINS, pinReadouts } from '@/utils/stationPinData';
import { WORKFLOW_CARDS } from '@/utils/workflowCards';
import { createSim } from '@/utils/finishingSim';

describe('pinReadouts', () => {
  it('has a pin for every station on the workflow, plus the NG pallet and both vehicles', () => {
    const ids = PINS.map((p) => p.id);
    for (const card of WORKFLOW_CARDS) expect(ids).toContain(card.id);
    expect(ids).toEqual(expect.arrayContaining(['ngBox', 'forklift', 'truck']));
  });

  it('reads the live sim and the shift counts', () => {
    const sim = createSim();
    sim.segments[1].busy = 7;
    sim.truck.load = 6;
    const r = pinReadouts(sim, { ok: 90, repair: 4, ng: 6 }, true);
    expect(r.hsb05).toMatchObject({ value: '10.4 s', sub: 'Processing', tone: 'ok' });
    expect(r.hsb06).toMatchObject({ sub: 'Waiting for block', tone: 'idle' });
    expect(r.qc2).toMatchObject({ value: '6.0%', tone: 'bad' });
    expect(r.ngBox).toMatchObject({ value: '6', tone: 'bad' });
    expect(r.lineRepair).toMatchObject({ value: '4', sub: '4.0% repair' });
    expect(r.truck).toMatchObject({ value: '6 / 10', sub: 'Loading at Junbiki' });
    expect(r.forklift).toMatchObject({ value: 'Empty', tone: 'idle' });
  });

  it('shows Stop on every machine when production stops', () => {
    const r = pinReadouts(createSim(), { ok: 0, repair: 0, ng: 0 }, false);
    expect(r.baritori.sub).toBe('Stopped');
    expect(r.hanten.value).toBe('Stopped');
  });
});
