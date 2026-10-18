// Isometric figure of station Hanten MC (block turnover) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a housing straddling the roller line,
// drawn cut away (back wall, the back half of the roof and the infeed wall only), a
// turnover cage of two big rings tied by bars riding on support rollers, the infeed
// roller conveyor under a yellow mesh guard and the outfeed conveyor towards Final.
// The block comes in deck down and leaves deck up.
// The live page runs the cycle of hanten-3d.html: roll in deck down, clamp, the geared drive turns the
// cage 180° (the same rotor model: drive torque, the block's weight about the axis, bearing drag), brake
// on, unclamp, roll out deck up, and the empty cage turns back.
//   node station-kit/figure/stations/hanten.mjs [outDir]
//     →   <outDir>/hanten-{light,dark}.svg and <outDir>/hanten-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/hanten.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as HSB05; the line runs along +x) ----------------
const PAD = { x: -186, y: -64, w: 372, d: 128, r: 8 };
const HOUSE = { x0: -46, x1: 46, y0: -40, y1: 40, h: 88 };
const CONV_Z = 31; // roller tops
const CONV_Y = 22; // half width of the roller bed
const IN = [-176, -50];
const OUTX = [50, 176];
const CAGE = { x0: -17, x1: 17, z: 40, r: 22, t: 3 }; // rings at x0 and x1, axis along x at height z
const BLOCK = { w: 24, d: 19, h: 17 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [HOUSE.x0, HOUSE.y0, HOUSE.h + 8], [HOUSE.x1, HOUSE.y0, HOUSE.h + 8], [-150, 0, 80]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const seg = (p, q) => k.segment(p, q, P);
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));
// points round a circle in the y-z plane at x (t in degrees, 0 = +y, 90 = up)
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
  // walkway line along the operator side, edge to edge
  out.push(L(k.lineOnTop([PAD.x + 5, 50], [PAD.x + PAD.w - 5, 50], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- housing, cut away: back wall, back half of the roof, the infeed wall ---
function houseBack() {
  const { x0, x1, y0, h } = HOUSE;
  const out = [];
  const wall = { x: x0, y: y0, w: x1 - x0, d: 4, r: 0.4 };
  out.push(S(slab(wall, 0, h, 2, 0.4), { tone: "hi", inner: L(k.sideSeam(wall, 30, P, 2) + k.sideSeam(wall, 60, P, 2), { tone: "faint" }) }));
  // inspection window in the back wall, a closed outline with corner screws
  const fy = y0 + 4;
  out.push(L(loop([[-24, fy, 52], [24, fy, 52], [24, fy, 76], [-24, fy, 76]]), { tone: "lo" }));
  out.push(D([[-21, 55], [21, 55], [21, 73], [-21, 73]].map(([x, z]) => at([x, fy, z])), { size: 0.4 }));
  // infeed wall at x0, with the tunnel the conveyor runs through
  for (const [ya, yb] of [[y0 + 4, -CONV_Y - 6], [CONV_Y + 6, HOUSE.y1]]) out.push(S(slab({ x: x0, y: ya, w: 4, d: yb - ya, r: 0.4 }, 0, h, 2, 0.4), { tone: "hi" }));
  out.push(S(slab({ x: x0, y: -CONV_Y - 6, w: 4, d: 2 * CONV_Y + 12, r: 0.4 }, 62, h - 62, 2, 0.4), { tone: "hi" }));
  return out.join("");
}

function roofBack() {
  const { x0, x1, y0, h } = HOUSE;
  const out = [S(slab({ x: x0 - 3, y: y0 - 3, w: x1 - x0 + 6, d: 43, r: 1 }, h, 6, 3, 0.6), { tone: "mid" })];
  // the cut edge of the roof, square along y = 0
  out.push(L(seg([x0 - 3, 0, h + 6], [x1 + 3, 0, h + 6]), { tone: "mid" }));
  // control box on the roof with three lamps on its face
  out.push(S(slab({ x: 14, y: -34, w: 22, d: 14, r: 1 }, h + 6, 16, 3, 0.6), { tone: "mid" }));
  out.push(D([at([18, -20, h + 15]), at([24, -20, h + 15]), at([30, -20, h + 15])], { size: 0.7, tone: "hi" }));
  return out.join("");
}

function posts(front) {
  const { x0, x1, y0, y1, h } = HOUSE;
  const out = [];
  const pts = front ? [[x1, y1]] : [[x0, y0], [x1, y0], [x0, y1]];
  for (const [x, y] of byDepth(pts, ([x, y]) => [x, y, 0])) {
    out.push(S(slab({ x: x - 4, y: y - 4, w: 8, d: 8, r: 0.6 }, 0, front ? 46 : h, 2, 0.4), { tone: "mid" }));
    out.push(D([12, 30].map((z) => at([x + 4, y + 4, z])), { size: 0.4 }));
  }
  return out.join("");
}

// ---- roller conveyor between two x values ------------------------------------
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
  // gear motor driving the bed, on the operator side under the rail
  const mx = x0 + 26;
  out.push(S(slab({ x: mx - 2, y: CONV_Y + 4, w: 4, d: 6, r: 0.4 }, 10, 10, 2), { tone: "mid" }));
  const fins = [11, 14, 17].map((z) => seg([mx - 6, CONV_Y + 20, z], [mx + 6, CONV_Y + 20, z])).join("");
  out.push(S(slab({ x: mx - 8, y: CONV_Y + 10, w: 16, d: 10, r: 3 }, 8, 12, 4, 0.5), { tone: "mid", inner: L(fins, { tone: "faint" }) }));
  return out.join("");
}

// yellow mesh guard over the infeed: posts, top rails, diagonal mesh on the near side and the top
function meshGuard() {
  const [x0, x1] = [-150, -66];
  const y0 = -CONV_Y - 4, y1 = CONV_Y + 4, z0 = CONV_Z + 1, z1 = 78;
  const out = [];
  for (const [x, y] of byDepth([[x0, y0], [x1, y0], [x0, y1], [x1, y1]], ([x, y]) => [x, y, 0])) out.push(S(slab({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.3 }, z0, z1 - z0, 2), { tone: "mid", crease: "none" }));
  out.push(L(loop([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]), { tone: "mid" }));
  out.push(L(seg([x0, y1, z0], [x1, y1, z0]), { tone: "mid" }));
  const mesh = [];
  for (let x = x0; x < x1; x += 7) {
    const xb = Math.min(x + 7, x1);
    mesh.push(seg([x, y1, z0], [xb, y1, z1]), seg([xb, y1, z0], [x, y1, z1]));
    mesh.push(seg([x, y0, z1], [xb, y1, z1]), seg([xb, y0, z1], [x, y1, z1]));
  }
  out.push(L(mesh.join(""), { tone: "faint" }));
  return out.join("");
}

// ---- turnover cage: base, support rollers, rings, tie bars, platform, clamp -
function cageBase() {
  const out = [S(slab({ x: -30, y: -30, w: 60, d: 60, r: 1 }, 0, 6, 2, 0.6), { tone: "mid" })];
  out.push(D(k.corners({ x: -30, y: -30, w: 60, d: 60 }, 3).map(([x, y]) => at([x, y, 6])), { size: 0.45 }));
  // drive motor and gearbox at the back
  out.push(S(slab({ x: 24, y: -30, w: 16, d: 12, r: 3 }, 6, 14, 4, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: 28, y: -18, w: 8, d: 4, r: 0.6 }, 10, 6, 2), { tone: "mid" }));
  return out.join("");
}

function rollersUnder(x) {
  const out = [];
  for (const y of [-14, 14]) {
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.6 }, 6, 6, 2), { tone: "mid" }));
    out.push(`<path class="hnt-ring" d="${loop(arcX(x + 1.5, y, 14, 4.5))}"/>`);
    out.push(L(loop(arcX(x + 1.5, y, 14, 4.5)) + loop(arcX(x + 1.5, y, 14, 1.4, 0, 360, 12)), { tone: "mid" }));
  }
  return out.join("");
}

