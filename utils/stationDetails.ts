import type { StationId } from './finishingFlow';
import type { StationDetail } from '@/station-kit/react/StationCard';

export type { StationDetail };

// Detail card content per station: an isometric figure (built by
// station-kit/figure/stations/<id>.mjs, one SVG per theme), an optional 3D machine
// (station-kit/machine/stations/<id>-3d.html) and a short description.
// Descriptions come from public/KETERANGAN POST FINISHING.txt (Line Repair
// is not in it and keeps its placeholder copy).
export const STATION_DETAILS: Partial<Record<StationId, StationDetail>> = {
  baritori: {
    title: 'Baritori',
    subtitle: 'Deburring',
    image: { light: '/stations/baritori-light.svg', dark: '/stations/baritori-dark.svg' },
    live: '/stations/baritori-live.html',
    play: '/stations/baritori-3d.html',
    video: '/videos/baritori.mp4',
    description: [
      'Post yang berfungsi untuk cleaning sisa pasir block cylinder dari proses Barashi (Moulding), dengan cara digetarkan pada pressure tertentu.',
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
    video: '/videos/hsb05.mp4',
    description: [
      'Post yang berfungsi untuk cleaning sisa pasir dari proses Baritori dengan cara di-shot blast menggunakan steel ball.',
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
    video: '/videos/hsb06.mp4',
    description: [
      'Post yang berfungsi untuk cleaning sisa pasir dari proses Baritori dengan cara di-shot blast menggunakan steel ball.',
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
    video: '/videos/grinding.mp4',
    description: [
      'Post yang berfungsi untuk menggerinda sisa bari dari proses Baritori dengan sistem auto.',
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
      'Post yang berfungsi untuk mengeluarkan sisa steel ball yang masuk dari proses HSB dengan cara diputar 180 derajat sebanyak 3x.',
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
    video: '/videos/final-proses.mp4',
    description: [
      'Post yang berfungsi untuk cleaning bari area Cope dan Oilpan, juga melakukan cek keseluruhan sebelum masuk ke Quality Gate.',
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
    live: '/stations/qc1-live.html',
    play: '/stations/qc1-3d.html',
    video: '/videos/qc-gate1.mp4',
    description: [
      'Post yang berfungsi melakukan pengecekan surface luar (Front, Drag, Rear, Cope).',
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
    live: '/stations/qc2-live.html',
    play: '/stations/qc2-3d.html',
    video: '/videos/qc-gate2.mp4',
    description: [
      'Post yang berfungsi untuk melakukan pengecekan area dalam (Headment, lubang bore, Oilpan) dan memastikan produk bebas dari defect untuk dikirim ke next proses (final judgement).',
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
    video: '/videos/spray-booth.mp4',
    description: [
      'Post yang berfungsi untuk melakukan pengecatan terhadap block cylinder yang berguna untuk mencegah area surface block cylinder terkena karat.',
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
      'Post yang berfungsi untuk melakukan delivery hasil block cylinder yang "OK" ke dalam Junbiki (store PPC) untuk siap kirim ke next proses (Machining Sunter 1).',
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
