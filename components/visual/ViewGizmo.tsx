'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Blender-style navigation gizmo: the X / Y / Z axes as the camera sees them,
// turning with it; click a ball to fly to that view. Blender's axes on the
// scene's: X = east (+x), Y = north (-z), Z = up (+y). No -Z ball: the camera
// never goes under the floor.
export type ViewAxis = 'x' | '-x' | 'y' | '-y' | 'z' | 'home';

const AXES = [
  { id: 'x', label: 'X', v: [1, 0, 0], color: '#e5484d' },
  { id: 'y', label: 'Y', v: [0, 0, -1], color: '#46a758' },
  { id: 'z', label: 'Z', v: [0, 1, 0], color: '#3e63dd' },
  { id: '-x', label: '', v: [-1, 0, 0], color: '#e5484d' },
  { id: '-y', label: '', v: [0, 0, 1], color: '#46a758' },
] as const;

const SIZE = 96;
const R = 34;

// Where the camera goes for a view. Side views look in from 60° off vertical
// (not level) so the line still shows over the walls.
export function viewPose(
  axis: ViewAxis, center: THREE.Vector3, home: { target: THREE.Vector3; pos: THREE.Vector3 },
): { target: THREE.Vector3; pos: THREE.Vector3 } {
  if (axis === 'home') return { target: home.target.clone(), pos: home.pos.clone() };
  // straight down; the hair of +z keeps north (Blender's +Y) up on screen
  if (axis === 'z') return { target: center.clone(), pos: center.clone().add(new THREE.Vector3(0, 62, 0.5)) };
  const a = AXES.find((x) => x.id === axis)!;
  const tilt = (60 * Math.PI) / 180;
  const dist = 42;
  const side = new THREE.Vector3(...a.v).multiplyScalar(Math.sin(tilt) * dist);
  return { target: center.clone(), pos: center.clone().add(side).setY(center.y + Math.cos(tilt) * dist) };
}

const name = (id: string) => `View from ${id.startsWith('-') ? '−' : '+'}${id.replace('-', '').toUpperCase()}`;

export function ViewGizmo({ onPick, bind }: {
  onPick: (axis: ViewAxis) => void;
  // hands the render loop a function to call each frame with the camera's rotation
  bind: (update: ((q: THREE.Quaternion) => void) | null) => void;
}) {
  const balls = useRef<(HTMLButtonElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const inv = new THREE.Quaternion();
    const v = new THREE.Vector3();
    bind((q) => {
      inv.copy(q).invert();
      AXES.forEach((a, i) => {
        v.set(a.v[0], a.v[1], a.v[2]).applyQuaternion(inv);
        const x = v.x * R;
        const y = -v.y * R;
        const ball = balls.current[i];
        if (ball) {
          ball.style.transform = `translate(${x}px, ${y}px)`;
          // nearer balls on top, like Blender
          ball.style.zIndex = String(Math.round(10 + v.z * 5));
        }
        const line = lines.current[i];
        if (line) {
          line.setAttribute('x2', String(SIZE / 2 + x));
          line.setAttribute('y2', String(SIZE / 2 + y));
        }
      });
    });
    return () => bind(null);
  }, [bind]);

  return (
    <div style={{
      position: 'absolute', left: 'var(--view-left, 16px)', bottom: 'var(--view-bottom, 16px)', zIndex: 4,
      display: 'flex', alignItems: 'flex-end', gap: 6,
    }}>
      <div role="group" aria-label="Camera view" style={{
        position: 'relative', width: SIZE, height: SIZE, borderRadius: '50%',
        background: 'color-mix(in srgb, var(--bg-card) 35%, transparent)',
        border: '1px solid color-mix(in srgb, var(--text-primary) 14%, transparent)',
        backdropFilter: 'blur(4px)',
      }}>
        <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {AXES.map((a, i) => a.label && (
            <line key={a.id} ref={(el) => { lines.current[i] = el; }}
              x1={SIZE / 2} y1={SIZE / 2} x2={SIZE / 2} y2={SIZE / 2} stroke={a.color} strokeWidth={2} />
          ))}
        </svg>
        {AXES.map((a, i) => {
          const d = a.label ? 22 : 14;
          return (
            <button key={a.id} type="button" ref={(el) => { balls.current[i] = el; }}
              aria-label={name(a.id)} title={name(a.id)} onClick={() => onPick(a.id)}
              style={{
                position: 'absolute', left: SIZE / 2 - d / 2, top: SIZE / 2 - d / 2, width: d, height: d,
                padding: 0, borderRadius: '50%', cursor: 'pointer',
                border: a.label ? 'none' : `2px solid ${a.color}`,
                background: a.label ? a.color : `color-mix(in srgb, ${a.color} 35%, transparent)`,
                color: '#fff', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, lineHeight: 1,
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      <button type="button" aria-label="Reset view" title="Reset view" onClick={() => onPick('home')} style={{
        width: 28, height: 28, padding: 0, borderRadius: 8, cursor: 'pointer', fontSize: 15, lineHeight: 1,
        background: 'color-mix(in srgb, var(--bg-card) 55%, transparent)', color: 'var(--text-primary)',
        border: '1px solid color-mix(in srgb, var(--text-primary) 14%, transparent)',
      }}>
        ⟲
      </button>
    </div>
  );
}
