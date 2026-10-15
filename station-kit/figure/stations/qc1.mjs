// Isometric figure of station QC Gate 1 (visual inspection) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: two portal frames over the roller line
// carrying an LED light bar, a powered turntable in the line (drive box, guide rails) that
// turns the block so every face comes round to the inspector, a task lamp on an arm at the
// operator side, and the limit-sample board on a side table.
//   node station-kit/figure/stations/qc1.mjs [outDir]   →   <outDir>/qc1-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as HSB05; the line runs along +x, the inspector stands at +y)
const PAD = { x: -176, y: -56, w: 352, d: 140, r: 8 };
const PORTAL_X = [-46, 46];
const PORTAL_Y = [-34, 34];
const TOP_Z = 100;
const CONV_Z = 31, CONV_Y = 22;
const IN = [-170, -30], OUTX = [30, 170];
const TT = { r: 26, z: CONV_Z - 2 }; // turntable plate radius, top
const BLOCK = { w: 24, d: 19, h: 17 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [PORTAL_X[0], PORTAL_Y[0], TOP_Z + 8], [PORTAL_X[1], PORTAL_Y[0], TOP_Z + 8], [PORTAL_X[1], PORTAL_Y[1], TOP_Z + 8]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 62 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // the inspector's standing mat, with its anti-slip ribs
  const mat = { x: -24, y: 46, w: 48, d: 22, r: 1 };
  out.push(S(slab(mat, 0, 1, 2), { tone: "lo", flat: true }));
  out.push(L(Array.from({ length: 7 }, (_, i) => k.lineOnTop([mat.x + 6 + i * 6, mat.y + 2], [mat.x + 6 + i * 6, mat.y + mat.d - 2], 1, P)).join(""), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- portals and the light bar ----------------------------------------------
function post(x, y) {
  return [
    S(slab({ x: x - 5, y: y - 5, w: 10, d: 10, r: 0.6 }, 0, 2, 2), { tone: "mid" }),
    S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.5 }, 2, TOP_Z - 2, 2, 0.4), { tone: "mid" }),
    D(k.corners({ x: x - 5, y: y - 5, w: 10, d: 10 }, 1.5).map(([a, b]) => at([a, b, 2])), { size: 0.4 }),
  ].join("");
}

function portalBeams() {
  const out = [];
  for (const x of PORTAL_X) out.push(S(slab({ x: x - 3, y: PORTAL_Y[0] - 3, w: 6, d: PORTAL_Y[1] - PORTAL_Y[0] + 6, r: 0.5 }, TOP_Z, 6, 2, 0.4), { tone: "mid" }));
  // the light bar spans the two portals over the line: housing and diffuser
  const bar = { x: PORTAL_X[0] - 3, y: -6, w: PORTAL_X[1] - PORTAL_X[0] + 6, d: 12, r: 1 };
  out.push(S(slab(bar, TOP_Z - 8, 8, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(bar, TOP_Z - 4, P, 3), { tone: "faint" }) }));
  out.push(S(slab(k.insetPlan(bar, 2), TOP_Z - 9, 1, 2), { tone: "hi", crease: "none" }));
  return out.join("");
}

// light falling from the bar onto the block, fading as it goes
function light() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const x = -30 + i * 10;
    out.push(k.fadeLineSvg([at([x, 0, TOP_Z - 10]), at([x * 0.4, 0, CONV_Z + BLOCK.h + 4])], { fade: [0.2, 1], tone: "faint" }));
  }
  return out.join("");
}

// ---- roller conveyor ---------------------------------------------------------
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

// ---- turntable: drive box, column, plate with a degree scale -----------------
function turntable() {
  const out = [];
  const box = { x: -20, y: -20, w: 40, d: 40, r: 2 };
  out.push(S(slab(box, 0, 14, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 7, P, 3), { tone: "faint" }) }));
  out.push(L(k.pathOf([at([20, -12, 3]), at([20, 12, 3]), at([20, 12, 11]), at([20, -12, 11])], true), { tone: "lo" }));
  out.push(D([[-9, 4], [9, 4], [9, 10], [-9, 10]].map(([y, z]) => at([20, y, z])), { size: 0.4 }));
  out.push(S(k.cylinder(0, 0, 7, 14, TT.z - 17, P, 32, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, TT.r, TT.z - 3, 3, P, 72, 0.6), { tone: "mid" }));
  const ticks = k.radialTicks(0, 0, TT.r - 0.5, 36, 9, TT.z, [1.4, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }));
  return out.join("");
}

