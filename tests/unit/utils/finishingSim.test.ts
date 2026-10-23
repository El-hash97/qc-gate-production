import { describe, it, expect } from 'vitest';
import {
  FORK_BENCH_Y, FORK_CARRY_Y, FORK_FLOOR_Y, FORK_PALLET_Y, RETURN_S, createSim, dispatchRepair, repairWaiting, step,
  stepReturn, type Sim,
} from '@/utils/finishingSim';
import {
  ANIM_FPS, FORKLIFT_HOME, FORKLIFT_TO_PALLET, HSB06_SEGMENT, JUNBIKI_SEGMENT, NG_PALLET_CAPACITY, NG_PALLET_TOP,
  QC2_SEGMENT, REPAIR_BATCH, REPAIR_DROP, REWORK_PALLET, SEGMENTS, TRUCK_CAPACITY,
  segmentSeconds, stationHold, trackAt, type Counts, type Hold,
} from '@/utils/finishingFlow';

const MAIN_S = SEGMENTS.slice(0, QC2_SEGMENT + 1).reduce((s, seg) => s + segmentSeconds(seg), 0);
const OK_S = segmentSeconds(SEGMENTS[JUNBIKI_SEGMENT]);
// slowest station paces the whole line
const TAKT_S = Math.max(...SEGMENTS.map(segmentSeconds));
// a full yellow pallet (9 repair blocks), the forklift round trip QC Gate 2 →
// Line Repair → stand by Grinding → home, plus the rework pass
const REWORK_S = 340;

