import { describe, it, expect } from 'vitest';
import {
  FORK_BENCH_Y, FORK_CARRY_Y, FORK_STUB_Y, RETURN_S, createSim, step, stepReturn, type Sim,
} from '@/utils/finishingSim';
import {
  ANIM_FPS, FORKLIFT_HOME, JUNBIKI_SEGMENT, QC2_SEGMENT, REPAIR_DROP, SEGMENTS, TRUCK_CAPACITY,
  segmentSeconds, trackAt, type Counts,
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
    run(sim, MAIN_S + OK_S + TAKT_S * 3 + 90, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
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
    run(sim, MAIN_S + 90, { ok: 0, repair: 1, ng: 1 }, rand, (s) => {
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

describe('stepReturn (station equipment easing back to its start pose)', () => {
  it('stays put while the same block works the station', () => {
    const st = { last: 1 as number | null, w: 0 };
    expect(stepReturn(st, 1, 0.1).release).toBe(false);
    expect(st.w).toBe(0);
  });

  it('starts a full-weight return when the block leaves, even if the next one enters at once', () => {
    const st = { last: 1 as number | null, w: 0 };
    expect(stepReturn(st, 2, 0).release).toBe(true);
    expect(st.w).toBe(1);
    expect(stepReturn({ last: 1, w: 0 }, null, 0).release).toBe(true);
  });

  it('eases the held pose out over RETURN_S without overshooting', () => {
    const st = { last: 1 as number | null, w: 0 };
    stepReturn(st, null, 0);
    const half = stepReturn(st, null, RETURN_S / 2).weight;
    expect(half).toBeCloseTo(0.5, 5);
    expect(stepReturn(st, null, RETURN_S).weight).toBe(0);
    expect(stepReturn(st, 3, 0.1).weight).toBe(0);
  });
});

describe('forklift', () => {
  it('picks repair blocks at conveyor height, carries them ahead of it, repairs at the bench, brings them back', () => {
    const sim = createSim();
    const seen = { pickedAtStub: false, carriedAhead: false, benchAtDrop: false, unloadedHome: false, backToQc2: false };
    run(sim, MAIN_S + 90, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      const f = s.forklift;
      const onForks = s.blocks.filter((b) => b.phase === 'onForklift');
      if (f.state === 'toRepair' && onForks.length && !seen.pickedAtStub) {
        // the first frame it drives off, the forks are still at conveyor height
        seen.pickedAtStub = Math.abs(f.forkY - FORK_STUB_Y) < 0.05;
      }
      if (f.state === 'toRepair' && f.forkY === FORK_CARRY_Y && onForks.length) {
        for (const b of onForks) {
          const ahead = (b.pos[0] - f.pos[0]) * Math.cos(f.heading) - (b.pos[2] - f.pos[1]) * Math.sin(f.heading);
          expect(ahead).toBeGreaterThan(0.8);
          expect(b.pos[1]).toBeGreaterThan(f.forkY);
        }
        seen.carriedAhead = true;
      }
      if (f.state === 'repairing' && f.forkY === FORK_BENCH_Y) {
        seen.benchAtDrop = Math.hypot(f.pos[0] - REPAIR_DROP[0], f.pos[1] - REPAIR_DROP[1]) < 1e-6;
      }
      if (f.state === 'unloading') {
        seen.unloadedHome = Math.hypot(f.pos[0] - FORKLIFT_HOME[0], f.pos[1] - FORKLIFT_HOME[1]) < 1e-6;
      }
      if (s.blocks.some((b) => b.phase === 'toQc2')) seen.backToQc2 = true;
    });
    expect(seen).toEqual({ pickedAtStub: true, carriedAhead: true, benchAtDrop: true, unloadedHome: true, backToQc2: true });
  });

  it('turns to face where it drives (reversing keeps it facing the other way)', () => {
    const sim = createSim();
    let headingAtBench: number | null = null;
    run(sim, MAIN_S + 60, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      if (s.forklift.state === 'repairing' && headingAtBench === null) headingAtBench = s.forklift.heading;
    });
    // last leg drives east (+x) onto the bench: heading 0
    expect(headingAtBench).not.toBeNull();
    expect(Math.abs(Math.atan2(Math.sin(headingAtBench!), Math.cos(headingAtBench!)))).toBeLessThan(0.15);
  });
});
