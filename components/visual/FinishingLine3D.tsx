'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  BLOCK_SIZE, BLOCK_URL, FORKLIFT_HOME, MODEL_LIFT, MODEL_SCALE, MODEL_SPLIT_URL, MODEL_URL, NG_PALLET_TOP, STATIONS, TRUCK_DOCK,
  ANIM_FPS, SEGMENTS, stationHold, type Counts, type StationId,
} from '@/utils/finishingFlow';
import { TRUCK_BED_Y, createSim, step, type BlockColor } from '@/utils/finishingSim';
import { createStationAnim, type StationClip } from './stationAnim';
import { stationDetail } from '@/utils/stationDetails';
import { WORKFLOW_CARDS, cardRows } from '@/utils/workflowCards';
import { createWorkflowBoards } from './workflowBoards';
import { createPins, createTags } from './stationPins';
import { PINS, type PinId } from '@/utils/stationPinData';
import type { Theme } from '@/hooks/useTheme';
import type { LineStop } from '@/lib/types';
import { stopsAt } from '@/utils/lineStop';
import { stopLevel } from '@/utils/stopHistory';

const BLOCK_COLORS: Record<BlockColor, number> = {
  raw: 0x9ca3af, ok: 0x22c55e, repair: 0xf59e0b, ng: 0xdc2626,
};
const SCENE_BG: Record<Theme, number> = { dark: 0x0f1117, light: 0xf3f4f6 };
const FLOOR: Record<Theme, number> = { dark: 0x2e3346, light: 0xc9ccd3 };
const WALL: Record<Theme, number> = { dark: 0x4b5270, light: 0xe5e7eb };
const PLINTH: Record<Theme, number> = { dark: 0x262a38, light: 0x9ca3af };

// The building around the layout (metres, scene axes). The floor fills it; the
// camera stays inside it. The truck gate is in the west wall, in line with the dock.
// h = wall height: kept low (half the 12 m hall) so the line shows over them.
const ROOM = { x0: -19, x1: 21, z0: -6, z1: 44, h: 6, t: 0.3 };
// Camera start/fly height, independent of the (low) walls.
const CAM_Y = 11.5;
const GATE = { z: TRUCK_DOCK[1], w: 4.4, h: 4.6 };

// Four walls with a concrete plinth, and a truck gate (steel frame, rolled-up
// shutter) cut into the west wall.
function makeRoom() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const plinth = new THREE.MeshStandardMaterial({ roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
  const shutter = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.5, roughness: 0.5 });
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
  };
  const { x0, x1, z0, z1, h, t } = ROOM;
  const PH = 1.2; // plinth height
  // a wall run along x (at z) or along z (at x) from a to b: plinth below, panel above;
  // `from` lifts the run off the floor (the lintel over the gate)
  const runX = (z: number, a: number, b: number) => {
    box(b - a, PH, t + 0.06, (a + b) / 2, PH / 2, z, plinth);
    box(b - a, h - PH, t, (a + b) / 2, PH + (h - PH) / 2, z, wall);
  };
  const runZ = (x: number, a: number, b: number, from = 0) => {
    if (from < PH) box(t + 0.06, PH - from, b - a, x, from + (PH - from) / 2, (a + b) / 2, plinth);
    const y = Math.max(PH, from);
    box(t, h - y, b - a, x, y + (h - y) / 2, (a + b) / 2, wall);
  };
  runX(z0, x0 - t / 2, x1 + t / 2);
  runX(z1, x0 - t / 2, x1 + t / 2);
  runZ(x1, z0, z1);
  const g0 = GATE.z - GATE.w / 2;
  const g1 = GATE.z + GATE.w / 2;
  runZ(x0, z0, g0);
  runZ(x0, g1, z1);
  runZ(x0, g0, g1, GATE.h);
  // gate frame: two posts and a header, proud of the wall on both faces
  for (const z of [g0 - 0.1, g1 + 0.1]) box(t + 0.2, GATE.h, 0.2, x0, GATE.h / 2, z, steel);
  box(t + 0.2, 0.2, GATE.w + 0.4, x0, GATE.h + 0.1, GATE.z, steel);
  // rolled-up shutter drum on the inside face, above the header
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, GATE.w + 0.2, 20), shutter);
  drum.rotation.x = Math.PI / 2;
  drum.position.set(x0 + t / 2 + 0.4, GATE.h + 0.55, GATE.z);
  g.add(drum);
  // yellow-black hazard stripes on the floor across the gateway
  for (let i = 0; i < 6; i++) {
    box(0.6, 0.01, GATE.w / 6, x0 + 0.5, 0.005, g0 + (i + 0.5) * (GATE.w / 6), i % 2 ? plinth : steel);
  }
  return { group: g, wall, plinth };
}

