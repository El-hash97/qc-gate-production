import * as THREE from 'three';
import { stepReturn, type ReturnState } from '@/utils/finishingSim';

// Station clip, optionally time-remapped: `map` converts seconds-into-segment
// to the absolute track position to sample (used to replay a clip whose
// recorded motion lies outside the segment's own frames — the operator at a
// series line then moves while the block is there, as in the recording).
export type StationClip = THREE.AnimationClip | { clip: THREE.AnimationClip; map: (t: number) => number };

const clipOf = (c: StationClip) => (typeof c === 'object' && 'clip' in c ? c.clip : c);

// Drives one station's clips (operator rig, hoist, gripper...) from the
// simulation: they follow the block's progress through the segment, and when
// the block leaves, a frozen copy of their end pose fades out so they glide
// back to the start pose instead of snapping — alongside the next block, so
// the station's rhythm is unchanged.
export function createStationAnim(mixer: THREE.AnimationMixer, clips: readonly StationClip[], baseTime: number) {
  const pairs = clips.map((c0) => {
    const clip = clipOf(c0);
    const map = (c0 as { clip?: THREE.AnimationClip; map?: (t: number) => number }).map;
    const live = mixer.clipAction(clip);
    const ghost = mixer.clipAction(clip.clone());
    for (const a of [live, ghost]) {
      a.play();
      a.paused = true;
      a.time = baseTime;
    }
    ghost.setEffectiveWeight(0);
    return { live, ghost, map };
  });
  const ret: ReturnState = { last: null, w: 0 };

  return {
    // busy = id of the block in the station (null when empty), t = its
    // seconds into the segment
    update(busy: number | null, t: number, dt: number) {
      const { release, weight } = stepReturn(ret, busy, dt);
      for (const { live, ghost, map } of pairs) {
        if (release) ghost.time = live.time;
        const base = baseTime + (busy === null ? 0 : t);
        live.time = map ? map(busy === null ? 0 : t) : base;
        live.setEffectiveWeight(1 - weight);
        ghost.setEffectiveWeight(weight);
      }
    },
  };
}
