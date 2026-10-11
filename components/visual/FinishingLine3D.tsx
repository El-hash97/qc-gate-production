'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  BLOCK_SIZE, FORKLIFT_HOME, MODEL_LIFT, MODEL_SCALE, MODEL_URL, REPAIR_PALLET, STATIONS, TRUCK_DOCK,
  ANIM_FPS, SEGMENTS, type Counts,
} from '@/utils/finishingFlow';
import { FORKLIFT_HEADING, TRUCK_BED_Y, createSim, step, type BlockColor } from '@/utils/finishingSim';
import { createStationAnim } from './stationAnim';
import { activeRange } from '@/utils/animRange';
import type { Theme } from '@/hooks/useTheme';

const BLOCK_COLORS: Record<BlockColor, number> = {
  raw: 0x9ca3af, ok: 0x22c55e, repair: 0xf59e0b, ng: 0xdc2626,
};
const SCENE_BG: Record<Theme, number> = { dark: 0x0f1117, light: 0xf3f4f6 };
const FLOOR: Record<Theme, number> = { dark: 0x2e3346, light: 0xc9ccd3 };

interface Props {
  counts: Counts;
  running: boolean;
  theme: Theme;
}

// Count tag beside the OK / Repair / NG spots; redrawn only when the text changes.
function makeBadge(color: string): { sprite: THREE.Sprite; set: (text: string) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 80;
  const g = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(4.8, 1, 1);
  let current = '';
  return {
    sprite,
    set(text) {
      if (text === current) return;
      current = text;
      g.clearRect(0, 0, 384, 80);
      g.fillStyle = color;
      g.fillRect(0, 0, 384, 80);
      g.fillStyle = '#ffffff';
      g.font = 'bold 36px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 192, 42);
      texture.needsUpdate = true;
    },
  };
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = 'rgba(15,17,23,0.82)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#ffffff';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }),
  );
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

// Counterbalance forklift, forks pointing +x. Local origin = centre of the
// wheelbase at ground level. `carriage` slides up the mast (its y = fork top
// height); `wheels` spin as it drives.
const WHEEL_R = { front: 0.32, rear: 0.25 };
function makeForklift(): { group: THREE.Group; carriage: THREE.Group; wheels: THREE.Mesh[] } {
  const g = new THREE.Group();
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, ...extra });
  const box = (parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
    mesh.position.set(...pos);
    parent.add(mesh);
    return mesh;
  };
  const paint = mat(0xf97316); // forklift orange
  const steel = mat(0x374151, { metalness: 0.5, roughness: 0.5 });
  const black = mat(0x111827);

  // chassis, hood over the engine, heavy rear counterweight
  box(g, [1.7, 0.45, 1.05], [-0.15, 0.55, 0], paint);
  box(g, [0.7, 0.3, 0.95], [-0.45, 0.92, 0], paint);
  box(g, [0.38, 0.75, 1.1], [-0.9, 0.72, 0], steel);
  // seat and steering wheel
  box(g, [0.35, 0.08, 0.45], [-0.35, 1.11, 0], black);
  box(g, [0.06, 0.45, 0.45], [-0.55, 1.33, 0], black);
  const column = box(g, [0.05, 0.4, 0.05], [0.05, 1.05, 0], black);
  column.rotation.z = -0.35;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 20), black);
  wheel.position.set(0.0, 1.25, 0);
  wheel.rotation.set(Math.PI / 2, 0.6, 0);
  g.add(wheel);
  // overhead guard: four posts and a slatted roof
  for (const [x, z] of [[-0.75, 0.47], [-0.75, -0.47], [0.3, 0.47], [0.3, -0.47]]) box(g, [0.05, 1.3, 0.05], [x, 1.42, z], steel);
  box(g, [1.12, 0.05, 1.0], [-0.22, 2.08, 0], steel);
  for (const z of [-0.25, 0, 0.25]) box(g, [1.05, 0.04, 0.06], [-0.22, 2.1, z], steel);
  // amber beacon
  box(g, [0.12, 0.1, 0.12], [-0.6, 2.17, 0], mat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 0.8 }));
  // mast: two uprights tied by cross members
  for (const z of [0.32, -0.32]) box(g, [0.1, 2.3, 0.08], [0.62, 1.2, z], steel);
  for (const y of [0.35, 1.3, 2.3]) box(g, [0.08, 0.08, 0.72], [0.62, y, 0], steel);

  // carriage with load backrest and two forks; y = fork top height
  const carriage = new THREE.Group();
  carriage.position.set(0.7, 0.06, 0);
  box(carriage, [0.06, 0.45, 0.9], [0, 0.2, 0], steel);
  for (const z of [-0.3, -0.1, 0.1, 0.3]) box(carriage, [0.04, 0.55, 0.04], [0, 0.65, z], steel);
  box(carriage, [0.04, 0.04, 0.9], [0, 0.92, 0], steel);
  for (const z of [0.22, -0.22]) box(carriage, [1.0, 0.05, 0.12], [0.5, -0.025, z], steel);
  g.add(carriage);

  // tyres with grey hubs: big drive wheels under the mast, small steer wheels at the back
  const wheels: THREE.Mesh[] = [];
  const hubMat = mat(0x9ca3af);
  for (const [x, z, r] of [
    [0.4, 0.45, WHEEL_R.front], [0.4, -0.45, WHEEL_R.front],
    [-0.75, 0.42, WHEEL_R.rear], [-0.75, -0.42, WHEEL_R.rear],
  ] as const) {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 20), black);
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set(x, r, z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.24, 6), hubMat);
    tyre.add(hub);
    g.add(tyre);
    wheels.push(tyre);
  }
  return { group: g, carriage, wheels };
}

