import type { StationId } from './finishingFlow';
import type { StationDetail } from '@/station-kit/react/StationCard';

export type { StationDetail };

// Detail card content per station: an isometric figure (built by
// station-kit/figure/stations/<id>.mjs, one SVG per theme), an optional 3D machine
// (station-kit/machine/stations/<id>-3d.html) and a short description.
// Placeholder copy for review; every station on the line and Line Repair have cards.
export const STATION_DETAILS: Partial<Record<StationId, StationDetail>> = {
  baritori: {
    title: 'Baritori',
    subtitle: 'Deburring',
    image: { light: '/stations/baritori-light.svg', dark: '/stations/baritori-dark.svg' },
    live: '/stations/baritori-live.html',
    play: '/stations/baritori-3d.html',
    description: [
      'The raw block stands on a cradle on the carriage at the mouth of the deburring booth, and the carriage runs it in through the timber portal before the lift door drops behind it.',
      'Inside, an air chisel on a gantry slide chips the casting flash off the parting line one face at a time, and the turntable turns the block a quarter turn between faces.',
      'The door lifts, the carriage brings the block back out, a kicker tips it over onto the roller conveyor, and it turns away along the line to HSB05.',
    ],
    specs: [
      { label: 'Cycle time', value: '12.5 s' },
      { label: 'Load', value: '1 block per cradle' },
      { label: 'Tool', value: 'Air chisel, 6 bar' },
      { label: 'Operator', value: '1 person' },
    ],
  },
  hsb05: {
    title: 'HSB05',
    subtitle: 'Hanger Shot Blast',
    image: { light: '/stations/hsb05-light.svg', dark: '/stations/hsb05-dark.svg' },
    live: '/stations/hsb05-live.html',
    play: '/stations/hsb05-3d.html',
    description: [
      'The monorail hoist picks the cast block off the in conveyor on a C-hook hanger and carries it through the left door into the octagonal blast chamber.',
      'With both doors shut, turbine wheels throw steel shot at the turning block to strip sand, scale and burrs from every face, while the dust collector draws the spent media out through the roof duct.',
      'When the cycle ends the doors open, the hoist carries the block out through the right door onto the out conveyor to HSB06, and comes back empty for the next one.',
    ],
    specs: [
      { label: 'Cycle time', value: '10.4 s' },
      { label: 'Load', value: '1 block per hanger' },
      { label: 'Media', value: 'Steel shot S330' },
      { label: 'Operator', value: '1 person' },
    ],
  },
  hsb06: {
    title: 'HSB06',
    subtitle: 'Rotary Table Shot Blast',
    image: { light: '/stations/hsb06-light.svg', dark: '/stations/hsb06-dark.svg' },
    live: '/stations/hsb06-live.html',
    play: '/stations/hsb06-3d.html',
    description: [
      'The operator steers a pillar jib manipulator that takes the block from the loading stand in through the left door and sets it on the rotary table.',
      'With both lift doors down, the table carries the block the long way round, past two blast wheels that throw steel shot into the pockets and core holes the first machine could not reach.',
      'At the right door the manipulator lifts the block out onto the output stand, on its way to Grinding.',
    ],
    specs: [
      { label: 'Cycle time', value: '5.2 s' },
      { label: 'Load', value: '1 block on the table' },
      { label: 'Media', value: 'Steel shot S330' },
      { label: 'Operator', value: '1 person' },
    ],
  },
  grinding: {
    title: 'Grinding',
    subtitle: 'Stub Grinding Booth',
    image: { light: '/stations/grinding-light.svg', dark: '/stations/grinding-dark.svg' },
    live: '/stations/grinding-live.html',
    play: '/stations/grinding-3d.html',
    description: [
      'The operator brings the blasted block over from HSB06 on a hanging manipulator and into an open booth with a large grinding wheel on each side wall.',
      'The block is pressed against the right wheel and then the left, so the gate and riser stubs left by casting are ground flush and the block sits true on the machining fixtures.',
      'A wooden screen and a mesh guard keep the sparks in the booth, and the block goes on to Hanten MC.',
    ],
    specs: [
      { label: 'Cycle time', value: '5.2 s' },
      { label: 'Load', value: '1 block' },
      { label: 'Wheel', value: 'Ø660 mm, 1,500 rpm' },
      { label: 'Operator', value: '1 person' },
    ],
  },
  hanten: {
    title: 'Hanten MC',
    subtitle: 'Block Turnover',
    image: { light: '/stations/hanten-light.svg', dark: '/stations/hanten-dark.svg' },
    live: '/stations/hanten-live.html',
    play: '/stations/hanten-3d.html',
    description: [
      'The block rolls in deck down under a mesh guard and stops inside a cage of two big rings that ride on support rollers.',
      'A clamp bar comes down on it and a geared motor turns the cage 180° about the line axis, so the deck face comes up for finishing; a holding brake keeps it there while the clamp lifts.',
      'The block rolls out deck up on the conveyor towards Final Process, and the empty cage turns back for the next one.',
    ],
    specs: [
      { label: 'Turn', value: '180° in about 1.6 s' },
      { label: 'Drive', value: '0.75 kW, 60 : 1' },
      { label: 'Dwell', value: 'about 1.3 s' },
      { label: 'Operator', value: 'None, automatic' },
    ],
  },
  final: {
    title: 'Final Process',
    subtitle: 'Touch-up & Air Blow-off',
    image: { light: '/stations/final-light.svg', dark: '/stations/final-dark.svg' },
    live: '/stations/final-live.html',
    play: '/stations/final-3d.html',
    description: [
      'The block stops in a cage in the line, inside an open booth with a light on the back wall and a hose rail overhead.',
      'The operator touches up edges with the tools from the green rack, then turns the block a quarter at a time with the red index lever and blows every face with an air gun, so no loose shot rides on to machining.',
      'The loose shot drops through the grating into the tray, and the clean block rolls on to QC Gate 1.',
    ],
    specs: [
      { label: 'Air', value: '6 bar, Ø2.5 mm nozzle' },
      { label: 'Nozzle distance', value: 'Within about 85 mm' },
      { label: 'Faces', value: '4, a quarter turn each' },
      { label: 'Operator', value: '1 person' },
    ],
  },
  qc1: {
    title: 'QC Gate 1',
    subtitle: 'Visual Inspection',
    image: { light: '/stations/qc1-light.svg', dark: '/stations/qc1-dark.svg' },
    play: '/stations/qc1-3d.html',
    description: [
      'The block stops on a turntable between two portal frames, under an LED light bar, and is turned a quarter at a time so every outside face comes round to the inspector.',
      'Each face is compared with the limit samples on the side table for cracks and porosity, under a task lamp that keeps at least 1,000 lux on the surface being judged.',
      'Checked blocks roll on to QC Gate 2 for the final judgement.',
    ],
    specs: [
      { label: 'Light on the face', value: '≥ 1,000 lux' },
      { label: 'Faces', value: '4, a quarter turn each' },
      { label: 'Reference', value: 'Limit samples' },
      { label: 'Operator', value: '1 inspector' },
    ],
  },
  qc2: {
    title: 'QC Gate 2',
    subtitle: 'Final Judgement',
    image: { light: '/stations/qc2-light.svg', dark: '/stations/qc2-dark.svg' },
    play: '/stations/qc2-3d.html',
    description: [
      'Each block turns once in a cage in the line for its last look, and the inspector gives it one of three judgements, recorded in this QC Gate app.',
      'OK blocks run straight on to the Spray Booth; a pusher sends Repair blocks onto a side transfer towards Line Repair, and NG blocks are tipped into the NG box. An andon stack shows each verdict.',
      'The share judged OK is the shift\'s first-pass yield, the number the dashboard tracks.',
    ],
    specs: [
      { label: 'Judgements', value: 'OK / Repair / NG' },
      { label: 'OK goes to', value: 'Spray Booth' },
      { label: 'Repair goes to', value: 'Line Repair' },
      { label: 'Operator', value: '1 inspector' },
    ],
  },
  spray: {
    title: 'Spray Booth',
    subtitle: 'Rust-preventive Oil',
    image: { light: '/stations/spray-light.svg', dark: '/stations/spray-dark.svg' },
    play: '/stations/spray-3d.html',
    description: [
      'The OK block comes in from QC Gate 2, turns the corner inside the booth and stops under the spray portal.',
      'Five nozzles fed by the pump mist rust-preventive oil onto the top, both long sides and both ends, so the bare machined iron leaves with a thin film on every face; the overspray drips back into the oil tank under the rollers.',
      'The oiled block rolls out through the side of the booth to Junbiki.',
    ],
    specs: [
      { label: 'Nozzles', value: '5, 12 mL/min each' },
      { label: 'Film', value: '≥ 1.5 µm on every face' },
      { label: 'Spray time', value: 'About 3 s' },
      { label: 'Operator', value: 'None, automatic' },
    ],
  },
  junbiki: {
    title: 'Junbiki',
    subtitle: 'Sequenced Staging',
    image: { light: '/stations/junbiki-light.svg', dark: '/stations/junbiki-dark.svg' },
    play: '/stations/junbiki-3d.html',
    description: [
      'The oiled block comes in from the Spray Booth alongside a three-level gravity flow rack and runs onto the carriage of a traversing lift.',
      'The lift travels along the rack front to the lane of the block\'s delivery lot, raises it to the top level and runs it in. The lane falls gently, so the block rolls on its own past braking rollers to the back of the queue.',
      'When a lot is complete it goes out from the far end of the lane onto the truck.',
    ],
    specs: [
      { label: 'Rack', value: '3 levels, lanes 5.9 m' },
      { label: 'Lane slope', value: 'About 2 %' },
      { label: 'Into the queue', value: 'About 0.3 m/s' },
      { label: 'Lift', value: '1.5 m up, travels to the lane' },
    ],
  },
  lineRepair: {
    title: 'Line Repair',
    subtitle: 'Rework Benches',
    image: { light: '/stations/repair-light.svg', dark: '/stations/repair-dark.svg' },
    play: '/stations/repair-3d.html',
    description: [
      'Blocks judged Repair at QC Gate 2 come across the factory road on a pallet and wait behind the yellow safety fence.',
      'Two benches against the wall rework them one at a time with a hand grinder and the bench vise, about 8 minutes a block.',
      'Each reworked block goes onto the out pallet, which goes back to QC Gate 2 to be judged again.',
    ],
    specs: [
      { label: 'Benches', value: '2, with a vise each' },
      { label: 'Rework', value: 'About 8 min a block' },
      { label: 'Back to QC Gate 2', value: 'About 22 min at 4 % Repair' },
      { label: 'Next', value: 'QC Gate 2' },
    ],
  },
};

export function stationDetail(id: string): StationDetail | null {
  return STATION_DETAILS[id as StationId] ?? null;
}
