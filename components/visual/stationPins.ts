import * as THREE from 'three';
import { TRUCK_DOCK, type Counts, type StationId } from '@/utils/finishingFlow';
import type { Sim } from '@/utils/finishingSim';
import { PINS, pinReadouts, stationPinPos, type PinId } from '@/utils/stationPinData';
import styles from './stationPins.module.css';

// Callouts pinned to things in the 3D line: a dot on the object, an elbow
// stem and a small glass card with one live number. Plain DOM over the
// canvas, moved every frame by projecting the anchor through the camera.
export function createPins(mount: HTMLElement) {
  const layer = document.createElement('div');
  layer.className = styles.layer;
  mount.appendChild(layer);
  const make = (tag: string, cls: string, parent: HTMLElement) => {
    const el = document.createElement(tag);
    el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const pins = PINS.map(({ id }) => {
    const el = make('div', styles.pin, layer);
    el.dataset.pin = id;
    make('span', styles.dot, el);
    make('span', styles.stem, el);
    const card = make('div', styles.card, el);
    const fixed = id === 'forklift' || id === 'truck' ? null : new THREE.Vector3(...stationPinPos(id as StationId));
    return {
      id, el, fixed,
      label: make('div', styles.label, card),
      value: make('div', styles.value, card),
      sub: make('div', styles.sub, card),
      text: '',
    };
  });
  const v = new THREE.Vector3();

  return {
    // `shown`: pins switched on in the settings menu. `roomX0`: the gate wall;
    // the truck's pin goes once the truck is out of the building.
    update(camera: THREE.Camera, sim: Sim, counts: Counts, running: boolean, shown: ReadonlySet<PinId>, roomX0: number) {
      layer.style.display = shown.size ? '' : 'none';
      if (!shown.size) return;
      const read = pinReadouts(sim, counts, running);
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const truckX = TRUCK_DOCK[0] + sim.truck.offset;
      for (const p of pins) {
        const anchor = !shown.has(p.id) ? null
          : p.fixed ? v.copy(p.fixed)
          : p.id === 'forklift' ? v.set(sim.forklift.pos[0], 2.3, sim.forklift.pos[1])
          : truckX > roomX0 + 3 ? v.set(truckX, 3.4, TRUCK_DOCK[1]) : null;
        anchor?.project(camera);
        // switched off, behind the camera or off screen
        if (!anchor || anchor.z > 1 || Math.abs(anchor.x) > 1 || Math.abs(anchor.y) > 1) {
          p.el.style.display = 'none';
          continue;
        }
        p.el.style.display = '';
        p.el.style.transform = `translate(${((anchor.x + 1) / 2) * w}px, ${((1 - anchor.y) / 2) * h}px)`;
        const r = read[p.id];
        const key = `${r.label}|${r.value}|${r.sub}|${r.tone}`;
        if (key !== p.text) {
          p.text = key;
          p.label.textContent = r.label;
          p.value.textContent = r.value;
          p.sub.textContent = r.sub;
          p.el.dataset.tone = r.tone;
        }
      }
    },
    dispose: () => layer.remove(),
  };
}