function ring(x) {
  const { z, r, t } = CAGE;
  const out = [];
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(arcX(xx, 0, z, r + t))}${loop(arcX(xx, 0, z, r))}"/>`;
  out.push(band(x, "hnt-ring hnt-back"));
  out.push(band(x + 3, "hnt-ring"));
  out.push(L(loop(arcX(x + 3, 0, z, r + t)) + loop(arcX(x + 3, 0, z, r)), { tone: "mid" }));
  // sprocket teeth on the rim, bolts round the face
  out.push(D(Array.from({ length: 24 }, (_, i) => at(arcX(x + 3, 0, z, r + t + 0.6, i * 15, i * 15, 1)[0])), { size: 0.35, tone: "lo" }));
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
  const { x0, x1 } = CAGE;
  const out = [];
  for (const y of [-12, 8]) out.push(S(slab({ x: x0 + 3, y, w: x1 - x0 - 3, d: 4, r: 0.4 }, CONV_Z - 4, 4, 2), { tone: "mid" }));
  return out.join("");
}

function clamp() {
  const { x0, x1 } = CAGE;
  const top = CONV_Z + BLOCK.h;
  const out = [S(slab({ x: x0 + 3, y: -3, w: x1 - x0 - 3, d: 6, r: 0.6 }, top, 3, 2, 0.4), { tone: "mid" })];
  // two short cylinders bearing down from the upper tie bars
  for (const x of [-8, 8]) out.push(S(k.cylinder(x, 0, 2.2, top + 3, 8, P, 16, 0.3), { tone: "mid" }));
  return out.join("");
}

