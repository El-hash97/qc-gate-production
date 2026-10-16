import * as THREE from 'three';
import { SEGMENTS, STATIONS, TRUCK_CAPACITY, TRUCK_DOCK, segmentSeconds, type Counts } from '@/utils/finishingFlow';
import type { Sim } from '@/utils/finishingSim';
import styles from './stationPins.module.css';

// Callouts pinned to things in the 3D line: a dot on the object, an elbow
// stem and a small glass card with one live number. Plain DOM over the
// canvas, moved every frame by projecting the anchor through the camera.

export type Tone = 'ok' | 'warn' | 'bad' | 'idle';
export interface Readout { label: string; value: string; sub: string; tone: Tone }
type PinId = 'hsb05' | 'qc2' | 'forklift' | 'truck';

const FORKLIFT_TEXT: Record<Sim['forklift']['state'], string> = {
  idle: 'Standby di QC Gate 2',
  toRepair: 'Menuju Line Repair',
  repairing: 'Di Line Repair',
  toGate: 'Kembali ke QC Gate 2',
  unloading: 'Bongkar di QC Gate 2',
};
const TRUCK_TEXT: Record<Sim['truck']['state'], string> = {
  docked: 'Muat di Junbiki',
  leaving: 'Berangkat kirim',
  returning: 'Kembali ke dock',
};
// NG share above which the line alarms (same 5% as the dashboard)
const NG_ALARM_PCT = 5;

// What each pin reads, from the sim and the shift's BC counts.
export function pinReadouts(sim: Sim, counts: Counts, running: boolean): Record<PinId, Readout> {
  const total = counts.ok + counts.repair + counts.ng;
  const ngPct = total ? (counts.ng / total) * 100 : 0;
  const hsbBusy = (sim.segments[1]?.busy ?? null) !== null;
  const f = sim.forklift;
  return {
    hsb05: {
      label: 'HSB05 cycle',
      value: `${segmentSeconds(SEGMENTS[1]).toFixed(1)} s`,
      sub: !running ? 'Stop' : hsbBusy ? 'Blasting' : 'Menunggu block',
      tone: running && hsbBusy ? 'ok' : 'idle',
    },
    qc2: {
      label: 'NG rate QC Gate 2',
      value: `${ngPct.toFixed(1)}%`,
      sub: ngPct > NG_ALARM_PCT ? `Di atas batas ${NG_ALARM_PCT}%` : `Batas ${NG_ALARM_PCT}%`,
      tone: ngPct > NG_ALARM_PCT ? 'bad' : ngPct > NG_ALARM_PCT * 0.6 ? 'warn' : 'ok',
    },
    forklift: {
      label: 'Forklift repair',
      value: f.load.length ? `${f.load.length} block` : 'Kosong',
      sub: FORKLIFT_TEXT[f.state],
      tone: f.state === 'idle' ? 'idle' : 'warn',
    },
    truck: {
      label: 'Truck OK',
      value: `${sim.truck.load} / ${TRUCK_CAPACITY}`,
      sub: TRUCK_TEXT[sim.truck.state],
      tone: sim.truck.state === 'docked' ? 'ok' : 'idle',
    },
  };
}

const at = (id: string, y: number) => {
  const s = STATIONS.find((st) => st.id === id)!;
  return new THREE.Vector3(s.pos[0], y, s.pos[1]);
};

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
  const pins = (['hsb05', 'qc2', 'forklift', 'truck'] as const).map((id) => {
    const el = make('div', styles.pin, layer);
    make('span', styles.dot, el);
    make('span', styles.stem, el);
    const card = make('div', styles.card, el);
    return {
      id, el,
      label: make('div', styles.label, card),
      value: make('div', styles.value, card),
      sub: make('div', styles.sub, card),
      text: '',
    };
  });
  const fixed = { hsb05: at('hsb05', 2.2), qc2: at('qc2', 1.6) };
  const v = new THREE.Vector3();

  return {
    // `roomX0`: the gate wall; the truck's pin goes once the truck is out.
    update(camera: THREE.Camera, sim: Sim, counts: Counts, running: boolean, visible: boolean, roomX0: number) {
      layer.style.display = visible ? '' : 'none';
      if (!visible) return;
      const read = pinReadouts(sim, counts, running);
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const truckX = TRUCK_DOCK[0] + sim.truck.offset;
      for (const p of pins) {
        const anchor = p.id === 'forklift' ? v.set(sim.forklift.pos[0], 2.3, sim.forklift.pos[1])
          : p.id === 'truck' ? (truckX > roomX0 + 3 ? v.set(truckX, 3.4, TRUCK_DOCK[1]) : null)
          : v.copy(fixed[p.id]);
        anchor?.project(camera);
        // behind the camera or off screen
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
