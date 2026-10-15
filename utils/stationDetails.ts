import type { StationId } from './finishingFlow';
import type { StationDetail } from '@/station-kit/react/StationCard';

export type { StationDetail };

// Detail card content per station: an isometric figure (built by
// station-kit/figure/stations/<id>.mjs, one SVG per theme), an optional 3D machine
// (station-kit/machine/stations/<id>-3d.html) and a short description.
// Placeholder copy for review; Baritori, HSB05, HSB06 and Grinding have cards so far.
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
};

export function stationDetail(id: string): StationDetail | null {
  return STATION_DETAILS[id as StationId] ?? null;
}