// ---- BC block: deck up shows four bores; deck down shows the pan rail and bolt holes
function block(cx, { lit = false, deckUp = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: -d / 2, w, d, r: 1 };
  const z = CONV_Z;
  const top = z + h;
  const ink = lit ? "lit" : "mid";
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + (deckUp ? 5 : 12), P, 2), { tone: lit ? "lit" : "faint" }) })];
  if (deckUp) {
    const bores = [0, 1, 2, 3].map((i) => plan.x + 4 + i * 5.33);
    out.push(L(bores.map((x) => k.ring(x, 0, 2.2, top, P, 24)).join(""), { tone: ink }));
  } else {
    // the crankcase side: a pan rail round the edge and its bolt holes
    out.push(L(k.planOutline(k.insetPlan(plan, 2.5), top, P), { tone: ink }));
    out.push(D([...k.corners(plan, 2.5).map(([x, y]) => at([x, y, top])), at([cx, plan.y + 2.5, top]), at([cx, plan.y + d - 2.5, top])], { size: 0.4, tone: ink }));
  }
  return out.join("");
}

const body = [
  floor(),
  houseBack(),
  posts(false),
  roofBack(),
  conveyorBack(IN),
  block(-120),
  conveyorFront(IN),
  meshGuard(),
  cageBase(),
  rollersUnder(CAGE.x0),
  ring(CAGE.x0),
  tieBars(false),
  platform(),
  block(0, { lit: true }),
  clamp(),
  tieBars(true),
  rollersUnder(CAGE.x1),
  ring(CAGE.x1),
  conveyorBack(OUTX),
  block(120, { deckUp: true }),
  conveyorFront(OUTX),
  posts(true),
];

const STYLE = `<style>
.iso[data-theme="light"] .hnt-ring{fill:#e9e8e4}.iso[data-theme="light"] .hnt-back{fill:#d4d2cc}
.iso[data-theme="dark"] .hnt-ring{fill:#202020}.iso[data-theme="dark"] .hnt-back{fill:#141414}
.hnt-ring{stroke:none}
</style>`;

const LABEL =
  "Station Hanten MC, block turnover: a housing over the roller line, shown cut away, holds a cage of two big rings tied by bars that rides on support rollers. The block comes in deck down under a yellow mesh guard, is clamped in the cage and turned over, and leaves deck up towards Final Proses.";