// Advance in 0.1 s ticks; `watch` sees the sim after every tick.
function run(sim: Sim, seconds: number, counts: Counts, rand: () => number, watch?: (s: Sim) => void, hold: Hold | null = null) {
  for (let t = 0; t < seconds; t += 0.1) {
    step(sim, 0.1, counts, rand, hold);
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

  it('sends NG from QC Gate 2 to the NG pallet and stacks it there, square and in its own spot', () => {
    const sim = createSim();
    let most = 0;
    run(sim, MAIN_S + 400, { ok: 0, repair: 0, ng: 1 }, () => 0, (s) => {
      most = Math.max(most, s.blocks.filter((b) => b.phase === 'binned').length);
    });
    const onPallet = sim.blocks.filter((b) => b.phase === 'binned');
    expect(onPallet.length).toBeGreaterThan(1);
    // full pallet: the oldest makes room, never more than it holds
    expect(most).toBeLessThanOrEqual(NG_PALLET_CAPACITY);
    const spots = new Set(onPallet.map((b) => b.pos.join()));
    expect(spots.size).toBe(onPallet.length);
    for (const b of onPallet) {
      expect(b.pos[1]).toBeGreaterThan(NG_PALLET_TOP);
      expect(b.quat).toEqual([0, 0, 0, 1]);
    }
  });

  it('takes a repair block by forklift to Line Repair, back into the line at HSB06, then onto the truck green', () => {
    const sim = createSim();
    const forkStates = new Set<string>();
    const phases: string[] = [];
    const segs = new Set<number>();
    let colorAtJunbiki: string | null = null;
    run(sim, MAIN_S + OK_S + REWORK_S, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      forkStates.add(s.forklift.state);
      const b = s.blocks.find((x) => x.id === 1);
      if (!b) return;
      if (phases[phases.length - 1] !== b.phase) phases.push(b.phase);
      if (b.phase === 'seg' && phases.includes('onReworkPallet')) segs.add(b.seg);
      if (b.phase === 'seg' && b.seg === JUNBIKI_SEGMENT && colorAtJunbiki === null) colorAtJunbiki = b.color;
    });
    expect([...forkStates]).toEqual(expect.arrayContaining(['toRepair', 'repairing', 'toPallet', 'unloading', 'returning', 'idle']));
    // QC Gate 2 → stub → forklift → pallet by Grinding → HSB06 → (skip Grinding) Hanten … QC Gate 2
    expect(phases).toEqual(expect.arrayContaining(['atPallet', 'onForklift', 'onReworkPallet', 'toHsb06', 'toHanten']));
    expect(phases.indexOf('onReworkPallet')).toBeLessThan(phases.indexOf('toHsb06'));
    expect(phases.indexOf('toHsb06')).toBeLessThan(phases.indexOf('toHanten'));
    // after the rework it rides HSB06 and the Hanten → QC Gate 2 line, never Grinding
    expect(segs.has(HSB06_SEGMENT)).toBe(true);
    expect(segs.has(QC2_SEGMENT)).toBe(true);
    expect(segs.has(HSB06_SEGMENT + 1)).toBe(false);
    // orange until QC Gate 2 re-inspects it green (no NG in this shift)
    expect(colorAtJunbiki).toBe('ok');
  });

  it('re-inspects a repaired block as NG and bins it', () => {
    const sim = createSim();
    // 1st draw at QC Gate 2: 0.75 → repair band for {ok:0, repair:1, ng:1}
    // later draws (0): new blocks NG; the re-inspection back at QC Gate 2: ng (ng / (ok + ng) = 1)
    const draws = [0.75, 0];
    let i = 0;
    const rand = () => draws[Math.min(i++, draws.length - 1)];
    let sawForklift = false;
    let sawBinnedAfter = false;
    run(sim, MAIN_S + REWORK_S, { ok: 0, repair: 1, ng: 1 }, rand, (s) => {
      const b = s.blocks.find((x) => x.id === 1);
      // the only repair block: send the partial pallet by hand
      if (b?.phase === 'atPallet') dispatchRepair(s);
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
  it('picks repair blocks at conveyor height, carries them ahead of it, repairs at the bench, sets them on the pallet by Grinding', () => {
    const sim = createSim();
    const seen = {
      pickedOffFloor: false, carriedAhead: false, benchAtDrop: false, palletDrop: false,
      onPallet: false, northOfBaritori: false, backHome: false,
    };
    const lastLeg = FORKLIFT_TO_PALLET[FORKLIFT_TO_PALLET.length - 1].to;
    run(sim, MAIN_S + REWORK_S, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      const f = s.forklift;
      const onForks = s.blocks.filter((b) => b.phase === 'onForklift');
      if (f.state === 'toRepair' && onForks.length && !seen.pickedOffFloor) {
        // the first frame it drives off, the forks are still inside the pallet on the floor
        seen.pickedOffFloor = Math.abs(f.forkY - FORK_FLOOR_Y) < 0.05;
      }
      if (f.state === 'toRepair' && f.forkY === FORK_CARRY_Y && onForks.length) {
        for (const b of onForks) {
          const ahead = (b.pos[0] - f.pos[0]) * Math.cos(f.heading) - (b.pos[2] - f.pos[1]) * Math.sin(f.heading);
          // 3 x 3 on the pallet, which rides ahead of the forklift
          expect(ahead).toBeGreaterThan(0.5);
          expect(b.pos[1]).toBeGreaterThan(f.forkY);
        }
        seen.carriedAhead = true;
      }
      if (f.state === 'repairing' && f.forkY === FORK_BENCH_Y) {
        seen.benchAtDrop = Math.hypot(f.pos[0] - REPAIR_DROP[0], f.pos[1] - REPAIR_DROP[1]) < 1e-6;
      }
      // round the head of the line: north of Baritori's top edge (Blender y +19 → scene z -1.9)
      if (f.state === 'toPallet' && f.pos[1] < -1.9) seen.northOfBaritori = true;
      // forks lowered to the pallet top, over the pallet
      if (f.state === 'returning' && !seen.palletDrop && Math.abs(f.forkY - FORK_PALLET_Y) < 0.05) {
        seen.palletDrop = Math.hypot(f.pos[0] - lastLeg[0], f.pos[1] - lastLeg[1]) < 0.1;
      }
      for (const b of s.blocks.filter((x) => x.phase === 'onReworkPallet')) {
        expect(b.color).toBe('repair');
        if (Math.abs(b.pos[2] - REWORK_PALLET[1]) < 1e-6 && Math.abs(b.pos[0] - REWORK_PALLET[0]) < 1) seen.onPallet = true;
      }
      if (seen.palletDrop && f.state === 'idle') {
        seen.backHome = Math.hypot(f.pos[0] - FORKLIFT_HOME[0], f.pos[1] - FORKLIFT_HOME[1]) < 1e-6;
      }
    });
    expect(seen).toEqual({
      pickedOffFloor: true, carriedAhead: true, benchAtDrop: true, palletDrop: true,
      onPallet: true, northOfBaritori: true, backHome: true,
    });
  });

  it('turns to face where it drives (reversing keeps it facing the other way)', () => {
    const sim = createSim();
    let headingAtBench: number | null = null;
    run(sim, MAIN_S + REWORK_S, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      if (s.forklift.state === 'repairing' && headingAtBench === null) headingAtBench = s.forklift.heading;
    });
    // last leg drives east (+x) onto the bench: heading 0
    expect(headingAtBench).not.toBeNull();
    expect(Math.abs(Math.atan2(Math.sin(headingAtBench!), Math.cos(headingAtBench!)))).toBeLessThan(0.15);
  });
});

describe('yellow repair pallet', () => {
  it('waits for a full pallet of 9, never carries more, lays them out 3 x 3', () => {
    const sim = createSim();
    let maxWaiting = 0;
    let loadOut = -1;
    let spots = 0;
    run(sim, MAIN_S + REWORK_S, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      if (s.forklift.state === 'idle') maxWaiting = Math.max(maxWaiting, repairWaiting(s));
      if (s.forklift.state === 'toRepair' && loadOut < 0) {
        loadOut = s.forklift.load.length;
        const onForks = s.blocks.filter((b) => b.phase === 'onForklift');
        spots = new Set(onForks.map((b) => b.pos.map((v) => v.toFixed(3)).join())).size;
      }
    });
    expect(loadOut).toBe(REPAIR_BATCH);
    expect(spots).toBe(REPAIR_BATCH);
    expect(maxWaiting).toBeLessThanOrEqual(REPAIR_BATCH);
  });

  it('sends a partial pallet on the manual button', () => {
    const sim = createSim();
    // block 1 is the only repair; every later block NG
    const draws = [0.75];
    let i = 0;
    const rand = () => draws[i++] ?? 0;
    let loadOut = -1;
    run(sim, MAIN_S + 30, { ok: 0, repair: 1, ng: 1 }, rand, (s) => {
      if (repairWaiting(s) === 1 && s.blocks.find((b) => b.id === 1)?.phase === 'atPallet') dispatchRepair(s);
      if (s.forklift.state === 'toRepair' && loadOut < 0) loadOut = s.forklift.load.length;
    });
    expect(loadOut).toBe(1);
    expect(sim.dispatch).toBe(false);
  });

  it('feeds HSB06 one block at a time, taking turns with production', () => {
    const sim = createSim();
    const hsb05 = segmentSeconds(SEGMENTS[HSB06_SEGMENT - 1]);
    const entries: { rework: boolean; otherWaiting: boolean }[] = [];
    let last: number | null = null;
    run(sim, MAIN_S + REWORK_S + 120, { ok: 0, repair: 1, ng: 0 }, () => 0, (s) => {
      const busy = s.segments[HSB06_SEGMENT].busy;
      if (busy !== null && busy !== last) {
        const b = s.blocks.find((x) => x.id === busy)!;
        const reworkReady = s.blocks.some((x) => x.phase === 'onReworkPallet' && x.timer <= 0);
        const prodWaiting = s.blocks.some((x) => x.phase === 'seg' && x.seg === HSB06_SEGMENT - 1 && x.t >= hsb05);
        entries.push({ rework: b.rework, otherWaiting: b.rework ? prodWaiting : reworkReady });
      }
      last = busy;
    });
    const rework = entries.filter((e) => e.rework).length;
    expect(rework).toBeGreaterThan(1);
    expect(entries.length - rework).toBeGreaterThan(rework);
    // never the same stream twice in a row while the other one was waiting
    for (let k = 1; k < entries.length; k++) {
      if (entries[k].rework === entries[k - 1].rework) expect(entries[k].otherWaiting).toBe(false);
    }
  });
});

