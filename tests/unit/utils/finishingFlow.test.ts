import { describe, it, expect } from 'vitest';
import {
  STATIONS, stationPos, routePoints, isRunning, pickOutcome, pickReinspect,
} from '@/utils/finishingFlow';

describe('finishing line layout', () => {
  it('has unique station ids', () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('passes every station in process order and splits at QC Gate 2', () => {
    const main = routePoints('main');
    expect(main.at(-1)).toEqual(stationPos('qc2'));
    // each station lies on the route, in this order
    const order = ['hsb05', 'hsb06', 'grinding', 'hanten', 'final', 'qc1', 'qc2'] as const;
    const nearest = (id: (typeof order)[number]) => {
      const [sx, sz] = stationPos(id);
      let best = 0;
      main.forEach(([x, z], i) => {
        if (Math.hypot(x - sx, z - sz) < Math.hypot(main[best][0] - sx, main[best][1] - sz)) best = i;
      });
      expect(Math.hypot(main[best][0] - sx, main[best][1] - sz)).toBeLessThan(1.2);
      return best;
    };
    const idx = order.map(nearest);
    expect(idx).toEqual([...idx].sort((p, q) => p - q));
    expect(routePoints('ok')[0]).toEqual(stationPos('qc2'));
    expect(routePoints('ng')).toEqual([stationPos('qc2'), stationPos('ngBox')]);
  });
});

describe('isRunning', () => {
  it('is false right after a reset (all zero)', () => {
    expect(isRunning({ ok: 0, repair: 0, ng: 0 })).toBe(false);
  });
  it('is true once anything is counted', () => {
    expect(isRunning({ ok: 0, repair: 1, ng: 0 })).toBe(true);
  });
});

describe('pickOutcome', () => {
  const c = { ok: 80, repair: 15, ng: 5 };
  it('splits r proportionally: ng band, then repair, then ok', () => {
    expect(pickOutcome(c, 0)).toBe('ng');
    expect(pickOutcome(c, 0.049)).toBe('ng');
    expect(pickOutcome(c, 0.05)).toBe('repair');
    expect(pickOutcome(c, 0.199)).toBe('repair');
    expect(pickOutcome(c, 0.2)).toBe('ok');
    expect(pickOutcome(c, 0.999)).toBe('ok');
  });
  it('defaults to ok with no counts', () => {
    expect(pickOutcome({ ok: 0, repair: 0, ng: 0 }, 0)).toBe('ok');
  });
});

describe('pickReinspect', () => {
  it('fails at ng / (ok + ng)', () => {
    const c = { ok: 90, repair: 50, ng: 10 };
    expect(pickReinspect(c, 0.099)).toBe('ng');
    expect(pickReinspect(c, 0.1)).toBe('ok');
  });
  it('passes as ok when only repairs exist (no divide by zero)', () => {
    expect(pickReinspect({ ok: 0, repair: 3, ng: 0 }, 0)).toBe('ok');
  });
});