// Box truck, cab facing -x, open rear doors facing +x. Local origin = centre of
// the cargo floor footprint at ground level; cargo floor sits at TRUCK_BED_Y.
function makeTruck(): THREE.Group {
  const g = new THREE.Group();
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, ...extra });
  const box = (size: [number, number, number], pos: [number, number, number], m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
    mesh.position.set(...pos);
    g.add(mesh);
    return mesh;
  };
  const white = mat(0xf3f4f6);
  const cabPaint = mat(0x1d4ed8);
  const dark = mat(0x1f2937);
  const glass = mat(0x0f172a, { metalness: 0.4, roughness: 0.15 });
  const grey = mat(0x9ca3af);

  // chassis + bumper
  box([6.2, 0.25, 1.9], [-0.9, 0.7, 0], dark);
  box([0.15, 0.35, 2.3], [-4.05, 0.7, 0], dark);
  // cab with windscreen, side windows and headlights
  box([1.7, 1.9, 2.3], [-3.15, 1.75, 0], cabPaint);
  box([0.05, 0.75, 1.9], [-4.01, 2.15, 0], glass);
  box([0.9, 0.6, 0.04], [-3.3, 2.2, 1.16], glass);
  box([0.9, 0.6, 0.04], [-3.3, 2.2, -1.16], glass);
  box([0.06, 0.18, 0.4], [-4.02, 1.05, 0.85], mat(0xfde68a, { emissive: 0xfde68a, emissiveIntensity: 0.4 }));
  box([0.06, 0.18, 0.4], [-4.02, 1.05, -0.85], mat(0xfde68a, { emissive: 0xfde68a, emissiveIntensity: 0.4 }));
  // cargo box: floor, roof, walls; rear left open so the loaded blocks show
  box([4.6, 0.1, 2.3], [0, TRUCK_BED_Y - 0.05, 0], grey);
  box([4.6, 0.08, 2.3], [0, TRUCK_BED_Y + 2.2, 0], white);
  box([4.6, 2.2, 0.06], [0, TRUCK_BED_Y + 1.1, 1.15], white);
  box([4.6, 2.2, 0.06], [0, TRUCK_BED_Y + 1.1, -1.15], white);
  box([0.06, 2.2, 2.3], [-2.3, TRUCK_BED_Y + 1.1, 0], white);
  // company stripe on both sides
  box([4.6, 0.25, 0.02], [0, TRUCK_BED_Y + 0.6, 1.19], cabPaint);
  box([4.6, 0.25, 0.02], [0, TRUCK_BED_Y + 0.6, -1.19], cabPaint);
  // rear doors swung fully open
  box([1.15, 2.2, 0.05], [2.88, TRUCK_BED_Y + 1.1, 1.2], white);
  box([1.15, 2.2, 0.05], [2.88, TRUCK_BED_Y + 1.1, -1.2], white);
  // wheels: single front axle, dual rear axle
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 20);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 12);
  const tyre = mat(0x111111);
  for (const [x, z] of [[-3.15, 1.0], [-3.15, -1.0], [1.2, 1.0], [1.2, -1.0], [1.2, 0.68], [1.2, -0.68]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.45, z);
    const hub = new THREE.Mesh(hubGeo, grey);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.45, z);
    g.add(w, hub);
  }
  return g;
}

