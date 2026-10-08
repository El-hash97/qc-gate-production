'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  REPAIR_PALLET, ROUTES, STATIONS, TRUCK_DOCK, stationPos,
  type Counts, type Vec2,
} from '@/utils/finishingFlow';
import { createSim, step, type BlockColor } from '@/utils/finishingSim';
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
  sprite.scale.set(4, 1, 1);
  return sprite;
}

function belt(a: Vec2, b: Vec2, mat: THREE.Material): THREE.Mesh {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dz), 0.2, 1.1), mat);
  mesh.position.set((a[0] + b[0]) / 2, 0.6, (a[1] + b[1]) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  return mesh;
}

function makeForklift(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 2), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  body.position.y = 0.7;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x374151 }));
  mast.position.set(0, 1.2, -1.05);
  g.add(body, mast);
  return g;
}

function makeTruck(): THREE.Group {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
  cab.position.set(-3.4, 1.4, 0);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 2.4), new THREE.MeshStandardMaterial({ color: 0x6b7280 }));
  bed.position.set(0, 1.15, 0);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-3.4, 1.2], [-3.4, -1.2], [1.2, 1.2], [1.2, -1.2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  g.add(cab, bed);
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
    camera.position.set(10, 38, 34);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(2, 0, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 30, 15);
    scene.add(sun);

    const floorMat = new THREE.MeshStandardMaterial();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(2, 0, -1);
    scene.add(floor);

    // Beige machines, like the reference video.
    const machineMat = new THREE.MeshStandardMaterial({ color: 0xd6c4a1 });
    const ngMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c });
    for (const s of STATIONS) {
      const [w, h, d] = s.size;
      const geo = s.shape === 'cylinder'
        ? new THREE.CylinderGeometry(w / 2, w / 2, h, 32)
        : new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, s.id === 'ngBox' ? ngMat : machineMat);
      mesh.position.set(s.pos[0], h / 2, s.pos[1]);
      scene.add(mesh);
      const label = makeLabel(s.label);
      label.position.set(s.pos[0], Math.max(h, 1) + 1.4, s.pos[1]);
      scene.add(label);
    }

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x4b5563 });
    for (const route of [ROUTES.main, ROUTES.ok]) {
      for (let i = 1; i < route.length; i++) scene.add(belt(stationPos(route[i - 1]), stationPos(route[i]), beltMat));
    }

    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 1.4), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    pallet.position.set(REPAIR_PALLET[0], 0.08, REPAIR_PALLET[1]);
    scene.add(pallet);

    const forklift = makeForklift();
    scene.add(forklift);
    const truck = makeTruck();
    truck.position.set(TRUCK_DOCK[0], 0, TRUCK_DOCK[1]);
    scene.add(truck);

    const blockGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
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
      if (live.current.running) step(sim, dt, live.current.counts);
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
        m.position.set(b.pos[0], b.pos[1], b.pos[2]);
      }
      for (const [id, m] of meshes) {
        if (!seen.has(id)) {
          scene.remove(m);
          meshes.delete(id);
        }
      }
      forklift.position.set(sim.forklift.pos[0], 0, sim.forklift.pos[1]);
      truck.position.x = TRUCK_DOCK[0] + sim.truck.offset;

      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
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
