import { describe, it, expect } from 'vitest';
import { pinReadouts } from '@/components/visual/stationPins';
import { createSim } from '@/utils/finishingSim';

describe('pinReadouts', () => {
  it('reads the live sim and the shift counts', () => {
    const sim = createSim();
    sim.segments[1].busy = 7;
    sim.truck.load = 6;
    const r = pinReadouts(sim, { ok: 90, repair: 4, ng: 6 }, true);
    expect(r.hsb05).toMatchObject({ value: '10.4 s', sub: 'Blasting', tone: 'ok' });
    expect(r.qc2).toMatchObject({ value: '6.0%', tone: 'bad' });
    expect(r.truck).toMatchObject({ value: '6 / 10', sub: 'Muat di Junbiki' });
    expect(r.forklift).toMatchObject({ value: 'Kosong', tone: 'idle' });
  });

  it('greys the machine out when production stops', () => {
    expect(pinReadouts(createSim(), { ok: 0, repair: 0, ng: 0 }, false).hsb05).toMatchObject({ sub: 'Stop', tone: 'idle' });
  });
});