export default function FinishingLine3D({ counts, running, theme }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Read by the render loop, so a 3 s poll updates these without rebuilding the scene.
  const live = useRef({ counts, running });
  live.current = { counts, running };
  const applyTheme = useRef<(t: Theme) => void>(() => {});
  const [noWebGL, setNoWebGL] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      // Old plant PCs/TVs without WebGL: keep the page (and its count tiles) alive.
      setNoWebGL(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    // Looks down the line from the Baritori end, like the reference video.
    camera.position.set(-22, 20, 2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-1, 0, 17);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 30, 15);
    scene.add(sun);

    const floorMat = new THREE.MeshStandardMaterial();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 50), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-2, -0.02, 19);
    scene.add(floor);

    // The plant layout exported from the user's Blender file.
    let disposed = false;
    // Plays the Blender timeline (operators, hoists, robot arm...).
    let mixer: THREE.AnimationMixer | null = null;
    // Clips owned by a station segment move with that station's block.
    let stations: ReturnType<typeof createStationAnim>[] = [];
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    new GLTFLoader().setDRACOLoader(draco).load(MODEL_URL, (gltf) => {
      if (disposed) return;
      gltf.scene.scale.setScalar(MODEL_SCALE);
      gltf.scene.position.y = MODEL_LIFT;
      // skinned operators move outside their bind-pose bounds
      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.SkinnedMesh) obj.frustumCulled = false;
      });
      scene.add(gltf.scene);
      // One clip per moving object on the Blender timeline. Station clips are
      // driven by the simulation; the remaining operators (rigs) loop their own
      // motion back-to-back, other machines keep the shared loop length.
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        const loop = Math.max(...gltf.animations.map((c) => c.duration));
        const m = mixer;
        stations = SEGMENTS.map((seg) => createStationAnim(
          m,
          gltf.animations.filter((c) => seg.clips.includes(c.name)),
          (seg.from - 1) / ANIM_FPS,
        ));
        for (const clip of gltf.animations) {
          if (SEGMENTS.some((seg) => seg.clips.includes(clip.name))) continue;
          let play = clip;
          const range = clip.name.startsWith('metarig')
            ? activeRange(clip.tracks.map((t) => ({ times: t.times, values: t.values, size: t.getValueSize() })))
            : null;
          if (range) {
            const [from, to] = range;
            const tracks = clip.tracks.map((t) => t.clone().trim(from, to).shift(-from));
            play = new THREE.AnimationClip(clip.name, to - from, tracks);
          } else {
            clip.duration = loop;
          }
          mixer.clipAction(play).play();
        }
      }
    });

    for (const s of STATIONS) {
      if (s.prop) {
        const [w, h, d] = s.prop.size;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: s.prop.color }));
        mesh.position.set(s.pos[0], h / 2, s.pos[1]);
        scene.add(mesh);
      }
      const label = makeLabel(s.label);
      label.position.set(s.pos[0], s.labelY, s.pos[1]);
      scene.add(label);
    }

    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 1.4), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    pallet.position.set(REPAIR_PALLET[0], 0.08, REPAIR_PALLET[1]);
    scene.add(pallet);

    // OK sits by Junbiki (where the truck loads), Repair by Line Repair, NG by the red box.
    const badges = (
      [['ok', 'junbiki', '#16a34a'], ['repair', 'lineRepair', '#d97706'], ['ng', 'ngBox', '#dc2626']] as const
    ).map(([key, id, color]) => {
      const s = STATIONS.find((st) => st.id === id)!;
      const badge = makeBadge(color);
      badge.sprite.position.set(s.pos[0], s.labelY + 1, s.pos[1]);
      scene.add(badge.sprite);
      return { key, label: key === 'ok' ? 'OK' : key === 'repair' ? 'Repair' : 'NG', badge };
    });

    const forklift = makeForklift();
    forklift.group.rotation.y = FORKLIFT_HEADING;
    forklift.group.position.set(FORKLIFT_HOME[0], 0, FORKLIFT_HOME[1]);
    scene.add(forklift.group);
    const truck = makeTruck();
    truck.position.set(TRUCK_DOCK[0], 0, TRUCK_DOCK[1]);
    scene.add(truck);

    const blockGeo = new THREE.BoxGeometry(...BLOCK_SIZE);
    const blockMats = Object.fromEntries(
      Object.entries(BLOCK_COLORS).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c })]),
    ) as Record<BlockColor, THREE.MeshStandardMaterial>;
    const meshes = new Map<number, THREE.Mesh>();

    applyTheme.current = (t) => {
      scene.background = new THREE.Color(SCENE_BG[t]);
      floorMat.color.set(FLOOR[t]);
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let sim = createSim();
    let last = performance.now();
    let raf = 0;
    // requestAnimationFrame already pauses in hidden tabs; the dt clamp
    // stops a jump when the tab comes back.
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (live.current.running) {
        step(sim, dt, live.current.counts);
        // station clips follow their block, then glide back (stationAnim)
        sim.segments.forEach((seg, k) => stations[k]?.update(seg.busy, seg.t, dt));
        mixer?.update(dt);
      }
      else if (sim.nextId > 1) sim = createSim();

      const seen = new Set<number>();
      for (const b of sim.blocks) {
        seen.add(b.id);
        let m = meshes.get(b.id);
        if (!m) {
          m = new THREE.Mesh(blockGeo, blockMats[b.color]);
          meshes.set(b.id, m);
          scene.add(m);
        }
        m.material = blockMats[b.color];
        if (b.quat) {
          // riding a recorded station segment: exact Blender rotation
          m.quaternion.set(...b.quat);
        } else {
          // face the direction of travel; parked blocks keep their last heading
          const dx = b.pos[0] - m.position.x;
          const dz = b.pos[2] - m.position.z;
          if (dx * dx + dz * dz > 1e-6) m.rotation.set(0, Math.atan2(-dz, dx), 0);
        }
        m.position.set(b.pos[0], b.pos[1], b.pos[2]);
      }
      for (const [id, m] of meshes) {
        if (!seen.has(id)) {
          scene.remove(m);
          meshes.delete(id);
        }
      }
      // roll the tyres by the distance covered (sign: forward along the heading)
      const fx = sim.forklift.pos[0] - forklift.group.position.x;
      const fz = sim.forklift.pos[1] - forklift.group.position.z;
      const along = fx * Math.cos(FORKLIFT_HEADING) - fz * Math.sin(FORKLIFT_HEADING);
      forklift.wheels.forEach((w, i) => { w.rotation.y -= along / (i < 2 ? WHEEL_R.front : WHEEL_R.rear); });
      forklift.group.position.set(sim.forklift.pos[0], 0, sim.forklift.pos[1]);
      forklift.carriage.position.y = sim.forklift.forkY;
      truck.position.x = TRUCK_DOCK[0] + sim.truck.offset;

      const c = live.current.counts;
      const total = c.ok + c.repair + c.ng;
      for (const { key, label, badge } of badges) {
        const pct = total ? ((c[key] / total) * 100).toFixed(1) : '0.0';
        badge.set(`${label} ${c[key]} · ${pct}%`);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      mixer?.stopAllAction();
      draco.dispose();
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      for (const m of meshes.values()) scene.remove(m);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        if (obj instanceof THREE.Sprite) obj.material.map?.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      });
      blockGeo.dispose();
      Object.values(blockMats).forEach((m) => m.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    applyTheme.current(theme);
  }, [theme]);

  if (noWebGL) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        3D tidak didukung di perangkat ini
      </div>
    );
  }
  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