interface Props {
  counts: Counts;
  running: boolean;
  theme: Theme;
  // called when a station's name tag that has a detail card is clicked
  onSelectStation?: (id: StationId) => void;
  // live "a block is in this station segment" flags, reported when they change
  onBusyChange?: (busy: boolean[]) => void;
  // fly the camera to this station; a new `n` flies again to the same one
  focus?: { id: StationId; n: number };
  // callout pins switched on (all of them when omitted)
  pins?: readonly PinId[];
  // station name tags
  labels?: boolean;
  // AV line stop at a station going on now: the line halts there
  lineStop?: LineStop | null;
  // the last 30 days of line stops (archived shifts + this one): a station's
  // board shows its latest one and is clickable when it has any
  lineStops?: LineStop[];
  // line stops per station in those 30 days: 3+ turns the machine orange, 10+ red
  stopCounts?: Record<string, number>;
  // a station's board was clicked (only boards that carry a line stop)
  onSelectLineStops?: (id: StationId) => void;
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
// Red plastic pallet (1.2 x 1.0 m) the NG blocks are stacked on: slatted deck
// on nine feet and three runners, deck top at NG_PALLET_TOP.
function makePallet(): THREE.Group {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 });
  const box = (size: [number, number, number], pos: [number, number, number], m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
    mesh.position.set(...pos);
    g.add(mesh);
  };
  const top = NG_PALLET_TOP;
  // three runners on the floor, nine feet, five deck slats with gaps
  for (const z of [-0.45, 0, 0.45]) box([1.2, 0.03, 0.1], [0, 0.015, z], dark);
  for (const x of [-0.53, 0, 0.53]) {
    for (const z of [-0.43, 0, 0.43]) box([0.14, top - 0.06, 0.14], [x, 0.03 + (top - 0.06) / 2, z], red);
  }
  for (let i = 0; i < 5; i++) box([1.2, 0.03, 0.16], [0, top - 0.015, -0.42 + i * 0.21], red);
  return g;
}

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

