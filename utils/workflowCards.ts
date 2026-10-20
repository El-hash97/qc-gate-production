import type { LineStop } from '@/lib/types';
import { stopLabel } from '@/utils/lineStop';
import { SEGMENTS, segmentSeconds, type Counts, type StationId } from './finishingFlow';

// One workflow board per process, standing on the empty floor beside the line
// in flow order. Placeholder copy for review.
export interface WorkflowCard {
  id: StationId;
  title: string;
  desc: string;
  next: string;
  // station segment with its own Blender timing (cycle time + live status)
  segment?: number;
}

export const WORKFLOW_CARDS: readonly WorkflowCard[] = [
  { id: 'baritori', title: 'Baritori', segment: 0, next: 'HSB05',
    desc: 'Burrs and flash left by casting are removed by hand before the block is hung for blasting.' },
  { id: 'hsb05', title: 'HSB05', segment: 1, next: 'HSB06',
    desc: 'Hanger shot blast: steel shot strips sand and scale from every face of the turning block.' },
  { id: 'hsb06', title: 'HSB06', segment: 2, next: 'Grinding',
    desc: 'Second blast pass cleans the pockets and core holes the first machine could not reach.' },
  { id: 'grinding', title: 'Grinding', segment: 3, next: 'Hanten MC',
    desc: 'Gate and riser stubs are ground flush so the block sits true on the machining fixtures.' },
  { id: 'hanten', title: 'Hanten MC', next: 'Final Process',
    desc: 'The block is turned over on the conveyor so the deck face comes up for finishing.' },
  { id: 'final', title: 'Final Process', next: 'QC Gate 1',
    desc: 'Last touch-up of edges and passages, then compressed air blows out any loose shot.' },
  { id: 'qc1', title: 'QC Gate 1', next: 'QC Gate 2',
    desc: 'Visual check of the outside faces against the limit samples for cracks and porosity.' },
  { id: 'qc2', title: 'QC Gate 2', next: 'Spray / Repair / NG',
    desc: 'Final judgement: OK goes on to Spray Booth, Repair to Line Repair, NG to the red NG pallet.' },
  { id: 'spray', title: 'Spray Booth', next: 'Junbiki',
    desc: 'Rust-preventive oil is sprayed over the OK block before it leaves the line.' },
  { id: 'junbiki', title: 'Junbiki', next: 'Truck',
    desc: 'OK blocks are staged in the rack in delivery order and loaded onto the truck.' },
  { id: 'lineRepair', title: 'Line Repair', next: 'QC Gate 2',
    desc: 'Repair blocks arrive by forklift, are reworked on the bench and return to QC Gate 2.' },
];

// Process name for a station id (undefined for an unknown one).
export const stationTitle = (id?: StationId): string | undefined => WORKFLOW_CARDS.find((c) => c.id === id)?.title;

export type StepState = 'stopped' | 'lineStop' | 'busy' | 'wait' | 'run';

// Live status of a process. During a line stop (`stop` = its station) that
// station shows 'lineStop' and every process after it waits; Line Repair only
// waits when the stop is at or before QC Gate 2, where it branches off.
export function stepState(
  card: WorkflowCard, running: boolean, busy: readonly boolean[], stop: StationId | null = null,
): StepState {
  if (!running) return 'stopped';
  if (card.id === stop) return 'lineStop';
  const at = (id: StationId) => WORKFLOW_CARDS.findIndex((c) => c.id === id);
  if (stop && at(card.id) > at(stop) && !(card.id === 'lineRepair' && at(stop) > at('qc2'))) return 'wait';
  if (card.segment === undefined) return 'run';
  return busy[card.segment] ? 'busy' : 'wait';
}

const STATUS: Record<StepState, string> = {
  stopped: 'Stopped', lineStop: 'Line stop', busy: 'Processing', wait: 'Waiting', run: 'Running',
};

// Label of the 30-day line stop count row (the board colours it by level).
export const STOPS_30D = 'Stops · 30 days';

// The data rows printed under a card's description.
export function cardRows(
  card: WorkflowCard,
  counts: Counts,
  running: boolean,
  busy: readonly boolean[],
  stop: StationId | null = null,
  // the latest line stop logged at this station, if any
  lastStop: LineStop | null = null,
  // line stops at this station in the last 30 days
  stopCount = 0,
): [string, string][] {
  const rows: [string, string][] = [];
  const state = stepState(card, running, busy, stop);
  if (card.segment !== undefined) rows.push(['Cycle time', `${segmentSeconds(SEGMENTS[card.segment]).toFixed(1)} s`]);
  if (card.segment !== undefined || (running && state !== 'run')) rows.push(['Status', STATUS[state]]);
  const total = counts.ok + counts.repair + counts.ng;
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : '0.0%');
  if (card.id === 'qc2') {
    rows.push(['Checked', `${total}`]);
    rows.push(['OK / Repair / NG', `${counts.ok} / ${counts.repair} / ${counts.ng}`]);
  }
  if (card.id === 'junbiki') rows.push(['OK', `${counts.ok} (${pct(counts.ok)})`]);
  if (card.id === 'lineRepair') rows.push(['Repair', `${counts.repair} (${pct(counts.repair)})`]);
  if (lastStop) rows.push(['Line stop', `${lastStop.problem} · ${stopLabel(lastStop)}`]);
  if (stopCount > 0) rows.push([STOPS_30D, `${stopCount}×`]);
  rows.push(['Next', card.next]);
  return rows;
}
