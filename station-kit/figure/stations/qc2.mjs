// Isometric figure of station QC Gate 2 (final judgement) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a turning cage in the roller line where the
// inspector gives the block its final look, the line running straight on for OK blocks
// (to the Spray Booth), a side transfer with a pusher that takes Repair blocks off the back
// of the line towards Line Repair, the NG box beside it, an andon stack light, and the
// judgement terminal at the operator side, where the QC Gate app records OK, Repair or NG.
// The live page runs the cycle of qc2-3d.html: roll in, a full turn of the cage for the last look, the
// verdict from the same statistics (true defect rate, catch rate, NG share, seeded so the shift plays out
// the same way), then the route: OK rolls on, Repair is pushed onto the side transfer, NG rides it to the
// flap and drops into the NG box. The andon and the terminal show the verdict.
//   node station-kit/figure/stations/qc2.mjs [outDir]
//     →   <outDir>/qc2-{light,dark}.svg and <outDir>/qc2-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/qc2.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
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
const NGBOX = { x: 108, y: -136, w: 58, d: 48, r: 1.5 }; // open pallet box; rim just under the transfer
const NG_PAL = 7, NG_RIM = 22, NG_T = 2;

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

// the NG box: a red pallet box, open on top, on a pallet with fork pockets, NG blocks lying in it.
// Back walls first, then the floor and the blocks, then the front walls, so the recess reads.
function ngBox(inner = "") {
  const { x, y, w, d } = NGBOX;
  const wall = (plan) => S(slab({ ...plan, r: 0.4 }, NG_PAL, NG_RIM - NG_PAL, 2, 0.3), { tone: "lo" });
  const out = [S(slab({ x, y, w, d, r: 1 }, 0, NG_PAL, 2, 0.4), { tone: "mid" })];
  const pocket = (a, b) => L(k.pathOf([at(a), at([...b.slice(0, 2), a[2]]), at(b), at([...a.slice(0, 2), b[2]])], true), { tone: "lo" });
  for (const dx of [8, w - 22]) out.push(pocket([x + dx, y + d, 1.5], [x + dx + 14, y + d, 5]));
  for (const dy of [7, d - 19]) out.push(pocket([x + w, y + dy, 1.5], [x + w, y + dy + 12, 5]));
  out.push(wall({ x, y, w, d: NG_T }), wall({ x, y: y + NG_T, w: NG_T, d: d - NG_T }));
  out.push(S(slab({ x: x + NG_T, y: y + NG_T, w: w - 2 * NG_T, d: d - 2 * NG_T, r: 0.3 }, NG_PAL, 1, 1, 0.2), { tone: "lo" }));
  out.push(block(x + w - 17, y + 14, NG_PAL + 1), block(x + w - 17, y + 36, NG_PAL + 1), inner);
  out.push(wall({ x: x + w - NG_T, y: y + NG_T, w: NG_T, d: d - 2 * NG_T }), wall({ x, y: y + d - NG_T, w, d: NG_T }));
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
function andon(lit = 0) {
  const [x, y] = [-46, 30];
  const out = [S(slab({ x: x - 5, y: y - 5, w: 10, d: 10, r: 0.6 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(k.cylinder(x, y, 1.4, 2, 66, P, 16, 0.3), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 3.4, 68, 3, P, 24, 0.4), { tone: "mid" }));
  // three lamps: OK at the bottom (lit), Repair, NG at the top
  const tones = [0, 1, 2].map((i) => (i === lit ? "hi" : "mid"));
  for (let i = 0; i < 3; i++) {
    out.push(S(k.cylinder(x, y, 3, 71 + i * 7, 6.4, P, 24, 0.4), { tone: tones[i] }));
    out.push(L(k.ring(x, y, 3.05, 71 + i * 7 + 6.4, P, 24), { tone: "lo" }));
  }
  out.push(S(k.cylinder(x, y, 3.2, 92, 1.5, P, 24, 0.4), { tone: "mid" }));
  return out.join("");
}

function terminal(lit = -1) {
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
  if (lit >= 0) out.push(D([at(pt([0.22, 0.5, 0.78][lit], 0.76))], { size: 1.8, tone: "lit" }));
  return out.join("");
}

const body = [
  floor(),
  sideTransfer(),
  block(SIDE.x, -100, CONV_Z - 4),
  ngBox(),
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

// =============================================================================
// The cycle, as in qc2-3d.html. The model (q2Step) and the moving pieces (q2Scene and the builders it
// calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the kit inlined.
// The still above is the approved drawing; the live page follows one block at a time.
// =============================================================================
const M = {
  BLOCK,
  CAGE,
  CONV_Z,
  SIDE,
  NGBOX,
  NG_FLOOR: NG_PAL + 1,
  SIDE_Z: CONV_Z - 4,
  OFF_Y: -CONV_Y - 6, // block centre once it is pushed off the line onto the transfer
  IN_X: -120,
  OUT_X: 140,
  PUSH_Y: CONV_Y + 6,
  DUR: { "roll in": 1.2, inspect: 2.4, verdict: 0.7, "roll on": 1.4, push: 0.8, transfer: 1.4, tip: 0.9, next: 0.4 },
  Z95: 1.96,
  NG_SHARE: 0.3,
  CATCH: 0.98,
  SEED: 20261046,
};

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function q2Rnd(st) {
  st.seed = (st.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(st.seed ^ (st.seed >>> 15), 1 | st.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function q2Judge(st) {
  if (q2Rnd(st) >= st.rate / 100) return "OK";
  if (q2Rnd(st) < M.CATCH) return q2Rnd(st) < M.NG_SHARE ? "NG" : "Repair";
  st.esc++; // a defect nobody caught: it goes on as OK
  return "OK";
}

function q2Record(st, v) {
  st.n++;
  if (v === "OK") st.ok++;
  else if (v === "Repair") st.rep++;
  else st.ng++;
  const n = st.n, ph = st.ok / n, z2 = M.Z95 * M.Z95;
  const c = (ph + z2 / (2 * n)) / (1 + z2 / n);
  const h = (M.Z95 * Math.sqrt((ph * (1 - ph)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  st.fpy = ph;
  st.lo = c - h;
  st.hi = c + h;
}

// the shift so far: 240 blocks were judged before we started watching, as the 3D page
function q2State() {
  const st = { phase: "roll in", pt: 0, verdict: "OK", rate: 6, seed: M.SEED, n: 0, ok: 0, rep: 0, ng: 0, esc: 0, fpy: 1, lo: 0, hi: 1 };
  for (let i = 0; i < 240; i++) q2Record(st, q2Judge(st));
  return st;
}

function q2Step(st, dt) {
  st.pt += dt;
  if (st.pt < M.DUR[st.phase]) return;
  const go = (ph) => {
    st.phase = ph;
    st.pt = 0;
  };
  if (st.phase === "roll in") go("inspect");
  else if (st.phase === "inspect") {
    st.verdict = q2Judge(st);
    q2Record(st, st.verdict);
    go("verdict");
  } else if (st.phase === "verdict") go(st.verdict === "OK" ? "roll on" : "push");
  else if (st.phase === "push") go("transfer");
  else if (st.phase === "transfer") go(st.verdict === "NG" ? "tip" : "next");
  else go(st.phase === "next" ? "roll in" : "next");
}

// review: put the cycle at a phase with a given verdict
function q2Go(st, phase, verdict) {
  st.phase = phase;
  st.pt = 0;
  if (verdict) st.verdict = verdict;
}

// a box: centre c, half sizes hs, turned by the 3x3 matrix R (rows); shaded like the kit's solids
function q2Box(c, hs, R, style, marks) {
  const W = ([x, y, z]) => [c[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z, c[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z, c[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z];
  const { sinA, cosA, sinE, cosE } = k.cameraOf(P);
  const T = [cosA * cosE, sinA * cosE, sinE];
  const corner = (i) => [((i & 1) * 2 - 1) * hs[0], (((i >> 1) & 1) * 2 - 1) * hs[1], (((i >> 2) & 1) * 2 - 1) * hs[2]];
  const pts = Array.from({ length: 8 }, (_, i) => k.iso(W(corner(i)), P));
  const faces = [
    { n: [1, 0, 0], v: [1, 3, 7, 5] },
    { n: [-1, 0, 0], v: [0, 4, 6, 2] },
    { n: [0, 1, 0], v: [2, 6, 7, 3] },
    { n: [0, -1, 0], v: [0, 1, 5, 4] },
    { n: [0, 0, 1], v: [4, 5, 7, 6] },
    { n: [0, 0, -1], v: [0, 2, 3, 1] },
  ].map((f) => {
    const w = [0, 1, 2].map((r) => R[r][0] * f.n[0] + R[r][1] * f.n[1] + R[r][2] * f.n[2]);
    return { ...f, w, on: w[0] * T[0] + w[1] * T[1] + w[2] * T[2] > 1e-6 };
  });
  const poly = (v) => k.pathOf(v.map((i) => pts[i]), true);
  const shades = ["", "", "", ""];
  let top = "";
  for (const f of faces) {
    if (!f.on) continue;
    if (f.w[2] > 0.6) top += poly(f.v);
    else {
      const len = Math.hypot(f.w[0], f.w[1]) || 1;
      const lit = ((f.w[0] / len) * -sinA + (f.w[1] / len) * cosA + 1) / 2;
      shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))] += poly(f.v);
    }
  }
  const visible = faces.filter((f) => f.on);
  let crease = "";
  for (let i = 0; i < visible.length; i++)
    for (let j = i + 1; j < visible.length; j++) {
      const shared = visible[i].v.filter((v) => visible[j].v.includes(v));
      if (shared.length === 2) crease += k.pathOf(shared.map((v) => pts[v]));
    }
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out.at(-2), out.at(-1), q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  const fill = k.pathOf([...half(sorted), ...half([...sorted].reverse())], true);
  const on = (n) => faces.find((f) => f.n.join() === n.join()).on;
  const inner = marks ? marks(W, on) : "";
  return k.solidSvg({ fill, shades, top, outline: fill, crease }, { ...style, inner: (style.inner || "") + inner });
}

const q2Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const q2Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];

// the BC block, deck up: centre c, turned by R; the four bores on the deck while we can see it
function q2Block(c, R, alpha) {
  if (alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const svg = q2Box(c, [w / 2, d / 2, h / 2], R, { tone: "hi", crease: "lo", lit: true }, (W, on) => {
    if (!on([0, 0, 1])) return "";
    const rings = [0, 1, 2, 3].map((i) => k.pathOf(Array.from({ length: 24 }, (_, j) => {
      const a = (j / 24) * 2 * Math.PI;
      return k.iso(W([-w / 2 + 4 + i * 5.33 + 2.2 * Math.cos(a), 2.2 * Math.sin(a), h / 2]), P);
    }), true));
    return k.lineSvg(rings.join(""), { tone: "lit" });
  });
  return alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(3)}">${svg}</g>`;
}

function q2Arc(x, r, t0, t1, n) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
    return k.iso([x, Math.cos(t) * r, M.CAGE.z + Math.sin(t) * r], P);
  });
}

// a ring of the cage and its face bolts turned with it (deg in degrees)
function q2Ring(x, deg) {
  const { r, t } = M.CAGE;
  const loop = (xx, rr) => k.pathOf(q2Arc(xx, rr, 0, 360, 72), true);
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(xx, r + t)}${loop(xx, r)}"/>`;
  const out = [band(x, "q2-ring q2-back"), band(x + 3, "q2-ring")];
  out.push(k.lineSvg(loop(x + 3, r + t) + loop(x + 3, r), { tone: "mid" }));
  out.push(k.dotsSvg(Array.from({ length: 8 }, (_, i) => q2Arc(x + 3, r + t / 2, i * 45 + 22 + deg, i * 45 + 22 + deg, 1)[0]), { size: 0.45 }));
  return out.join("");
}

// the tie bars: the upper ones behind the block, the lower ones in front of it, as in the still
function q2Bars(front, deg) {
  const { x0, x1, z, r } = M.CAGE;
  const out = [];
  for (const t0 of [45, 135, -45, 225]) {
    const t = ((t0 + deg) * Math.PI) / 180;
    if (Math.sin(t) > 0 === front) continue;
    const y = Math.cos(t) * (r - 1);
    const zz = z + Math.sin(t) * (r - 1);
    out.push(k.solidSvg(k.slabOf({ x: x0 + 3, y: y - 1.4, w: x1 - x0 - 3, d: 2.8, r: 1.4 }, zz - 1.4, 2.8, P, 4, 0.5), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}

// the platform rails and the block in the cage, turning together about the cage axis; sorted by depth
function q2Core(th, block) {
  const { x0, x1, z } = M.CAGE;
  const xm = (x0 + 3 + x1) / 2;
  const R = q2Rx(th);
  const at = (p) => [p[0], p[1] * Math.cos(th) - (p[2] - z) * Math.sin(th), z + p[1] * Math.sin(th) + (p[2] - z) * Math.cos(th)];
  const items = [-10, 10].map((y) => {
    const c = at([xm, y, M.CONV_Z - 2]);
    return { d: k.depthOf(c, P), svg: q2Box(c, [(x1 - x0 - 3) / 2, 2, 2], R, { tone: "mid" }) };
  });
  if (block) items.push({ d: k.depthOf([0, 0, M.CAGE.z], P), svg: block });
  return items.sort((a, b) => a.d - b.d).map((i) => i.svg).join("");
}

// the pusher, its rod run out by `reach` across the line
function q2Pusher(reach) {
  const x = M.SIDE.x;
  const y = M.PUSH_Y;
  const z = M.CONV_Z + 8;
  const sl = (plan, z0, h, steps, bevel) => k.slabOf(plan, z0, h, P, steps, bevel);
  const out = [k.solidSvg(sl({ x: x - 6, y, w: 12, d: 6, r: 0.6 }, 0, z + 6, 2, 0.4), { tone: "mid" })];
  out.push(k.solidSvg(sl({ x: x - 5, y: y + 6, w: 10, d: 34, r: 1.2 }, z - 5, 10, 3, 0.4), { tone: "mid", inner: k.lineSvg(k.segment([x - 5, y + 6, z + 2], [x - 5, y + 40, z + 2], P), { tone: "faint" }) }));
  out.push(k.solidSvg(sl({ x: x - 1.6, y: y - 10 - reach, w: 3.2, d: 10 + reach, r: 1.6 }, z - 1.6, 3.2, 4, 0.5), { tone: "hi", crease: "none" }));
  out.push(k.solidSvg(sl({ x: x - 12, y: y - 13 - reach, w: 24, d: 3, r: 0.6 }, z - 8, 16, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// everything that moves, for a state
function q2Scene(st) {
  const { phase, verdict } = st;
  const u = Math.min(1, st.pt / M.DUR[phase]);
  const e = u * u * (3 - 2 * u);
  const cz = M.CONV_Z + M.BLOCK.h / 2;
  const sideCz = M.SIDE_Z + M.BLOCK.h / 2;
  const th = phase === "inspect" ? e * Math.PI * 2 : 0;
  let c = [0, 0, cz], R = q2Rx(0), alpha = 1, where = "cage";
  if (phase === "roll in") {
    c = [M.IN_X * (1 - e), 0, cz];
    alpha = smooth01(0, 0.25, u);
  } else if (phase === "inspect") R = q2Rx(th);
  else if (phase === "roll on") {
    c = [M.OUT_X * e, 0, cz];
    alpha = 1 - smooth01(0.75, 1, u);
  } else if (phase === "push") {
    const v = smooth01(0.5, 1, u);
    c = [M.SIDE.x * smooth01(0, 0.5, u), M.OFF_Y * v, cz + (sideCz - cz) * v];
  } else if (phase === "transfer") {
    const to = verdict === "NG" ? M.NGBOX.y + M.NGBOX.d / 2 : M.SIDE.y0 + 15;
    c = [M.SIDE.x, M.OFF_Y + (to - M.OFF_Y) * e, sideCz];
    if (verdict === "Repair") alpha = 1 - smooth01(0.7, 1, u);
  } else if (phase === "tip") {
    // it slides off the flap, tilting, and drops flat onto the floor of the box beside the others
    const y = M.NGBOX.y + M.NGBOX.d / 2;
    c = [M.SIDE.x + smooth01(0, 0.6, u) * 37, y, sideCz + (M.NG_FLOOR + M.BLOCK.h / 2 - sideCz) * smooth01(0.35, 0.8, u)];
    R = q2Ry(smooth01(0.1, 0.45, u) * 0.6 * (1 - smooth01(0.55, 0.8, u)));
    alpha = 1 - smooth01(0.9, 1, u);
  } else if (phase === "next") alpha = 0;
  if (phase === "tip" && c[0] > M.NGBOX.x - 4) where = "ng";
  else if (c[1] < -M.BLOCK.d / 2 - 22) where = "side";
  else if (c[0] < -30) where = "in";
  else if (c[0] > 30) where = "out";
  const block = q2Block(c, R, alpha);
  const reach = phase === "push" ? smooth01(0.45, 1, u) * 30 : phase === "transfer" ? (1 - e) * 30 : 0;
  const lit = ["verdict", "roll on", "push", "transfer", "tip"].includes(phase) ? (verdict === "OK" ? 0 : verdict === "Repair" ? 1 : 2) : -1;
  const deg = (th * 180) / Math.PI;
  return {
    phase,
    lit,
    blockIn: where === "in" ? block : "",
    blockOut: where === "out" ? block : "",
    side: where === "side" ? block : "",
    ng: where === "ng" ? block : "",
    ring0: q2Ring(M.CAGE.x0, deg),
    barsBack: q2Bars(false, deg),
    core: q2Core(th, where === "cage" ? block : ""),
    barsFront: q2Bars(true, deg),
    ring1: q2Ring(M.CAGE.x1, deg),
    pusher: q2Pusher(reach),
  };
}

function q2Say(st) {
  const lit = ["verdict", "roll on", "push", "transfer", "tip"].includes(st.phase);
  if (st.phase === "inspect") return "last look";
  if (!lit) return st.phase;
  return st.verdict === "OK" ? "OK: on to the Spray Booth" : st.verdict === "Repair" ? "Repair: off to Line Repair" : "NG: into the NG box";
}

function q2Readout(st) {
  return `${q2Say(st)} · first-pass yield ${(st.fpy * 100).toFixed(1)}%`;
}

function q2Numbers(st) {
  return `95% interval ${(st.lo * 100).toFixed(1)}–${(st.hi * 100).toFixed(1)}% over ${st.n} blocks · ${st.ok} OK, ${st.rep} Repair, ${st.ng} NG · true yield ${(100 - st.rate).toFixed(1)}%${st.esc ? ` · ${st.esc} escaped` : ""}`;
}

// ---- self-check: the shift starts where the 3D page's does, and every route turns up
{
  const st = q2State();
  if (Math.abs(st.fpy * 100 - 94.2) > 0.05) throw new Error(`the shift should start at 94.2% OK, not ${(st.fpy * 100).toFixed(1)}%`);
  const seen = new Set();
  for (let i = 0; i < 60 * 600 && seen.size < 3; i++) {
    q2Step(st, 1 / 60);
    if (st.phase === "verdict") seen.add(st.verdict);
  }
  if (seen.size < 3) throw new Error(`only ${[...seen].join(", ")} turned up in 10 minutes`);
  console.log(`cycle check passed (shift at 94.2% after 240 blocks; OK, Repair and NG all routed)`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    sideTransfer(),
    slot("side", f.side),
    ngBox(slot("ng", f.ng)),
    conveyorBack(IN),
    slot("blockIn", f.blockIn),
    conveyorFront(IN),
    cageStands(),
    slot("ring0", f.ring0),
    slot("barsBack", f.barsBack),
    slot("core", f.core),
    slot("barsFront", f.barsFront),
    slot("ring1", f.ring1),
    conveyorBack(OUTX),
    slot("blockOut", f.blockOut),
    conveyorFront(OUTX),
    slot("pusher", f.pusher),
    slot("andon", andon(f.lit)),
    slot("terminal", terminal(f.lit)),
  ];
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `qc2-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `qc2-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = q2State();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...liveBody(q2Scene(st))] });
  // the andon and the terminal are drawn by the build for each verdict; the page swaps them in
  const lights = [-1, 0, 1, 2].map((i) => [andon(i), terminal(i)]);
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Show a route"><button type="button" data-go="OK">OK</button><button type="button" data-go="Repair">Repair</button><button type="button" data-go="NG">NG</button></div>
<label class="bari-p">True defect rate <input type="range" min="0" max="20" step="0.5" value="6" aria-label="True defect rate, percent"><output>6.0 %</output></label>
<div class="bari-num" data-numbers>${q2Numbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "QC Gate 2",
    title: "Final judgement cycle",
    hint: "Click to pause",
    readout: q2Readout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="QC Gate 2 cycle, click or press space to pause">${svg}</div>`,
  });
  const css = `<style>
/* fills whatever box it is shown in (the station card's iframe): the drawing takes the room the controls leave */
html,body{height:100%}
body{background:var(--anatomy-card);display:flex;flex-direction:column}
.iso-page{flex:1;min-height:0;width:100%;margin:0;padding:0;display:flex;flex-direction:column}
.iso-figure{flex:1;min-height:0;margin:0;display:flex;flex-direction:column}
.iso-plate{flex:1;min-height:0;display:flex;padding:28px 10px 24px;box-shadow:none}
.iso-plate-corners{inset:10px 12px}
.iso-stage{flex:1;min-height:0;display:flex;outline:none;cursor:pointer}
.iso-stage .iso-svg{display:block;width:100%;height:100%}
.bari-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 12px 12px;font:12px/1.3 ui-sans-serif,system-ui,sans-serif;color:var(--anatomy-text)}
.bari-ctl button{font:inherit;color:inherit;background:transparent;border:1px solid var(--anatomy-mid);border-radius:999px;padding:4px 10px;cursor:pointer}
.bari-ctl button:hover{color:var(--anatomy-strong);border-color:var(--anatomy-text)}
.bari-ctl button[aria-current="step"]{color:var(--anatomy-card);background:var(--anatomy-strong);border-color:var(--anatomy-strong)}
.bari-play{width:30px;padding:4px 0!important}
.bari-steps{display:flex;flex-wrap:wrap;gap:4px}
.bari-p{display:flex;align-items:center;gap:6px;margin-left:auto}
.bari-p input{width:110px;accent-color:var(--anatomy-strong)}
.bari-p output{min-width:48px;font-variant-numeric:tabular-nums}
.bari-num{flex-basis:100%;color:var(--anatomy-muted);font:11px/1.3 var(--anatomy-mono);font-variant-numeric:tabular-nums}
@media (max-width:480px){
.iso-plate{padding:24px 4px 20px}
.iso-plate-corner[data-corner="hint"],.bari-num{display:none}
.bari-ctl{gap:4px 6px;padding:6px 8px 8px;font-size:11px}
.bari-ctl button{padding:3px 7px}
.bari-p{margin-left:0}
.bari-p input{width:84px}
}
</style>`;
  const fns = [smooth01, q2Rnd, q2Judge, q2Record, q2State, q2Step, q2Go, q2Box, q2Rx, q2Ry, q2Block, q2Arc, q2Ring, q2Bars, q2Core, q2Pusher, q2Scene, q2Say, q2Readout, q2Numbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, cameraOf, depthOf, pathOf, segment, slabOf, solidSvg, lineSvg, dotsSvg };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
const LIGHTS = ${JSON.stringify(lights)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slots = ["side", "ng", "blockIn", "ring0", "barsBack", "core", "barsFront", "ring1", "blockOut", "pusher", "andon", "terminal"].reduce((o, n) => ((o[n] = svg.querySelector('[data-slot="' + n + '"]')), o), {});
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const routeBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = q2State();
if (still.matches) { q2Go(st, "inspect"); st.pt = 0.6; }
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = q2Scene(st);
  f.andon = LIGHTS[f.lit + 1][0];
  f.terminal = LIGHTS[f.lit + 1][1];
  for (const n in slots) html(slots[n], f[n]);
  const text = q2Readout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = q2Numbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of routeBtns) if (f.lit >= 0 && b.dataset.go === st.verdict) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  q2Step(st, dt);
  draw();
  frame = playing && visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && playing && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const setPlaying = (on) => {
  playing = on;
  playBtn.textContent = on ? "❚❚" : "▶";
  playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
  if (on) run(); else { cancelAnimationFrame(frame); frame = 0; }
};
playBtn.addEventListener("click", () => setPlaying(!playing));
stage.addEventListener("click", () => setPlaying(!playing));
stage.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPlaying(!playing); } });
// a route button shows that route from the verdict (the statistics are left as they are)
for (const b of routeBtns) b.addEventListener("click", () => { q2Go(st, "verdict", b.dataset.go); draw(); });
range.addEventListener("input", () => { st.rate = Number(range.value); rangeOut.textContent = st.rate.toFixed(1) + " %"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __qc2.at("push", 0.6, "NG") pauses that far into that phase with that verdict
window.__qc2 = { at(phase, u = 0, verdict) { setPlaying(false); q2Go(st, phase, verdict); st.pt = u * M.DUR[phase]; draw(); return q2Readout(st); } };
`;
  return k.pageHtml({ title: "QC Gate 2 · final judgement cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "qc2-live.html"), html);
  console.log(`wrote ${join(OUT, "qc2-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
