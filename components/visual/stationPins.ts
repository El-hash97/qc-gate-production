import * as THREE from 'three';
import { TRUCK_DOCK, type Counts, type StationId } from '@/utils/finishingFlow';
import type { Sim } from '@/utils/finishingSim';
import type { LineStop } from '@/lib/types';
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

// Station name tags in the same glass style as the pins, hung from the
// station's dot on their own stem just above the pin card. A tag whose
// station has a detail card gets a chevron and opens it on click. The OK /
// Repair / NG counts sit above their station's tag, keeping their colour.
const BADGES: Partial<Record<StationId, { key: keyof Counts; text: string }>> = {
  junbiki: { key: 'ok', text: 'OK' },
  lineRepair: { key: 'repair', text: 'Repair' },
  ngBox: { key: 'ng', text: 'NG' },
};

export function createTags(
  mount: HTMLElement,
  stations: readonly { id: StationId; label: string }[],
  clickable: (id: StationId) => boolean,
  onSelect: (id: StationId) => void,
) {
  const layer = document.createElement('div');
  layer.className = styles.layer;
  mount.appendChild(layer);
  const add = (tag: string, cls: string, parent: HTMLElement) => {
    const el = document.createElement(tag);
    el.className = cls;
    parent.appendChild(el);
    return el;
  };
  const tags = stations.map((s) => {
    const el = add('div', styles.tagPin, layer);
    el.dataset.tag = s.id;
    add('span', styles.dot, el);
    add('span', styles.tagStem, el);
    const name = add(clickable(s.id) ? 'button' : 'div', styles.tag, el);
    name.textContent = clickable(s.id) ? `${s.label} ›` : s.label;
    if (name instanceof HTMLButtonElement) {
      name.type = 'button';
      name.addEventListener('click', () => onSelect(s.id));
    }
    const note = add('div', styles.stopNote, el);
    const b = BADGES[s.id];
    const badge = b ? add('div', styles.badge, el) : null;
    if (badge && b) badge.dataset.kind = b.key;
    return { id: s.id, el, note, badge, b, text: '', at: new THREE.Vector3(...stationPinPos(s.id)) };
  });
  const v = new THREE.Vector3();
  return {
    // `visible`: the name tags (the count badges, and a line-stopped
    // station's tag, always show)
    update(camera: THREE.Camera, visible: boolean, counts: Counts, stop: LineStop | null = null) {
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const total = counts.ok + counts.repair + counts.ng;
      for (const t of tags) {
        const stopped = stop?.station === t.id;
        t.el.toggleAttribute('data-stop', stopped);
        const note = stopped ? `LINE STOP ${stop.start}–${stop.end}` : '';
        if (t.note.textContent !== note) t.note.textContent = note;
        if (!visible && !t.badge && !stopped) {
          t.el.style.display = 'none';
          continue;
        }
        v.copy(t.at).project(camera);
        if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) {
          t.el.style.display = 'none';
          continue;
        }
        t.el.style.display = '';
        t.el.toggleAttribute('data-off', !visible && !stopped);
        t.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
        if (t.badge && t.b) {
          const n = counts[t.b.key];
          const text = `${t.b.text} ${n} · ${(total ? (n / total) * 100 : 0).toFixed(1)}%`;
          if (text !== t.text) t.badge.textContent = t.text = text;
        }
      }
    },
    dispose: () => layer.remove(),
  };
}
