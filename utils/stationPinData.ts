import { SEGMENTS, STATIONS, TRUCK_CAPACITY, segmentSeconds, type Counts, type StationId } from './finishingFlow';
import type { Sim } from './finishingSim';

// The 3D callout pins: one per station plus the two vehicles, in flow order.
// Kept free of three.js so the settings menu can list them cheaply.
export const PINS = [
  { id: 'baritori', title: 'Baritori' },
  { id: 'hsb05', title: 'HSB05' },
  { id: 'hsb06', title: 'HSB06' },
  { id: 'grinding', title: 'Grinding' },
  { id: 'hanten', title: 'Hanten MC' },
  { id: 'final', title: 'Final Process' },
  { id: 'qc1', title: 'QC Gate 1' },
  { id: 'qc2', title: 'QC Gate 2' },
  { id: 'spray', title: 'Spray Booth' },
  { id: 'junbiki', title: 'Junbiki' },
  { id: 'lineRepair', title: 'Line Repair' },
  { id: 'ngBox', title: 'NG Pallet' },
  { id: 'forklift', title: 'Forklift' },
  { id: 'truck', title: 'Truck' },
] as const;
export type PinId = (typeof PINS)[number]['id'];

export type Tone = 'ok' | 'warn' | 'bad' | 'idle';
export interface Readout { label: string; value: string; sub: string; tone: Tone }

// Height of each station pin's dot above the floor (on the machine, under its name tag).
export const PIN_Y: Partial<Record<StationId, number>> = {
  baritori: 1.6, hsb05: 2.2, hsb06: 2.2, grinding: 1.8, hanten: 1.5, final: 1.5,
  qc1: 1.4, qc2: 1.6, spray: 2.2, junbiki: 2, lineRepair: 1.2, ngBox: 0.6,
};

// Station → its segment on the Blender timeline (Hanten..QC Gate 1 share one).
const SEGMENT_OF: Partial<Record<StationId, number>> = {
  baritori: 0, hsb05: 1, hsb06: 2, grinding: 3, hanten: 4, final: 4, qc1: 4, spray: 5,
};

const FORKLIFT_TEXT: Record<Sim['forklift']['state'], string> = {
  idle: 'Standby at QC Gate 2',
  toRepair: 'Heading to Line Repair',
  repairing: 'At Line Repair',
  toGate: 'Returning to QC Gate 2',
  unloading: 'Unloading at QC Gate 2',
};
const TRUCK_TEXT: Record<Sim['truck']['state'], string> = {
  docked: 'Loading at Junbiki',
  leaving: 'Out for delivery',
  returning: 'Returning to dock',
};
// NG share above which the line alarms (same 5% as the dashboard)
const NG_ALARM_PCT = 5;

const title = (id: PinId) => PINS.find((p) => p.id === id)!.title;

// What each pin reads, from the sim and the shift's BC counts.
export function pinReadouts(sim: Sim, counts: Counts, running: boolean): Record<PinId, Readout> {
  const total = counts.ok + counts.repair + counts.ng;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const busy = (seg: number) => (sim.segments[seg]?.busy ?? null) !== null;
  const status = (seg: number) => (!running ? 'Stopped' : busy(seg) ? 'Processing' : 'Waiting for block');
  const tone = (seg: number): Tone => (running && busy(seg) ? 'ok' : 'idle');
  const ngPct = pct(counts.ng);

  const out = {} as Record<PinId, Readout>;
  // machines with their own Blender cycle: cycle time + status
  for (const id of ['baritori', 'hsb05', 'hsb06', 'grinding'] as const) {
    const seg = SEGMENT_OF[id]!;
    out[id] = { label: `${title(id)} cycle`, value: `${segmentSeconds(SEGMENTS[seg]).toFixed(1)} s`, sub: status(seg), tone: tone(seg) };
  }
  // the shared Hanten → QC Gate 1 conveyor: status + line tact
  for (const id of ['hanten', 'final', 'qc1'] as const) {
    const seg = SEGMENT_OF[id]!;
    out[id] = { label: title(id), value: status(seg), sub: `Line tact ${segmentSeconds(SEGMENTS[seg]).toFixed(1)} s`, tone: tone(seg) };
  }
  out.qc2 = {
    label: 'NG rate QC Gate 2',
    value: `${ngPct.toFixed(1)}%`,
    sub: ngPct > NG_ALARM_PCT ? `Above the ${NG_ALARM_PCT}% limit` : `Limit ${NG_ALARM_PCT}%`,
    tone: ngPct > NG_ALARM_PCT ? 'bad' : ngPct > NG_ALARM_PCT * 0.6 ? 'warn' : 'ok',
  };
  out.spray = { label: 'Spray Booth', value: status(5), sub: `${counts.ok} OK blocks oiled`, tone: tone(5) };
  out.junbiki = { label: 'Junbiki OK', value: `${counts.ok}`, sub: `${pct(counts.ok).toFixed(1)}% of total`, tone: 'ok' };
  out.lineRepair = { label: 'Line Repair', value: `${counts.repair}`, sub: `${pct(counts.repair).toFixed(1)}% repair`, tone: counts.repair ? 'warn' : 'idle' };
  out.ngBox = { label: 'NG Pallet', value: `${counts.ng}`, sub: `${ngPct.toFixed(1)}% NG`, tone: ngPct > NG_ALARM_PCT ? 'bad' : 'idle' };
  out.forklift = {
    label: 'Forklift repair',
    value: sim.forklift.load.length ? `${sim.forklift.load.length} block${sim.forklift.load.length > 1 ? 's' : ''}` : 'Empty',
    sub: FORKLIFT_TEXT[sim.forklift.state],
    tone: sim.forklift.state === 'idle' ? 'idle' : 'warn',
  };
  out.truck = {
    label: 'Truck OK',
    value: `${sim.truck.load} / ${TRUCK_CAPACITY}`,
    sub: TRUCK_TEXT[sim.truck.state],
    tone: sim.truck.state === 'docked' ? 'ok' : 'idle',
  };
  return out;
}

// Where a station pin's dot sits (vehicles move, the renderer places those).
export function stationPinPos(id: StationId): [number, number, number] {
  const s = STATIONS.find((st) => st.id === id)!;
  return [s.pos[0], PIN_Y[id] ?? 1.5, s.pos[1]];
}