// =============================================================================
// The cycle, as in hanten-3d.html. The model (hnStep, hnGo) and the moving pieces (hnScene and the
// builders it calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the
// kit inlined. The still above is the approved drawing (a block on each conveyor and one in the cage);
// the live page follows one block through the cycle, as the 3D page does.
// =============================================================================
const M = {
  CAGE,
  BLOCK,
  CONV_Z,
  BLOCK_CZ: CONV_Z + BLOCK.h / 2, // the block turns about its own centre, a hair under the cage axis
  IN_X: -120,
  OUT_X: 120,
  // one cycle as the 3D page: [phase, seconds (0 = until the drive settles)]
  CYCLE: [["roll in", 1.6], ["clamp", 0.6], ["turn", 0], ["hold", 0.8], ["unclamp", 0.6], ["roll out", 1.6], ["return", 0], ["next", 0.8]],
  // rotor model (SI), as the 3D page
  M_BLOCK: 36,
  G: 9.81,
  E: 0.06, // block centre below the axis, deck down
  T_MOTOR: 5.0,
  N_MOTOR: 1450,
  ETA: 0.9,
  C_DAMP: 6,
  H_CTRL: 1 / 240,
  MAX_DRIVE: 8,
};
M.I = 2 * 38 * (0.38 + 0.04 / 2) ** 2 + 4 * 3 * 0.38 ** 2 + (36 * (0.336 ** 2 + 0.371 ** 2)) / 12 + 36 * 0.06 * 0.06;

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hnState() {
  return { step: 0, pt: 0, theta: 0, w: 0, T: 0, rpm: 0, gear: 60, outTheta: 0, retGoal: null };
}

const hnWeight = (th) => -M.M_BLOCK * M.G * M.E * Math.sin(th);

// drive the cage to `target`: a speed controller limited by the motor's torque and speed through the gearbox
function hnDrive(st, target, dt) {
  const i = st.gear;
  const tMax = M.T_MOTOR * i * M.ETA;
  const wMax = ((M.N_MOTOR / i) * 2 * Math.PI) / 60;
  const aBrake = (0.6 * tMax) / M.I;
  const n = Math.max(1, Math.ceil(dt / M.H_CTRL));
  const h = dt / n;
  for (let q = 0; q < n; q++) {
    const left = target - st.theta;
    const wWant = Math.sign(left) * Math.min(wMax, Math.sqrt(2 * aBrake * Math.abs(left)));
    st.T = Math.min(tMax, Math.max(-tMax, (wWant - st.w) * M.I * 25 - hnWeight(st.theta) + M.C_DAMP * st.w));
    st.w += ((st.T + hnWeight(st.theta) - M.C_DAMP * st.w) / M.I) * h;
    st.theta += st.w * h;
  }
}

function hnNext(st) {
  st.step = (st.step + 1) % M.CYCLE.length;
  st.pt = 0;
  st.retGoal = null;
}

function hnStep(st, dt) {
  st.pt += dt;
  const [name, dur] = M.CYCLE[st.step];
  const u = dur ? Math.min(1, st.pt / dur) : 0;
  const settled = (goal) => (Math.abs(st.theta - goal) < 0.004 && Math.abs(st.w) < 0.03) || st.pt > M.MAX_DRIVE;
  if (name === "turn") {
    hnDrive(st, Math.PI, dt);
    if (settled(Math.PI)) {
      st.theta = Math.PI;
      st.w = 0;
      hnNext(st);
    }
  } else if (name === "hold" || name === "unclamp") {
    st.w = 0;
    st.T = -hnWeight(st.theta);
    if (u >= 1) {
      st.outTheta = st.theta;
      hnNext(st);
    }
  } else if (name === "return") {
    if (st.retGoal === null) st.retGoal = Math.round(st.theta / (2 * Math.PI)) * 2 * Math.PI;
    hnDrive(st, st.retGoal, dt);
    if (settled(st.retGoal)) {
      st.theta = 0;
      st.w = 0;
      hnNext(st);
    }
  } else {
    st.T = 0;
    if (u >= 1) hnNext(st);
  }
  st.rpm = (Math.abs(st.w) * 60) / (2 * Math.PI);
}

function hnGo(st, name) {
  st.step = M.CYCLE.findIndex((c) => c[0] === name);
  st.pt = 0;
  st.w = 0;
  st.retGoal = null;
  st.theta = ["hold", "unclamp", "roll out", "return"].includes(name) ? Math.PI : 0;
  st.outTheta = st.theta;
}

