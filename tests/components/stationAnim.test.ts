import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createStationAnim } from '@/components/visual/stationAnim';
import { RETURN_S } from '@/utils/finishingSim';

// A "hoist" that the recording moves from x=0 to x=10 over a 10 s segment.
function setup() {
  const hoist = new THREE.Object3D();
  hoist.name = 'hoist';
  const clip = new THREE.AnimationClip('hoist', 10, [
    new THREE.VectorKeyframeTrack('hoist.position', [0, 10], [0, 0, 0, 10, 0, 0]),
  ]);
  const mixer = new THREE.AnimationMixer(hoist);
  const station = createStationAnim(mixer, [clip], 0);
  return { hoist, mixer, station };
}

describe('station animation', () => {
  it('follows the block through the segment', () => {
    const { hoist, mixer, station } = setup();
    station.update(1, 4, 0.1);
    mixer.update(0.1);
    expect(hoist.position.x).toBeCloseTo(4, 5);
  });

  it('glides back to the start pose instead of snapping when the next block enters at once', () => {
    const { hoist, mixer, station } = setup();
    let maxStep = 0;
    let prev = 0;
    const tick = (busy: number | null, t: number) => {
      station.update(busy, t, 0.05);
      mixer.update(0.05);
      maxStep = Math.max(maxStep, Math.abs(hoist.position.x - prev));
      prev = hoist.position.x;
    };
    for (let t = 0; t <= 10; t += 0.05) tick(1, Math.min(t, 10));
    expect(hoist.position.x).toBeCloseTo(10, 1);
    maxStep = 0;
    // block 1 leaves, block 2 enters the same frame and starts its own pass
    let t2 = 0;
    for (; t2 < RETURN_S + 0.5; t2 += 0.05) tick(2, t2);
    expect(maxStep).toBeLessThan(1); // the old code jumped 10 in one frame
    // once eased out, the hoist is exactly where block 2's recording puts it
    expect(hoist.position.x).toBeCloseTo(t2 - 0.05, 3);
  });

  it('rests at the start pose once the station empties', () => {
    const { hoist, mixer, station } = setup();
    station.update(1, 10, 0.1);
    mixer.update(0.1);
    for (let i = 0; i < 40; i++) {
      station.update(null, 0, 0.1);
      mixer.update(0.1);
    }
    expect(hoist.position.x).toBeCloseTo(0, 5);
  });
});
