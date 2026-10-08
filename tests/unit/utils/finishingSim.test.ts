import { describe, it, expect } from 'vitest';
import { createSim, step, type Sim } from '@/utils/finishingSim';
import { stationPos, TRUCK_CAPACITY, type Counts } from '@/utils/finishingFlow';

// Advance in 0.1 s ticks; `watch` sees the sim after every tick.
function run(sim: Sim, seconds: number, counts: Counts, rand: () => number, watch?: (s: Sim) => void) {
  for (let t = 0; t < seconds; t += 0.1) {
    step(sim, 0.1, counts, rand);
    watch?.(sim);
  }
}

// Exactly one block in flight: spawn it, then disable further spawns.
function single(): Sim {
  const sim = createSim();
  step(sim, 2, { ok: 1, repair: 0, ng: 0 }, () => 0.5);
  sim.spawnTimer = -1e9;
  return sim;
}

describe('finishing simulation', () => {
  it('spawns a raw block at Baritori every 2 s', () => {
    const sim = createSim();
    step(sim, 1.9, { ok: 1, repair: 0, ng: 0 });
    expect(sim.blocks).toHaveLength(0);
    step(sim, 0.1, { ok: 1, repair: 0, ng: 0 });
    expect(sim.blocks).toHaveLength(1);
    expect(sim.blocks[0].color).toBe('raw');
    expect(sim.blocks[0].path[0]).toEqual(stationPos('baritori'));
  });

  it('sends NG to the red box, piles it, then removes it', () => {
    const sim = single();
    let sawBinned = false;
    run(sim, 20, { ok: 0, repair: 0, ng: 1 }, () => 0, (s) => {
      if (s.blocks[0]?.phase === 'binned') {
        sawBinned = true;
        expect(s.blocks[0].color).toBe('ng');
      }
    });
    expect(sawBinned).toBe(true);
    expect(sim.blocks).toHaveLength(0);
  });

  it('takes a repair block by forklift to Line Repair and back, then onto the truck', () => {
    const sim = single();
    const forkStates = new Set<string>();
    run(sim, 40, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => forkStates.add(s.forklift.state));
    expect([...forkStates]).toEqual(expect.arrayContaining(['toRepair', 'repairing', 'toGate', 'idle']));
    expect(sim.blocks[0].phase).toBe('loaded');
    expect(sim.blocks[0].color).toBe('ok');
  });

  it('re-inspects a repaired block as NG and bins it', () => {
    const sim = single();
    // 1st draw at QC Gate 2: 0.75 → repair band for {ok:0, repair:1, ng:1}
    // 2nd draw at re-inspection: 0 → ng (ng / (ok + ng) = 1)
    const draws = [0.75, 0];
    let i = 0;
    const rand = () => draws[Math.min(i++, draws.length - 1)];
    let sawForklift = false;
    let sawBinnedAfter = false;
    run(sim, 40, { ok: 0, repair: 1, ng: 1 }, rand, (s) => {
      const b = s.blocks[0];
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
    run(sim, 90, { ok: 1, repair: 0, ng: 0 }, () => 0.5, (s) => {
      states.add(s.truck.state);
      maxLoaded = Math.max(maxLoaded, s.blocks.filter((b) => b.phase === 'loaded').length);
      maxBlocks = Math.max(maxBlocks, s.blocks.length);
    });
    expect([...states]).toEqual(expect.arrayContaining(['docked', 'leaving', 'returning']));
    expect(maxLoaded).toBe(TRUCK_CAPACITY);
    expect(maxBlocks).toBeLessThan(30);
  });
});
