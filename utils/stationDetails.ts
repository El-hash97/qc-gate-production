import type { StationId } from './finishingFlow';

// Detail card content per station: an isometric figure (built by
// scripts/stations/<id>.mjs, one SVG per theme) and a short description.
// Placeholder copy for review; only HSB05 has a card so far.
export interface StationDetail {
  title: string;
  subtitle: string;
  image: { light: string; dark: string };
  description: string[];
  specs: { label: string; value: string }[];
}

export const STATION_DETAILS: Partial<Record<StationId, StationDetail>> = {
  hsb05: {
    title: 'HSB05',
    subtitle: 'Hanger Shot Blast',
    image: { light: '/stations/hsb05-light.svg', dark: '/stations/hsb05-dark.svg' },
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
};

export function stationDetail(id: string): StationDetail | null {
  return STATION_DETAILS[id as StationId] ?? null;
}
