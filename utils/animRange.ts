// Keyframe tracks as three.js stores them: flat values, `size` per key.
export interface KeyTrack {
  times: ArrayLike<number>;
  values: ArrayLike<number>;
  size: number;
}

// The time span [start, end] in which any track actually changes value, or
// null if nothing moves. Used to loop an operator's own motion instead of the
// whole Blender timeline (which holds the pose for most of its length).
export function activeRange(tracks: KeyTrack[], eps = 1e-4): [number, number] | null {
  let start = Infinity;
  let end = -Infinity;
  for (const { times, values, size } of tracks) {
    for (let i = 1; i < times.length; i++) {
      for (let k = 0; k < size; k++) {
        if (Math.abs(values[i * size + k] - values[(i - 1) * size + k]) > eps) {
          start = Math.min(start, times[i - 1]);
          end = Math.max(end, times[i]);
          break;
        }
      }
    }
  }
  return start < end ? [start, end] : null;
}