describe('line stop at a station', () => {
  const counts = { ok: 1, repair: 0, ng: 0 };
  const at = (id: Parameters<typeof stationHold>[0]) => {
    const h = stationHold(id);
    return h && 'seg' in h ? h : null;
  };

  it('places shared-segment stations in flow order along their segment', () => {
    expect(at('hsb05')).toEqual({ seg: 1, at: null });
    const line = (['hanten', 'final', 'qc1', 'qc2'] as const).map((id) => at(id)!);
    expect(line.every((h) => h.seg === QC2_SEGMENT)).toBe(true);
    const ts = line.map((h) => h.at!);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    expect(new Set(ts).size).toBe(4);
    expect(at('spray')!.at!).toBeLessThan(at('junbiki')!.at!);
    expect(stationHold('lineRepair')).toEqual({ repair: true });
  });

  it('freezes Baritori in place: nothing gets past it', () => {
    const sim = createSim();
    run(sim, MAIN_S * 2, counts, () => 0.5, undefined, stationHold('baritori'));
    expect(sim.blocks).toHaveLength(1);
    expect(sim.blocks[0].t).toBe(0);
  });

  it('holds the block at QC Gate 1 while stations after it wait, then resumes', () => {
    const sim = createSim();
    const hold = at('qc1')!;
    run(sim, MAIN_S * 3, counts, () => 0.5, undefined, hold);
    expect(sim.blocks.some((b) => b.phase !== 'seg' || b.seg > QC2_SEGMENT)).toBe(false);
    const held = sim.blocks.find((b) => b.phase === 'seg' && b.seg === QC2_SEGMENT)!;
    expect(held.t).toBeCloseTo(hold.at!, 5);
    expect(sim.segments[JUNBIKI_SEGMENT].busy).toBeNull();
    run(sim, MAIN_S, counts, () => 0.5);
    expect(sim.blocks.some((b) => b.phase !== 'seg' || b.seg === JUNBIKI_SEGMENT)).toBe(true);
  });
});