function guideRail(y) {
  const out = [];
  for (const x of [-18, 18]) out.push(S(slab({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.4 }, TT.z, 8, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: -22, y: y - 1.5, w: 44, d: 3, r: 1.2 }, TT.z + 8, 3, 3), { tone: "mid" }));
  return out.join("");
}

// ---- BC block, deck up ----------------------------------------------------------
function block(cx, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: -d / 2, w, d, r: 1 };
  const z = cx === 0 ? TT.z : CONV_Z;
  const top = z + h;
  const ink = lit ? "lit" : "mid";
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, 0, 2.2, top, P, 24)).join(""), { tone: ink }));
  out.push(L(k.sideRing([cx + 6, d / 2, z + 9], 1.6, "y", P, 16), { tone: ink }));
  return out.join("");
}

// ---- task lamp on an arm, from the near portal post ---------------------------
function taskLamp() {
  const [x, y] = [PORTAL_X[1], PORTAL_Y[1]];
  const out = [];
  // the head sits out past the near post, so it lights the block's near face without hiding it
  const j1 = [x - 2, y + 3, 72];
  const j2 = [x + 8, y + 12, 84];
  const head = [x + 16, y + 6, 74];
  out.push(S(slab({ x: x - 4, y: y + 2, w: 6, d: 4, r: 0.6 }, 68, 8, 2), { tone: "mid" }));
  out.push(L(k.pathOf([at(j1), at(j2), at(head)]), { tone: "mid" }));
  out.push(D([at(j1), at(j2)], { size: 0.8, tone: "mid" }));
  out.push(S(k.cylinder(head[0], head[1], 5, head[2] - 4, 5, P, 32, 0.6), { tone: "mid" }));
  out.push(L(k.ring(head[0], head[1], 3.6, head[2] - 4, P, 24), { tone: "hi" }));
  return out.join("");
}

// ---- side table with the limit-sample board -----------------------------------
function sampleTable() {
  const plan = { x: -96, y: 30, w: 40, d: 24, r: 1 };
  const out = [];
  for (const [x, y] of byDepth(k.corners(plan, 3), ([x, y]) => [x, y, 0])) out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 0, 40, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab(plan, 40, 3, 2, 0.5), { tone: "mid" }));
  // the board: three framed samples (crack, porosity, good) with a label line under each
  const board = { x: plan.x + 4, y: plan.y + 4, w: 32, d: 14, r: 0.6 };
  out.push(S(slab(board, 43, 1.5, 2), { tone: "hi", crease: "none" }));
  for (let i = 0; i < 3; i++) {
    const x0 = board.x + 2 + i * 10;
    out.push(L(k.planOutline({ x: x0, y: board.y + 2, w: 8, d: 7, r: 0 }, 44.5, P), { tone: "mid" }));
    out.push(L(k.lineOnTop([x0 + 1, board.y + 11], [x0 + 7, board.y + 11], 44.5, P), { tone: "faint", free: true }));
  }
  // what the samples show: a crack, then a scatter of pores
  out.push(L(k.pathOf([[board.x + 4, board.y + 4], [board.x + 6, board.y + 5.5], [board.x + 5, board.y + 7]].map(([a, b]) => at([a, b, 44.5]))), { tone: "lo" }));
  out.push(D([[14, 4], [16, 6], [15, 7.5], [17.5, 4.5]].map(([a, b]) => at([board.x + a, board.y + b, 44.5])), { size: 0.45, tone: "lo" }));
  return out.join("");
}

const body = [
  floor(),
  post(PORTAL_X[0], PORTAL_Y[0]),
  post(PORTAL_X[1], PORTAL_Y[0]),
  conveyorBack(IN),
  block(-120),
  conveyorFront(IN),
  turntable(),
  guideRail(-14),
  light(),
  block(0, { lit: true }),
  guideRail(14),
  conveyorBack(OUTX),
  conveyorFront(OUTX),
  post(PORTAL_X[0], PORTAL_Y[1]),
  portalBeams(),
  sampleTable(),
  post(PORTAL_X[1], PORTAL_Y[1]),
  taskLamp(),
];

const LABEL =
  "Station QC Gate 1, visual inspection: two portals over the roller line carry an LED light bar, and a powered turntable with guide rails turns the BC block so every face comes round to the inspector. A task lamp lights the face being checked, and the limit-sample board on the side table shows a crack, porosity and a good surface to judge against.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
  writeFileSync(join(OUT, `qc1-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `qc1-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
