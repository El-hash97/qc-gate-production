import { describe, it, expect } from 'vitest';
import {
  JUNBIKI_SEGMENT, QC2_SEGMENT, SEGMENTS, STATIONS, isRunning, pickOutcome, pickReinspect,
  routePoints, stationPos, trackAt,
} from '@/utils/finishingFlow';

describe('finishing line layout', () => {
  it('has unique station ids', () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chains the main station segments back to back up to QC Gate 2', () => {
    for (let k = 0; k < QC2_SEGMENT; k++) expect(SEGMENTS[k].to).toBe(SEGMENTS[k + 1].from);
    expect(SEGMENTS[JUNBIKI_SEGMENT].from).toBeGreaterThan(SEGMENTS[QC2_SEGMENT].to);
  });

  it('records the block at QC Gate 2 when the line segment ends', () => {
    const { pos } = trackAt(SEGMENTS[QC2_SEGMENT].to);
    const [qx, qz] = stationPos('qc2');
    expect(Math.hypot(pos[0] - qx, pos[2] - qz)).toBeLessThan(0.5);
  });

  it('interpolates between samples, clamps past the end, and keeps unit rotations', () => {
    const a = trackAt(399).pos; // samples sit on odd frames
    const mid = trackAt(400).pos;
    const c = trackAt(401).pos;
    expect(mid[2]).toBeCloseTo((a[2] + c[2]) / 2, 5);
    expect(trackAt(99999)).toEqual(trackAt(1660));
    expect(Math.hypot(...trackAt(733).quat)).toBeCloseTo(1, 5);
  });

  it('routes NG from QC Gate 2 to the red box', () => {
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
