import type { StationId } from './finishingFlow';
import type { StationDetail } from '@/station-kit/react/StationCard';

export type { StationDetail };

// Detail card content per station: an isometric figure (built by
// station-kit/figure/stations/<id>.mjs, one SVG per theme), an optional 3D machine
// (station-kit/machine/stations/<id>-3d.html) and a short description.
// Placeholder copy for review; Baritori to QC Gate 1 have cards so far.
export const STATION_DETAILS: Partial<Record<StationId, StationDetail>> = {
  baritori: {
    title: 'Baritori',
    subtitle: 'Deburring',
    image: { light: '/stations/baritori-light.svg', dark: '/stations/baritori-dark.svg' },
    play: '/stations/baritori-3d.html',
    description: [
      'The cast block sits on a cradle on the slide table, and a pusher cylinder drives the carriage through the timber portal while the guard plate drops behind it.',
      'An air chisel hung on a spring balancer chips the casting flash off the parting line one face at a time, and the cradle turns the block a quarter turn between faces.',
      'When all four faces are clean the guard lifts and the block rolls on along the conveyor to HSB05.',
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
    play: '/stations/hsb05-3d.html',
    description: [
      'The monorail hoist picks the cast block off the roller conveyor on a C-hook hanger and carries it into the octagonal blast chamber.',
      'Inside, turbine wheels throw steel shot at the turning block to strip sand, scale and burrs from every face, while the dust collector draws the spent media out through the roof duct.',
      'When the cycle ends the doors open, the hoist brings the block back out and hands it on to HSB06.',
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
    play: '/stations/hanten-3d.html',
    description: [
      'The block rolls in deck down under a mesh guard and stops inside a cage of two big rings that ride on support rollers.',
      'A clamp bar comes down on it and a geared motor turns the cage 180° about the line axis, so the deck face comes up for finishing; a holding brake keeps it there while the clamp lifts.',
      'The block rolls out deck up on the conveyor towards Final Proses, and the empty cage turns back for the next one.',
    ],
    specs: [
      { label: 'Turn', value: '180° in about 1.6 s' },
      { label: 'Drive', value: '0.75 kW, 60 : 1' },
      { label: 'Dwell', value: 'about 1.3 s' },
      { label: 'Operator', value: 'None, automatic' },
    ],
  },
  final: {
    title: 'Final Proses',
    subtitle: 'Touch-up & Air Blow-off',
    image: { light: '/stations/final-light.svg', dark: '/stations/final-dark.svg' },
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
};

export function stationDetail(id: string): StationDetail | null {
  return STATION_DETAILS[id as StationId] ?? null;
}