// a box about the cage axis: centre c and half sizes hs in the cage frame, turned th about the x axis
// through (y 0, z cz); shaded like the kit's solids. Returns the markup and a test for which local faces show.
function hnBox(c, hs, th, cz, style, marks) {
  const cs = Math.cos(th);
  const sn = Math.sin(th);
  const R = ([x, y, z]) => [x, y * cs - (z - cz) * sn, cz + y * sn + (z - cz) * cs];
  const { sinA, cosA, sinE, cosE } = k.cameraOf(P);
  const T = [cosA * cosE, sinA * cosE, sinE];
  const corner = (i) => [c[0] + ((i & 1) * 2 - 1) * hs[0], c[1] + (((i >> 1) & 1) * 2 - 1) * hs[1], c[2] + (((i >> 2) & 1) * 2 - 1) * hs[2]];
  const pts = Array.from({ length: 8 }, (_, i) => k.iso(R(corner(i)), P));
  const faces = [
    { n: [1, 0, 0], v: [1, 3, 7, 5] },
    { n: [-1, 0, 0], v: [0, 4, 6, 2] },
    { n: [0, 1, 0], v: [2, 6, 7, 3] },
    { n: [0, -1, 0], v: [0, 1, 5, 4] },
    { n: [0, 0, 1], v: [4, 5, 7, 6] },
    { n: [0, 0, -1], v: [0, 2, 3, 1] },
  ].map((f) => {
    const w = [f.n[0], f.n[1] * cs - f.n[2] * sn, f.n[1] * sn + f.n[2] * cs];
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
  // outline: the convex hull of the corners (monotone chain)
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
  const inner = marks ? marks(R, on) : "";
  return k.solidSvg({ fill, shades, top, outline: fill, crease }, { ...style, inner: (style.inner || "") + inner });
}

// the BC block at x = bx, turned th about its centre: the crankcase side (pan rail and bolt holes) is
// local +z, the deck with its four bores local -z, so it comes in deck down and a half turn brings the bores up
function hnBlock(bx, th, alpha) {
  if (alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const zc = M.BLOCK_CZ;
  const svg = hnBox([bx, 0, zc], [w / 2, d / 2, h / 2], th, zc, { tone: "hi", crease: "lo", lit: true }, (R, on) => {
    const out = [];
    const at = (p) => k.iso(R(p), P);
    if (on([0, 0, 1])) {
      const zt = zc + h / 2;
      const x0 = bx - w / 2 + 2.5, x1 = bx + w / 2 - 2.5, y0 = -d / 2 + 2.5, y1 = d / 2 - 2.5;
      out.push(k.lineSvg(k.pathOf([[x0, y0, zt], [x1, y0, zt], [x1, y1, zt], [x0, y1, zt]].map(at), true), { tone: "lit" }));
      out.push(k.dotsSvg([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [bx, y0], [bx, y1]].map(([x, y]) => at([x, y, zt])), { size: 0.4, tone: "lit" }));
    }
    if (on([0, 0, -1])) {
      const zb = zc - h / 2;
      const bores = [0, 1, 2, 3].map((i) => {
        const x = bx - w / 2 + 4 + i * 5.33;
        return k.pathOf(Array.from({ length: 24 }, (_, j) => at([x + 2.2 * Math.cos((j / 24) * 2 * Math.PI), 2.2 * Math.sin((j / 24) * 2 * Math.PI), zb])), true);
      });
      out.push(k.lineSvg(bores.join(""), { tone: "lit" }));
    }
    return out.join("");
  });
  return alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(3)}">${svg}</g>`;
}

// points round a circle in the y-z plane at x, about the cage axis (t in degrees, 0 = +y, 90 = up)
function hnArc(x, r, t0, t1, n) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
    return k.iso([x, Math.cos(t) * r, M.CAGE.z + Math.sin(t) * r], P);
  });
}