export default function FinishingLine3D({
  counts, running, theme, onSelectStation, onBusyChange, focus, pins, labels = true, lineStop = null,
  lineStops, stopCounts, onSelectLineStops,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const select = useRef(onSelectStation);
  select.current = onSelectStation;
  const stopsClicked = useRef(onSelectLineStops);
  stopsClicked.current = onSelectLineStops;
  const busyChanged = useRef(onBusyChange);
  busyChanged.current = onBusyChange;
  const flyTo = useRef<(id: StationId) => void>(() => {});
  // Read by the render loop, so a 3 s poll updates these without rebuilding the scene.
  const shownPins = new Set<PinId>(pins ?? PINS.map((p) => p.id));
  const station = lineStop?.station;
  const hold = useMemo(() => (station ? stationHold(station) : null), [station]);
  const live = useRef({ counts, running, pins: shownPins, labels, lineStop, hold, lineStops, stopCounts });
  live.current = { counts, running, pins: shownPins, labels, lineStop, hold, lineStops, stopCounts };
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
    // Looks down the line from the Baritori end, like the reference video,
    // from high in the building's corner.
    camera.position.set(-17, CAM_Y, 2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-1, 0, 17);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 6;
    controls.maxDistance = 80;
    controls.update();
    // What the camera orbits stays inside the building. The building has no
    // roof, so the camera itself may rise above the walls and zoom out past
    // them — but outside the walls only from above (see the frame loop).
    const roomMin = new THREE.Vector3(ROOM.x0 + 0.6, 1, ROOM.z0 + 0.6);
    const roomMax = new THREE.Vector3(ROOM.x1 - 0.6, CAM_Y, ROOM.z1 - 0.6);
    // Camera flight to a station: same viewing direction, 12 m out; grabbing
    // the camera cancels it.
    let fly: { target: THREE.Vector3; pos: THREE.Vector3 } | null = null;
    flyTo.current = (id) => {
      const s = STATIONS.find((st) => st.id === id);
      if (!s) return;
      const target = new THREE.Vector3(s.pos[0], 1, s.pos[1]);
      const dir = camera.position.clone().sub(controls.target).normalize();
      fly = { target, pos: target.clone().addScaledVector(dir, 12).clamp(roomMin, roomMax) };
    };
    controls.addEventListener('start', () => { fly = null; });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 30, 15);
    scene.add(sun);

    const floorMat = new THREE.MeshStandardMaterial();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((ROOM.x0 + ROOM.x1) / 2, -0.02, (ROOM.z0 + ROOM.z1) / 2);
    scene.add(floor);
    const room = makeRoom();
    scene.add(room.group);
    // workflow boards on the empty floor east of the line, Baritori end to Line Repair
    const boards = createWorkflowBoards(WORKFLOW_CARDS, 15.5, -3, 3.1);
    scene.add(boards.group);
    // Machines with 3+ (orange) or 10+ (red) line stops in the last 30 days get
    // their body tinted (see `machines` below).
    const HALO = { orange: 0xf59e0b, red: 0xdc2626 } as const;
    // click (not drag) on a board that carries a line stop opens the details;
    // the pointer shows it is clickable
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const stopBoardAt = (e: PointerEvent): StationId | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(boards.faces.map((f) => f.face))[0];
      const id = boards.faces.find((f) => f.face === hit?.object)?.id ?? null;
      return id && stopsAt(live.current.lineStops, id).length > 0 ? id : null;
    };
    let down: [number, number] | null = null;
    const onDown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const onUp = (e: PointerEvent) => {
      const moved = down ? Math.hypot(e.clientX - down[0], e.clientY - down[1]) : Infinity;
      down = null;
      const id = moved < 5 ? stopBoardAt(e) : null;
      if (id) stopsClicked.current?.(id);
    };
    const onMove = (e: PointerEvent) => { renderer.domElement.style.cursor = stopBoardAt(e) ? 'pointer' : ''; };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);
    let boardTheme: Theme = 'dark';

    // The plant layout exported from the user's Blender file.
    let disposed = false;
    // Plays the Blender timeline (operators, hoists, robot arm...).
    let mixer: THREE.AnimationMixer | null = null;
    // Clips owned by a station segment move with that station's block.
    let stations: ReturnType<typeof createStationAnim>[] = [];
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    // Per-machine copies of the plant geometry; each machine's materials are its own so one can be tinted.
    const machines: { id: string; mats: { m: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color }[] }[] = [];
    const tinted = new Map<string, string>();
    // the animated model's flat `Layout` gives way once the split plant is in
    let animated: THREE.Object3D | null = null;
    const hideFlat = () => {
      const flat = machines.length ? animated?.getObjectByName('Layout') : null;
      if (flat) flat.visible = false;
    };
    new GLTFLoader().setDRACOLoader(draco).load(MODEL_SPLIT_URL, (gltf) => {
      if (disposed) return;
      gltf.scene.scale.setScalar(MODEL_SCALE);
      gltf.scene.position.y = MODEL_LIFT;
      gltf.scene.traverse((obj) => {
        const id = obj.name.startsWith('MC_') ? obj.name.slice(3) : null;
        if (!id) return;
        const mats: (typeof machines)[number]['mats'] = [];
        obj.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          // keep the material's shape: a lone material must not become an array (no draw groups)
          const own = (m: THREE.MeshStandardMaterial) => {
            const c = m.clone();
            mats.push({ m: c, color: c.color.clone(), emissive: c.emissive.clone() });
            return c;
          };
          o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material);
        });
        machines.push({ id, mats });
      });
      scene.add(gltf.scene);
      hideFlat();
    });
    new GLTFLoader().setDRACOLoader(draco).load(MODEL_URL, (gltf) => {
      if (disposed) return;
      gltf.scene.scale.setScalar(MODEL_SCALE);
      gltf.scene.position.y = MODEL_LIFT;
      animated = gltf.scene;
      hideFlat();
      // skinned operators move outside their bind-pose bounds
      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.SkinnedMesh) obj.frustumCulled = false;
      });
      scene.add(gltf.scene);
      // One clip per moving object on the Blender timeline. Station clips are
      // driven by the simulation (and hold still where no block passes);
      // operators away from the block path — no segment owns their rig — stay
      // frozen, and the remaining machines keep the shared loop length.
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        const loop = Math.max(...gltf.animations.map((c) => c.duration));
        const m = mixer;
        stations = SEGMENTS.map((seg) => {
          const segSec = (seg.to - seg.from) / ANIM_FPS;
          const specs: StationClip[] = [];
          for (const n of seg.clips) {
            const clip = gltf.animations.find((c) => c.name === n);
            if (!clip) continue;
            const win = seg.remap?.[n];
            if (!win) {
              specs.push(clip);
              continue;
            }
            // replay the clip's recorded keyframe window across the segment
            const from = (win[0] - 1) / ANIM_FPS;
            const span = (win[1] - win[0]) / ANIM_FPS;
            specs.push({ clip, map: (t: number) => from + (t / segSec) * span });
          }
          return createStationAnim(m, specs, (seg.from - 1) / ANIM_FPS);
        });
        for (const clip of gltf.animations) {
          if (SEGMENTS.some((seg) => seg.clips.includes(clip.name))) continue;
          if (clip.name.startsWith('metarig')) continue;
          clip.duration = loop;
          mixer.clipAction(clip).play();
        }
      }
    });

    const ngPallet = makePallet();
    const ngSpot = STATIONS.find((st) => st.id === 'ngBox')!.pos;
    ngPallet.position.set(ngSpot[0], 0, ngSpot[1]);
    scene.add(ngPallet);
    // Station name tags (glass, like the pins); one with a detail card opens it.
    const nameTags = createTags(mount, STATIONS, (id) => stationDetail(id) !== null, (id) => select.current?.(id));



    const forklift = makeForklift();
    forklift.group.rotation.y = Math.PI; // parked facing the stub end
    forklift.group.position.set(FORKLIFT_HOME[0], 0, FORKLIFT_HOME[1]);
    scene.add(forklift.group);
    // Past the gate the truck (and its load) is outside: cut away at the west wall.
    renderer.localClippingEnabled = true;
    const outside = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -ROOM.x0)];
    const truck = makeTruck();
    truck.position.set(TRUCK_DOCK[0], 0, TRUCK_DOCK[1]);
    truck.traverse((obj) => {
      if (obj instanceof THREE.Mesh) (obj.material as THREE.Material).clippingPlanes = outside;
    });
    scene.add(truck);

    const blockBoxGeo = new THREE.BoxGeometry(...BLOCK_SIZE);
    const blockMats = Object.fromEntries(
      Object.entries(BLOCK_COLORS).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, clippingPlanes: outside })]),
    ) as Record<BlockColor, THREE.MeshStandardMaterial>;
    // The visible block is the user's BC 2TR mesh (asset/BC 2TR.stl). It is
    // re-seated onto the placeholder box's footprint [length, height, width]
    // in scene axes, so everything on top of it — the recorded track
    // quaternions, forklift forks, pallet stacks — keeps working. The box
    // stays in place until (or unless) the STL is ready.
    let blockGeo: THREE.BufferGeometry = blockBoxGeo;
    let blockStlGeo: THREE.BufferGeometry | null = null;
    new STLLoader().load(BLOCK_URL, (stlGeo) => {
      if (disposed) {
        stlGeo.dispose();
        return;
      }
      stlGeo.computeBoundingBox();
      const raw = new THREE.Vector3().subVectors(stlGeo.boundingBox!.max, stlGeo.boundingBox!.min);
      // Raw STL (Blender axes): length on z, height on y, width on x;
      // rotate the length onto scene x and sit it right side up (the 4
      // pocket holes on top), then stretch each axis to BLOCK_SIZE.
      stlGeo.center();
      stlGeo.rotateY(Math.PI / 2);
      stlGeo.rotateX(Math.PI);
      stlGeo.scale(BLOCK_SIZE[0] / raw.z, BLOCK_SIZE[1] / raw.y, BLOCK_SIZE[2] / raw.x);
      blockStlGeo = stlGeo;
      blockGeo = stlGeo;
      for (const m of meshes.values()) m.geometry = stlGeo;
    });
    const meshes = new Map<number, THREE.Mesh>();

    applyTheme.current = (t) => {
      scene.background = new THREE.Color(SCENE_BG[t]);
      floorMat.color.set(FLOOR[t]);
      room.wall.color.set(WALL[t]);
      room.plinth.color.set(PLINTH[t]);
      boardTheme = t;
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
    const callouts = createPins(mount);

    let sim = createSim();
    let lastBusy = '';
    let last = performance.now();
    let raf = 0;
    // requestAnimationFrame already pauses in hidden tabs; the dt clamp
    // stops a jump when the tab comes back.
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (live.current.running) {
        step(sim, dt, live.current.counts, Math.random, live.current.hold);
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
      const along = fx * Math.cos(sim.forklift.heading) - fz * Math.sin(sim.forklift.heading);
      forklift.wheels.forEach((w, i) => { w.rotation.y -= along / (i < 2 ? WHEEL_R.front : WHEEL_R.rear); });
      forklift.group.position.set(sim.forklift.pos[0], 0, sim.forklift.pos[1]);
      forklift.group.rotation.y = sim.forklift.heading;
      forklift.carriage.position.y = sim.forklift.forkY;
      truck.position.x = TRUCK_DOCK[0] + sim.truck.offset;

      const c = live.current.counts;
      const busy = sim.segments.map((seg) => seg.busy !== null);
      const stopAt = live.current.lineStop?.station ?? null;
      const counts30 = live.current.stopCounts ?? {};
      boards.draw(
        (card) => cardRows(card, c, live.current.running, busy, stopAt, stopsAt(live.current.lineStops, card.id).at(-1) ?? null, counts30[card.id] ?? 0),
        boardTheme,
        (card) => stopLevel(counts30[card.id] ?? 0),
      );
      for (const mc of machines) {
        const level = stopLevel(counts30[mc.id] ?? 0);
        if (tinted.get(mc.id) === level) continue;
        tinted.set(mc.id, level);
        const tint = new THREE.Color(level === 'ok' ? 0 : HALO[level]);
        for (const t of mc.mats) {
          t.m.color.copy(t.color);
          t.m.emissive.copy(t.emissive);
          if (level !== 'ok') {
            t.m.color.lerp(tint, 0.7);
            t.m.emissive.copy(tint).multiplyScalar(0.25);
          }
        }
      }
      const busyKey = busy.join();
      if (busyKey !== lastBusy) {
        lastBusy = busyKey;
        busyChanged.current?.(busy);
      }

      if (fly) {
        const k = 1 - Math.exp(-dt * 4);
        controls.target.lerp(fly.target, k);
        camera.position.lerp(fly.pos, k);
        if (camera.position.distanceTo(fly.pos) < 0.05) fly = null;
      }
      controls.update();
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, roomMin.x, roomMax.x);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, roomMin.z, roomMax.z);
      // No roof: inside the walls' footprint the camera may go as high as it
      // likes; outside it, it stays above the wall tops so it never looks
      // through a wall from the side.
      const p = camera.position;
      const inside = p.x > roomMin.x && p.x < roomMax.x && p.z > roomMin.z && p.z < roomMax.z;
      p.y = Math.max(p.y, inside ? roomMin.y : ROOM.h + 1);
      renderer.render(scene, camera);
      callouts.update(camera, sim, c, live.current.running, live.current.pins, ROOM.x0);
      nameTags.update(camera, live.current.labels, c, live.current.lineStop);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      mixer?.stopAllAction();
      draco.dispose();
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      ro.disconnect();
      controls.dispose();
      for (const m of meshes.values()) scene.remove(m);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        if (obj instanceof THREE.Sprite) obj.material.map?.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
      });
      blockBoxGeo.dispose();
      blockStlGeo?.dispose();
      Object.values(blockMats).forEach((m) => m.dispose());
      renderer.dispose();
      callouts.dispose();
      nameTags.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    applyTheme.current(theme);
  }, [theme]);

  useEffect(() => {
    if (focus) flyTo.current(focus.id);
  }, [focus]);

  if (noWebGL) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        3D is not supported on this device
      </div>
    );
  }
  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
