import * as THREE from 'three';
import { stepReturn, type ReturnState } from '@/utils/finishingSim';

// Drives one station's clips (operator rig, hoist, gripper...) from the
// simulation: they follow the block's progress through the segment, and when
// the block leaves, a frozen copy of their end pose fades out so they glide
// back to the start pose instead of snapping — alongside the next block, so
// the station's rhythm is unchanged.
export function createStationAnim(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[], baseTime: number) {
  const pairs = clips.map((clip) => {
    const live = mixer.clipAction(clip);
    const ghost = mixer.clipAction(clip.clone());
    for (const a of [live, ghost]) {
      a.play();
      a.paused = true;
      a.time = baseTime;
    }
    ghost.setEffectiveWeight(0);
    return { live, ghost };
  });
  const ret: ReturnState = { last: null, w: 0 };

  return {
    // busy = id of the block in the station (null when empty), t = its
    // seconds into the segment
    update(busy: number | null, t: number, dt: number) {
      const { release, weight } = stepReturn(ret, busy, dt);
      for (const { live, ghost } of pairs) {
        if (release) ghost.time = live.time;
        live.time = baseTime + (busy === null ? 0 : t);
        live.setEffectiveWeight(1 - weight);
        ghost.setEffectiveWeight(weight);
      }
    },
  };
}
