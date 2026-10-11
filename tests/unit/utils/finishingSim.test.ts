import { describe, it, expect } from 'vitest';
import { createSim, step, type Sim } from '@/utils/finishingSim';
import {
  ANIM_FPS, JUNBIKI_SEGMENT, QC2_SEGMENT, SEGMENTS, TRUCK_CAPACITY, segmentSeconds, trackAt,
  type Counts,
} from '@/utils/finishingFlow';

const MAIN_S = SEGMENTS.slice(0, QC2_SEGMENT + 1).reduce((s, seg) => s + segmentSeconds(seg), 0);
const OK_S = segmentSeconds(SEGMENTS[JUNBIKI_SEGMENT]);
// slowest station paces the whole line
const TAKT_S = Math.max(...SEGMENTS.map(segmentSeconds));

// Advance in 0.1 s ticks; `watch` sees the sim after every tick.
function run(sim: Sim, seconds: number, counts: Counts, rand: () => number, watch?: (s: Sim) => void) {
  for (let t = 0; t < seconds; t += 0.1) {
    step(sim, 0.1, counts, rand);
    watch?.(sim);
  }
}

describe('finishing simulation', () => {
  it('releases a new block only when Baritori is free', () => {
    const sim = createSim();
    step(sim, 0.1, { ok: 1, repair: 0, ng: 0 });
    expect(sim.blocks).toHaveLength(1);
    run(sim, segmentSeconds(SEGMENTS[0]) - 1, { ok: 1, repair: 0, ng: 0 }, () => 0.5);
    expect(sim.blocks).toHaveLength(1);
    run(sim, 1.5, { ok: 1, repair: 0, ng: 0 }, () => 0.5);
    expect(sim.blocks).toHaveLength(2);
  });

  it('never puts two blocks in one station segment', () => {
    const sim = createSim();
    run(sim, MAIN_S * 4, { ok: 1, repair: 0, ng: 0 }, () => 0.5, (s) => {
      const inSeg = s.blocks.filter((b) => b.phase === 'seg').map((b) => b.seg);
      expect(new Set(inSeg).size).toBe(inSeg.length);
      s.segments.forEach((seg, k) => {
        if (seg.busy !== null) expect(s.blocks.find((b) => b.id === seg.busy)?.seg).toBe(k);
      });
    });
  });

  it('rides the recorded Blender path inside a segment', () => {
    const sim = createSim();
    run(sim, 20, { ok: 1, repair: 0, ng: 0 }, () => 0.5);
    for (const b of sim.blocks.filter((x) => x.phase === 'seg')) {
      const frame = SEGMENTS[b.seg].from + Math.min(b.t, segmentSeconds(SEGMENTS[b.seg])) * ANIM_FPS;
      expect(b.pos).toEqual(trackAt(frame).pos);
      expect(b.quat).toEqual(trackAt(frame).quat);
    }
  });

  it('sends NG from QC Gate 2 to the red box, piles it, then removes it', () => {
    const sim = createSim();
    let binned = 0;
    run(sim, MAIN_S + 10, { ok: 0, repair: 0, ng: 1 }, () => 0, (s) => {
      binned = Math.max(binned, s.blocks.filter((b) => b.phase === 'binned').length);
    });
    expect(binned).toBeGreaterThan(0);
    run(sim, 20, { ok: 0, repair: 0, ng: 1 }, () => 0);
    expect(sim.blocks.every((b) => b.color !== 'ng' || b.phase !== 'binned' || b.timer > 0)).toBe(true);
  });

  it('takes a repair block by forklift to Line Repair and back, then onto the truck', () => {
    const sim = createSim();
    const forkStates = new Set<string>();
    let first = -1;
    run(sim, MAIN_S + OK_S + TAKT_S * 3 + 30, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      forkStates.add(s.forklift.state);
      if (first < 0 && s.blocks.length) first = s.blocks[0].id;
    });
    expect([...forkStates]).toEqual(expect.arrayContaining(['toRepair', 'repairing', 'toGate', 'idle']));
    const b = sim.blocks.find((x) => x.id === first);
    expect(b?.phase).toBe('loaded');
    expect(b?.color).toBe('ok');
  });

  it('re-inspects a repaired block as NG and bins it', () => {
    const sim = createSim();
    // 1st draw at QC Gate 2: 0.75 → repair band for {ok:0, repair:1, ng:1}
    // 2nd draw at re-inspection: 0 → ng (ng / (ok + ng) = 1); later draws repair again
    const draws = [0.75, 0];
    let i = 0;
    const rand = () => draws[Math.min(i++, draws.length - 1)];
    let sawForklift = false;
    let sawBinnedAfter = false;
    run(sim, MAIN_S + 40, { ok: 0, repair: 1, ng: 1 }, rand, (s) => {
      const b = s.blocks.find((x) => x.id === 1);
      if (b?.phase === 'onForklift') sawForklift = true;
      if (sawForklift && b?.phase === 'binned') sawBinnedAfter = true;
    });
    expect(sawForklift).toBe(true);
    expect(sawBinnedAfter).toBe(true);
  });

  it('ships the truck at capacity, never overloads it, keeps blocks bounded', () => {
    const sim = createSim();
    const states = new Set<string>();
    let maxLoaded = 0;
    let maxBlocks = 0;
    run(sim, MAIN_S + OK_S + TAKT_S * TRUCK_CAPACITY * 2, { ok: 1, repair: 0, ng: 0 }, () => 0.5, (s) => {
      states.add(s.truck.state);
      maxLoaded = Math.max(maxLoaded, s.blocks.filter((b) => b.phase === 'loaded').length);
      maxBlocks = Math.max(maxBlocks, s.blocks.length);
    });
    expect([...states]).toEqual(expect.arrayContaining(['docked', 'leaving', 'returning']));
    expect(maxLoaded).toBe(TRUCK_CAPACITY);
    // one per station + one truckload + a short Junbiki queue
    expect(maxBlocks).toBeLessThan(SEGMENTS.length + TRUCK_CAPACITY + 4);
  });
});
