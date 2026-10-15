// Isometric figure of station QC Gate 2 (final judgement) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a turning cage in the roller line where the
// inspector gives the block its final look, the line running straight on for OK blocks
// (to the Spray Booth), a side transfer with a pusher that takes Repair blocks off the back
// of the line towards Line Repair, the NG box beside it, an andon stack light, and the
// judgement terminal at the operator side, where the QC Gate app records OK, Repair or NG.
//   node station-kit/figure/stations/qc2.mjs [outDir]   →   <outDir>/qc2-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as HSB05; the line runs along +x, the inspector stands at +y,
// the side transfer leaves the line towards -y)
const PAD = { x: -176, y: -150, w: 352, d: 236, r: 8 };
const CONV_Z = 31, CONV_Y = 22;
const IN = [-170, -30], OUTX = [30, 170];
const CAGE = { x0: -17, x1: 17, z: 40, r: 22, t: 3 };
const BLOCK = { w: 24, d: 19, h: 17 };
const SIDE = { x: 78, y0: -140, y1: -CONV_Y - 4 }; // side transfer: rollers along x, running to -y
const NGBOX = { x: 112, y: -128, w: 46, d: 40, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [-46, 30, 96], [-30, 60, 70]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const lerp = (a, b, t) => a + (b - a) * t;
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const seg = (p, q) => k.segment(p, q, P);
const arcX = (x, cy, cz, r, t0 = 0, t1 = 360, n = 72) => Array.from({ length: n + 1 }, (_, i) => {
  const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
  return [x, cy + Math.cos(t) * r, cz + Math.sin(t) * r];
});
const loop = (pts) => k.pathOf(pts.map(at), true);

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // walkway line on the operator side, and the hatched keep-out round the NG box
  out.push(L(k.lineOnTop([PAD.x + 5, 66], [PAD.x + PAD.w - 5, 66], 0, P), { tone: "faint" }));
  const keep = k.insetPlan(NGBOX, -8);
  out.push(L(k.planOutline(keep, 0, P), { tone: "lo" }));
  const hatch = [];
  for (let i = 1; i < 6; i++) hatch.push(k.lineOnTop([keep.x + i * 10, keep.y], [keep.x + i * 10 - 8, keep.y + 8], 0, P));
  out.push(L(hatch.join(""), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- roller conveyors --------------------------------------------------------
function conveyorBack([x0, x1]) {
  const out = [];
  for (const x of [x0 + 8, x1 - 8]) out.push(S(slab({ x: x - 2, y: -CONV_Y - 6, w: 4, d: 4, r: 0.4 }, 0, CONV_Z - 7, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x0, y: -CONV_Y - 4, w: x1 - x0, d: 4, r: 0.5 }, CONV_Z - 8, 9, 2, 0.4), { tone: "mid" }));
  for (let x = x0 + 3; x < x1 - 3; x += 7) out.push(S(slab({ x, y: -CONV_Y, w: 4.6, d: 2 * CONV_Y, r: 2.3 }, CONV_Z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

function conveyorFront([x0, x1]) {
  const out = [];
  for (const x of [x0 + 8, x1 - 8]) {
    out.push(S(slab({ x: x - 4, y: CONV_Y, w: 8, d: 8, r: 0.5 }, 0, 1.4, 2), { tone: "mid" }));
    out.push(S(slab({ x: x - 2, y: CONV_Y + 2, w: 4, d: 4, r: 0.4 }, 1.4, CONV_Z - 8.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: x0, y: CONV_Y, w: x1 - x0, d: 4, r: 0.5 }, CONV_Z - 8, 9, 2, 0.4), { tone: "mid" }));
  const n = Math.floor((x1 - x0 - 6) / 7);
  out.push(D(Array.from({ length: n }, (_, i) => at([x0 + 5.3 + i * 7, CONV_Y + 4, CONV_Z - 3])), { size: 0.35, tone: "lo" }));
  return out.join("");
}

// side transfer to the back: rails along y, rollers along x, a little lower than the line
function sideTransfer() {
  const { x, y0, y1 } = SIDE;
  const z = CONV_Z - 4;
  const out = [];
  for (const y of [y0 + 8, y1 - 10]) for (const dx of [-20, 20]) out.push(S(slab({ x: x + dx - 2, y: y - 2, w: 4, d: 4, r: 0.4 }, 0, z - 7, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x - 24, y: y0, w: 4, d: y1 - y0, r: 0.5 }, z - 8, 9, 2, 0.4), { tone: "mid" }));
  for (let y = y0 + 3; y < y1 - 3; y += 7) out.push(S(slab({ x: x - 20, y, w: 40, d: 4.6, r: 2.3 }, z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x + 20, y: y0, w: 4, d: y1 - y0, r: 0.5 }, z - 8, 9, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x - 24, y: y0 - 4, w: 48, d: 4, r: 0.6 }, z - 8, 14, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// pusher on the operator side of the line, square to the side transfer
function pusher() {
  const { x } = SIDE;
  const y = CONV_Y + 6;
  const z = CONV_Z + 8;
  const out = [S(slab({ x: x - 6, y, w: 12, d: 6, r: 0.6 }, 0, z + 6, 2, 0.4), { tone: "mid" })];
  out.push(S(slab({ x: x - 5, y: y + 6, w: 10, d: 34, r: 1.2 }, z - 5, 10, 3, 0.4), { tone: "mid", inner: L(seg([x - 5, y + 6, z + 2], [x - 5, y + 40, z + 2]), { tone: "faint" }) }));
  out.push(S(slab({ x: x - 1.6, y: y - 10, w: 3.2, d: 10, r: 1.6 }, z - 1.6, 3.2, 4), { tone: "hi", crease: "none" }));
  out.push(S(slab({ x: x - 12, y: y - 13, w: 24, d: 3, r: 0.6 }, z - 8, 16, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// the NG box: a steel bin with fork pockets, a rejected block lying in it
function ngBox() {
  const { x, y, w, d } = NGBOX;
  const out = [S(slab({ x, y, w, d, r: 1.5 }, 0, 30, 3, 0.6), { tone: "lo", inner: L(k.sideSeam(NGBOX, 10, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(NGBOX, 3), 30, P), { tone: "mid" }));
  for (const dx of [8, w - 16]) out.push(L(k.pathOf([at([x + dx, y + d, 2]), at([x + dx + 8, y + d, 2]), at([x + dx + 8, y + d, 7]), at([x + dx, y + d, 7])], true), { tone: "mid" }));
  out.push(S(slab({ x: x + 10, y: y + 10, w: 22, d: 17, r: 1 }, 22, 10, 2, 0.5), { tone: "mid" }));
  return out.join("");
}

// ---- the turning cage --------------------------------------------------------
function cageStands() {
  const out = [S(slab({ x: -30, y: -26, w: 60, d: 52, r: 1 }, 0, 5, 2, 0.5), { tone: "mid" })];
  for (const x of [CAGE.x0 - 6, CAGE.x1 + 6]) for (const y of [-14, 14]) {
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.6 }, 5, 7, 2), { tone: "mid" }));
    out.push(`<path class="q2-ring" d="${loop(arcX(x, y, 14, 4.5))}"/>`);
    out.push(L(loop(arcX(x, y, 14, 4.5)) + loop(arcX(x, y, 14, 1.4, 0, 360, 12)), { tone: "mid" }));
  }
  return out.join("");
}

function ring(x) {
  const { z, r, t } = CAGE;
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(arcX(xx, 0, z, r + t))}${loop(arcX(xx, 0, z, r))}"/>`;
  const out = [band(x, "q2-ring q2-back"), band(x + 3, "q2-ring")];
  out.push(L(loop(arcX(x + 3, 0, z, r + t)) + loop(arcX(x + 3, 0, z, r)), { tone: "mid" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at(arcX(x + 3, 0, z, r + t / 2, i * 45 + 22, i * 45 + 22, 1)[0])), { size: 0.45 }));
  return out.join("");
}

function tieBars(front) {
  const { x0, x1, z, r } = CAGE;
  const out = [];
  for (const t of front ? [-45, 225] : [45, 135]) {
    const [, y, zz] = arcX(0, 0, z, r - 1, t, t, 1)[0];
    out.push(S(slab({ x: x0 + 3, y: y - 1.4, w: x1 - x0 - 3, d: 2.8, r: 1.4 }, zz - 1.4, 2.8, 4), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}

function platform() {
  const out = [];
  for (const y of [-12, 8]) out.push(S(slab({ x: CAGE.x0 + 3, y, w: CAGE.x1 - CAGE.x0 - 3, d: 4, r: 0.4 }, CONV_Z - 4, 4, 2), { tone: "mid" }));
  return out.join("");
}

// ---- BC block, deck up ----------------------------------------------------------
function block(cx, cy = 0, z = CONV_Z, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const top = z + h;
  const ink = lit ? "lit" : "mid";
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, cy, 2.2, top, P, 24)).join(""), { tone: ink }));
  return out.join("");
}

// ---- andon stack light and the judgement terminal --------------------------------
function andon() {
  const [x, y] = [-46, 30];
  const out = [S(slab({ x: x - 5, y: y - 5, w: 10, d: 10, r: 0.6 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(k.cylinder(x, y, 1.4, 2, 66, P, 16, 0.3), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 3.4, 68, 3, P, 24, 0.4), { tone: "mid" }));
  // three lamps: OK at the bottom (lit), Repair, NG at the top
  const tones = ["hi", "mid", "mid"];
  for (let i = 0; i < 3; i++) {
    out.push(S(k.cylinder(x, y, 3, 71 + i * 7, 6.4, P, 24, 0.4), { tone: tones[i] }));
    out.push(L(k.ring(x, y, 3.05, 71 + i * 7 + 6.4, P, 24), { tone: "lo" }));
  }
  out.push(S(k.cylinder(x, y, 3.2, 92, 1.5, P, 24, 0.4), { tone: "mid" }));
  return out.join("");
}

function terminal() {
  const [x, y] = [-26, 58];
  const out = [S(slab({ x: x - 7, y: y - 7, w: 14, d: 14, r: 0.8 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 2, 52, 2, 0.3), { tone: "mid" }));
  // the tablet, tilted towards the inspector: a chart on the screen and the three judgement buttons
  const z0 = 54, z1 = 70, y0 = y - 4, y1 = y + 4;
  const pt = (u, v) => [x - 12 + u * 24, lerp(y0, y1, v), lerp(z1, z0, v)];
  const corners = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
  out.push(`<path class="q2-tab" d="${loop(corners)}"/>`);
  out.push(L(loop(corners), { tone: "mid" }));
  out.push(L(loop([pt(0.08, 0.1), pt(0.92, 0.1), pt(0.92, 0.5), pt(0.08, 0.5)]), { tone: "lo" }));
  out.push(L([0.2, 0.32, 0.44].map((u, i) => seg(pt(u, 0.46), pt(u, 0.34 - i * 0.08))).join(""), { tone: "mid" }));
  const button = (u) => loop(Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const [px, py, pz] = pt(u, 0.76);
    return [px + Math.cos(a) * 3, py + Math.sin(a) * 0.9, pz - Math.sin(a) * 1.8];
  }));
  out.push(L([0.22, 0.5, 0.78].map(button).join(""), { tone: "lo" }));
  out.push(D([pt(0.22, 0.76), pt(0.5, 0.76), pt(0.78, 0.76)].map(at), { size: 1.2, tone: "mid" }));
  return out.join("");
}

const body = [
  floor(),
  ngBox(),
  sideTransfer(),
  block(SIDE.x, -100, CONV_Z - 4),
  conveyorBack(IN),
  block(-120),
  conveyorFront(IN),
  cageStands(),
  ring(CAGE.x0),
  tieBars(false),
  platform(),
  block(0, 0, CONV_Z, { lit: true }),
  tieBars(true),
  ring(CAGE.x1),
  conveyorBack(OUTX),
  block(140),
  conveyorFront(OUTX),
  pusher(),
  andon(),
  terminal(),
];

const STYLE = `<style>
.iso[data-theme="light"] .q2-ring{fill:#e9e8e4}.iso[data-theme="light"] .q2-back{fill:#d4d2cc}.iso[data-theme="light"] .q2-tab{fill:#f6f6f4}
.iso[data-theme="dark"] .q2-ring{fill:#202020}.iso[data-theme="dark"] .q2-back{fill:#141414}.iso[data-theme="dark"] .q2-tab{fill:#0c0c0c}
.q2-ring,.q2-tab{stroke:none}
</style>`;

const LABEL =
  "Station QC Gate 2, final judgement: the BC block turns in a cage in the line for its last look. OK blocks run straight on towards the Spray Booth, a pusher sends Repair blocks onto a side transfer towards Line Repair, and NG blocks go to the NG box. An andon stack light shows the result, and the inspector records it on the judgement terminal.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `qc2-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `qc2-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