// a ring of the cage, its sprocket teeth and face bolts turned with it (deg in degrees)
function hnRing(x, deg) {
  const { r, t } = M.CAGE;
  const loop = (xx, rr) => k.pathOf(hnArc(xx, rr, 0, 360, 72), true);
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(xx, r + t)}${loop(xx, r)}"/>`;
  const out = [band(x, "hnt-ring hnt-back"), band(x + 3, "hnt-ring")];
  out.push(k.lineSvg(loop(x + 3, r + t) + loop(x + 3, r), { tone: "mid" }));
  out.push(k.dotsSvg(Array.from({ length: 24 }, (_, i) => hnArc(x + 3, r + t + 0.6, i * 15 + deg, i * 15 + deg, 1)[0]), { size: 0.35, tone: "lo" }));
  out.push(k.dotsSvg(Array.from({ length: 8 }, (_, i) => hnArc(x + 3, r + t / 2, i * 45 + 22 + deg, i * 45 + 22 + deg, 1)[0]), { size: 0.45 }));
  return out.join("");
}

// the four tie bars: the upper ones go behind the block, the lower ones in front of it, as in the still
function hnBars(front, deg) {
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

// the platform rails, the block and the clamp bar with its two cylinders, turning together; sorted by depth
function hnCore(th, down, block) {
  const { x0, x1, z } = M.CAGE;
  const xm = (x0 + 3 + x1) / 2;
  const xh = (x1 - x0 - 3) / 2;
  const top = M.CONV_Z + M.BLOCK.h + (1 - down) * 6;
  const items = [];
  const rot = (p) => [p[0], p[1] * Math.cos(th) - (p[2] - z) * Math.sin(th), z + p[1] * Math.sin(th) + (p[2] - z) * Math.cos(th)];
  const add = (c, svg) => items.push({ d: k.depthOf(rot(c), P), svg });
  for (const y of [-10, 10]) add([xm, y, M.CONV_Z - 2], hnBox([xm, y, M.CONV_Z - 2], [xh, 2, 2], th, z, { tone: "mid" }));
  add([xm, 0, top + 1.5], hnBox([xm, 0, top + 1.5], [xh, 3, 1.5], th, z, { tone: "mid" }));
  for (const x of [-8, 8]) add([x, 0, top + 7], hnBox([x, 0, top + 7], [2.2, 2.2, 4], th, z, { tone: "mid" }));
  if (block) add([0, 0, M.BLOCK_CZ], block);
  return items.sort((a, b) => a.d - b.d).map((i) => i.svg).join("");
}

// everything that moves, for a state
function hnScene(st) {
  const [name, dur] = M.CYCLE[st.step];
  const u = dur ? Math.min(1, st.pt / dur) : 0;
  const e = u * u * (3 - 2 * u);
  const down = name === "clamp" ? e : name === "unclamp" ? 1 - e : ["turn", "hold"].includes(name) ? 1 : 0;
  // the block rolls in along the infeed, turns with the cage, rolls out the way the turn left it
  let bx = 0, alpha = 1, th = st.theta;
  if (name === "roll in") {
    bx = M.IN_X * (1 - e);
    alpha = smooth01(0, 0.25, u);
    th = 0;
  } else if (name === "roll out") {
    bx = M.OUT_X * e;
    alpha = 1 - smooth01(0.75, 1, u);
    th = Math.cos(st.outTheta) < 0 ? Math.PI : 0;
  } else if (name === "return" || name === "next") alpha = 0;
  const block = hnBlock(bx, th, alpha);
  const where = bx < -40 ? "in" : bx > 40 ? "out" : "cage";
  const deg = (st.theta * 180) / Math.PI;
  return {
    name,
    ring0: hnRing(M.CAGE.x0, deg),
    barsBack: hnBars(false, deg),
    core: hnCore(st.theta, down, where === "cage" ? block : ""),
    barsFront: hnBars(true, deg),
    ring1: hnRing(M.CAGE.x1, deg),
    blockIn: where === "in" ? block : "",
    blockOut: where === "out" ? block : "",
  };
}

const SAY = { "roll in": "rolling in deck down", clamp: "clamping", turn: "turning over", hold: "brake on", unclamp: "unclamping", "roll out": "rolling out deck up", return: "cage back to the start", next: "next block" };
const STEPS = { "roll in": "Roll in", clamp: "Clamp", turn: "Turn", hold: "Hold", unclamp: "Unclamp", "roll out": "Roll out", return: "Return", next: "Next" };

function hnReadout(st) {
  const deg = ((((st.theta * 180) / Math.PI) % 360) + 360) % 360;
  return `${SAY[M.CYCLE[st.step][0]]} · turnover ${Math.round(deg > 180 ? 360 - deg : deg)}°`;
}

function hnNumbers(st) {
  const f = (x) => Math.round(x).toLocaleString("en-US");
  return `i = ${f(st.gear)} · ${f(st.T)} N·m on the cage · ${st.rpm.toFixed(1)} rpm · weight torque ${f(Math.abs(hnWeight(st.theta)))} N·m`;
}

// ---- self-check: a cycle visits every step in order and turns the block deck up
{
  const st = hnState();
  const seen = [];
  let flipped = false;
  for (let i = 0; i < 60 * 60 && !(seen.length > 1 && st.step === 0); i++) {
    hnStep(st, 1 / 60);
    const ph = M.CYCLE[st.step][0];
    if (seen.at(-1) !== ph) seen.push(ph);
    if (ph === "roll out" && Math.cos(st.outTheta) < 0) flipped = true;
  }
  const want = M.CYCLE.map((c) => c[0]);
  if (JSON.stringify(seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  if (!flipped) throw new Error("the block never left deck up");
  console.log(`cycle check passed (${want.join(" → ")})`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    houseBack(),
    posts(false),
    roofBack(),
    conveyorBack(IN),
    slot("blockIn", f.blockIn),
    conveyorFront(IN),
    meshGuard(),
    cageBase(),
    rollersUnder(CAGE.x0),
    slot("ring0", f.ring0),
    slot("barsBack", f.barsBack),
    slot("core", f.core),
    slot("barsFront", f.barsFront),
    rollersUnder(CAGE.x1),
    slot("ring1", f.ring1),
    conveyorBack(OUTX),
    slot("blockOut", f.blockOut),
    conveyorFront(OUTX),
    posts(true),
  ];
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `hanten-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `hanten-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = hnState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...liveBody(hnScene(st))] });
  const steps = M.CYCLE.map(([ph]) => `<button type="button" data-go="${ph}">${STEPS[ph]}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Gear ratio <input type="range" min="30" max="120" step="5" value="60" aria-label="Gear ratio"><output>60 : 1</output></label>
<div class="bari-num" data-numbers>${hnNumbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "Hanten MC",
    title: "Block turnover cycle",
    hint: "Click to pause",
    readout: hnReadout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="Hanten MC cycle, click or press space to pause">${svg}</div>`,
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
  const fns = [smooth01, hnState, hnWeight, hnDrive, hnNext, hnStep, hnGo, hnBox, hnBlock, hnArc, hnRing, hnBars, hnCore, hnScene, hnReadout, hnNumbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, cameraOf, depthOf, pathOf, slabOf, solidSvg, lineSvg, dotsSvg };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
const SAY = ${JSON.stringify(SAY)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slots = ["blockIn", "ring0", "barsBack", "core", "barsFront", "ring1", "blockOut"].reduce((o, n) => ((o[n] = svg.querySelector('[data-slot="' + n + '"]')), o), {});
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = hnState();
if (still.matches) { hnGo(st, "turn"); st.theta = Math.PI / 2; }
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = hnScene(st);
  for (const n in slots) html(slots[n], f[n]);
  const text = hnReadout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = hnNumbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of stepBtns) if (b.dataset.go === f.name) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  hnStep(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { hnGo(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.gear = Number(range.value); rangeOut.textContent = st.gear + " : 1"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __hanten.at("turn", 0.5) pauses that far into the step (drive steps: share of the half turn)
window.__hanten = { at(phase, u = 0) { setPlaying(false); hnGo(st, phase); const c = M.CYCLE[st.step]; if (c[1]) st.pt = u * c[1]; else if (phase === "turn") st.theta = u * Math.PI; else st.theta = Math.PI * (1 - u); draw(); return hnReadout(st); } };
`;
  return k.pageHtml({ title: "Hanten MC · block turnover cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "hanten-live.html"), html);
  console.log(`wrote ${join(OUT, "hanten-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
