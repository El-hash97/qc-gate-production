// Isometric figure of station Final Proses for the station detail card in /visualisasi.
// Shapes follow the Blender layout: an open booth over the roller line (a back wall and two
// portal frames with a hose rail along their tops), a hand-turned cage of two rings in the
// line that holds the block, a grating over the shot tray under it, a pendant control box
// with an e-stop and the red index lever, and a green rack of air tools. The blow gun on
// the rail's hose blows the last loose shot out of the block's passages onto the grating.
// The live page runs the cycle of final-3d.html: roll in, clamp, then four times blow a face and index
// the cage a quarter turn with the red lever, unclamp, roll out to QC Gate 1. The same free-jet model
// sets how fast the shot comes out of each face.
//   node station-kit/figure/stations/final.mjs [outDir]
//     →   <outDir>/final-{light,dark}.svg and <outDir>/final-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/final.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as HSB05; the line runs along +x, the operator stands at +y)
const PAD = { x: -176, y: -64, w: 352, d: 150, r: 8 };
const WALL_Y = -46;
const PORTAL_X = [-62, 62];
const PORTAL_Y = [WALL_Y + 4, 40];
const TOP_Z = 100;
const RAIL = { y: 6, z: TOP_Z - 6 };
const CONV_Z = 31, CONV_Y = 22;
const IN = [-170, -30], OUTX = [30, 170];
const CAGE = { x0: -17, x1: 17, z: 40, r: 22, t: 3 };
const BLOCK = { w: 24, d: 19, h: 17 };
const GUN = [12, 30, 52]; // blow gun nozzle, in front of the block, aimed at a passage on its front face

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [PAD.x + 30, WALL_Y, TOP_Z + 10], [PAD.x + PAD.w - 30, WALL_Y, TOP_Z + 10], [PORTAL_X[1], PORTAL_Y[1], TOP_Z + 10]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 62 },
);

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
  // walkway line on the operator side, edge to edge
  out.push(L(k.lineOnTop([PAD.x + 5, 66], [PAD.x + PAD.w - 5, 66], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- booth: back wall with a light panel, two portals, the hose rail ---------
function backWall() {
  const wall = { x: -110, y: WALL_Y, w: 220, d: 4, r: 0.4 };
  const out = [S(slab(wall, 0, TOP_Z + 4, 2, 0.4), { tone: "hi", inner: L(k.sideSeam(wall, 34, P, 2) + k.sideSeam(wall, 68, P, 2), { tone: "faint" }) })];
  // inspection light on the wall behind the cage: a closed panel with its frame screws
  const fy = WALL_Y + 4;
  out.push(S(slab({ x: -30, y: fy, w: 60, d: 2, r: 0.4 }, 70, 14, 2), { tone: "mid", crease: "none" }));
  out.push(L(seg([-26, fy + 2, 77], [26, fy + 2, 77]), { tone: "hi" }));
  out.push(D([[-27, 72], [27, 72], [-27, 82], [27, 82]].map(([x, z]) => at([x, fy + 2, z])), { size: 0.4 }));
  return out.join("");
}

function portal(x, front) {
  const out = [];
  const [y0, y1] = PORTAL_Y;
  const py = front ? y1 : y0;
  out.push(S(slab({ x: x - 5, y: py - 5, w: 10, d: 10, r: 0.6 }, 0, 2, 2), { tone: "mid" }));
  out.push(S(slab({ x: x - 3, y: py - 3, w: 6, d: 6, r: 0.5 }, 2, TOP_Z - 2, 2, 0.4), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 5, y: py - 5, w: 10, d: 10 }, 1.5).map(([a, b]) => at([a, b, 2])), { size: 0.4 }));
  if (front) out.push(S(slab({ x: x - 3, y: y0, w: 6, d: y1 - y0 + 3, r: 0.5 }, TOP_Z, 6, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

function rail() {
  const out = [S(slab({ x: PORTAL_X[0] - 3, y: RAIL.y - 2, w: PORTAL_X[1] - PORTAL_X[0] + 6, d: 4, r: 0.5 }, RAIL.z, 4, 2, 0.4), { tone: "mid" })];
  // hose trolley over the gun, the hose dropping in a coil to it
  const tx = GUN[0] - 2;
  out.push(S(slab({ x: tx - 5, y: RAIL.y - 4, w: 10, d: 8, r: 1 }, RAIL.z - 6, 6, 3, 0.4), { tone: "mid" }));
  out.push(D([at([tx - 3, RAIL.y + 4, RAIL.z - 3]), at([tx + 3, RAIL.y + 4, RAIL.z - 3])], { size: 0.5 }));
  // the kit's coil runs along x or y only, so the hanging coil is a helix round z drawn here
  const helix = Array.from({ length: 7 * 16 + 1 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return at([tx + Math.cos(a) * 3, RAIL.y + 6 + Math.sin(a) * 3, RAIL.z - 10 - (i / (7 * 16)) * (RAIL.z - 76)]);
  });
  out.push(L(k.pathOf(helix), { tone: "lo" }));
  out.push(L(k.pathOf([at([tx, RAIL.y + 6, RAIL.z - 6]), at([tx, RAIL.y + 6, RAIL.z - 10])]) + k.pathOf([at([tx, RAIL.y + 6, 66]), at([GUN[0] + 3, GUN[1] + 6, GUN[2] + 6])]), { tone: "lo" }));
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

// ---- shot tray and grating under the cage ------------------------------------
function tray() {
  const plan = { x: -28, y: -26, w: 56, d: 52, r: 1 };
  const out = [S(slab(plan, 0, 6, 2, 0.5), { tone: "mid" })];
  const grid = [];
  for (let x = plan.x + 5; x < plan.x + plan.w - 2; x += 5) grid.push(k.lineOnTop([x, plan.y + 2], [x, plan.y + plan.d - 2], 6, P));
  grid.push(k.planOutline(k.insetPlan(plan, 2), 6, P));
  out.push(L(grid.join(""), { tone: "faint" }));
  return out.join("");
}

// ---- the hand-turned cage ------------------------------------------------------
function cageStands() {
  const out = [];
  for (const x of [CAGE.x0 - 6, CAGE.x1 + 6]) for (const y of [-14, 14]) {
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.6 }, 6, 6, 2), { tone: "mid" }));
    out.push(`<path class="fnl-ring" d="${loop(arcX(x, y, 14, 4.5))}"/>`);
    out.push(L(loop(arcX(x, y, 14, 4.5)) + loop(arcX(x, y, 14, 1.4, 0, 360, 12)), { tone: "mid" }));
  }
  return out.join("");
}

function ring(x) {
  const { z, r, t } = CAGE;
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(arcX(xx, 0, z, r + t))}${loop(arcX(xx, 0, z, r))}"/>`;
  const out = [band(x, "fnl-ring fnl-back"), band(x + 3, "fnl-ring")];
  out.push(L(loop(arcX(x + 3, 0, z, r + t)) + loop(arcX(x + 3, 0, z, r)), { tone: "mid" }));
  // index notches every 90°, bolts round the face
  out.push(D([0, 90, 180, 270].map((d) => at(arcX(x + 3, 0, z, r + t + 0.8, d, d, 1)[0])), { size: 0.7, tone: "lo" }));
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

// the index plunger and its red lever on the near ring's bearing stand
function lever() {
  const x = CAGE.x1 + 9;
  const out = [S(slab({ x: x - 2, y: 14, w: 4, d: 6, r: 0.6 }, 12, 10, 2), { tone: "mid" })];
  out.push(L(seg([x, 20, 20], [x + 8, 30, 34]), { tone: "mid" }));
  out.push(S(k.cylinder(x + 8, 30, 2, 33, 5, P, 16, 0.4), { tone: "hi" }));
  return out.join("");
}

// ---- BC block: deck up, four bores, passages on the front face ---------------
function block(cx, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: -d / 2, w, d, r: 1 };
  const z = CONV_Z;
  const top = z + h;
  const ink = lit ? "lit" : "mid";
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, 0, 2.2, top, P, 24)).join(""), { tone: ink }));
  out.push(L(k.sideRing([cx + 6, d / 2, z + 9], 1.6, "y", P, 16) + k.sideRing([cx - 5, d / 2, z + 11], 1.2, "y", P, 14), { tone: ink }));
  return out.join("");
}

// ---- blow gun, its air jet and the shot it chases out -----------------------
function gun() {
  const [x, y, z] = GUN;
  const out = [];
  // the jet: streaks from the nozzle into the passage, fading as they spread
  const target = [6, BLOCK.d / 2, CONV_Z + 9];
  for (let i = -2; i <= 2; i++) out.push(k.fadeLineSvg([at([x - 1, y - 3, z - 2]), at([target[0] + i * 0.8, target[1] + 0.5, target[2] + i * 0.6])], { fade: [0, 0.6], tone: "mid" }));
  // the gun: nozzle, body, grip
  out.push(S(slab({ x: x - 1, y: y - 6, w: 2, d: 6, r: 1 }, z - 3, 2, 3), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x - 2.5, y, w: 5, d: 9, r: 1.5 }, z - 4, 5, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x - 2, y: y + 6, w: 4, d: 4, r: 1 }, z - 12, 9, 3), { tone: "mid" }));
  // loose shot falling out of the block onto the grating
  const drops = [];
  for (let i = 0; i < 9; i++) drops.push(at([-6 + (i % 5) * 4, 4 + (i % 3) * 5, 8 + ((i * 7) % 18)]));
  out.push(D(drops, { size: 0.55, tone: "mid" }));
  return out.join("");
}

// ---- pendant control box on the near portal post, tool rack beside it -------
function controls() {
  const x = PORTAL_X[1];
  const y = PORTAL_Y[1] + 3;
  const out = [S(slab({ x: x - 9, y, w: 18, d: 8, r: 1 }, 52, 22, 3, 0.6), { tone: "mid" })];
  const fy = y + 8;
  out.push(S(k.cylinder(x + 4, y + 4, 3, 74, 3, P, 20, 0.4), { tone: "hi" }));
  out.push(L(k.sideRing([x - 4, fy, 66], 1.8, "y", P) + k.sideRing([x - 4, fy, 59], 1.8, "y", P) + k.sideRing([x + 3, fy, 62], 2.4, "y", P), { tone: "lo" }));
  out.push(D([at([x - 4, fy, 66]), at([x - 4, fy, 59])], { size: 0.7, tone: "mid" }));
  return out.join("");
}

function toolRack() {
  const [x, y] = [-44, 54];
  const out = [S(slab({ x: x - 6, y: y - 6, w: 12, d: 12, r: 0.8 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 2, 46, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: x - 12, y: y - 4, w: 24, d: 8, r: 0.6 }, 48, 3, 2), { tone: "mid" }));
  // three holsters, each with its tool standing in it
  for (const dx of [-8, 0, 8]) {
    out.push(S(k.cylinder(x + dx, y, 2.6, 36, 12, P, 16, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(x + dx, y, 1.4, 51, dx === 0 ? 9 : 6, P, 12, 0.3), { tone: "hi", crease: "none" }));
  }
  return out.join("");
}

const body = [
  floor(),
  backWall(),
  portal(PORTAL_X[0], false),
  portal(PORTAL_X[1], false),
  conveyorBack(IN),
  conveyorFront(IN),
  tray(),
  cageStands(),
  ring(CAGE.x0),
  tieBars(false),
  platform(),
  block(0, { lit: true }),
  tieBars(true),
  ring(CAGE.x1),
  lever(),
  conveyorBack(OUTX),
  block(120),
  conveyorFront(OUTX),
  gun(),
  portal(PORTAL_X[0], true),
  rail(),
  toolRack(),
  portal(PORTAL_X[1], true),
  controls(),
];

const STYLE = `<style>
.iso[data-theme="light"] .fnl-ring{fill:#e9e8e4}.iso[data-theme="light"] .fnl-back{fill:#d4d2cc}
.iso[data-theme="dark"] .fnl-ring{fill:#202020}.iso[data-theme="dark"] .fnl-back{fill:#141414}
.fnl-ring{stroke:none}
</style>`;

const LABEL =
  "Station Final Proses: an open booth over the roller line with a back wall, two portal frames and a hose rail. The block sits in a hand-turned cage over a shot grating; the operator indexes it with a red lever and blows the last loose shot out of its passages with an air gun from the rail, picking finishing tools from the green rack.";

// =============================================================================
// The cycle, as in final-3d.html. The model (fnStep, fnGo) and the moving pieces (fnScene and the
// builders it calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the
// kit inlined. The still above is the approved drawing; the live page follows one block through the
// cycle, as the 3D page does.
// =============================================================================
const CYCLE = [["roll in", 1.4], ["clamp", 0.5]];
for (let f = 0; f < 4; f++) CYCLE.push([`blow ${f}`, 2.6], [`index ${f}`, 1.0]);
CYCLE.push(["unclamp", 0.5], ["roll out", 1.4], ["next", 0.6]);
const M = {
  CAGE,
  BLOCK,
  CONV_Z,
  BLOCK_CZ: CONV_Z + BLOCK.h / 2,
  IN_X: -120,
  OUT_X: 120,
  RAIL,
  PORTAL_X,
  LEVER_X: CAGE.x1 + 9,
  CYCLE,
  // free jet on a wedged grain (SI), as the 3D page
  U_E: 313,
  D_N: 2.5e-3,
  RHO: 1.2,
  CD: 0.44,
  D_SHOT: 0.84e-3,
  K0: 0.8,
  P_REF: 7e5,
};
M.F_HOLD = 20 * ((7600 * Math.PI * M.D_SHOT ** 3) / 6) * 9.81;

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function fnJet(xmm, p0) {
  const x = xmm / 1000;
  const u = (x > 6.2 * M.D_N ? (6.2 * M.U_E * M.D_N) / x : M.U_E) * Math.sqrt(Math.max(0, (p0 - 1e5) / (M.P_REF - 1e5)));
  const F = (0.5 * M.RHO * u * u * M.CD * Math.PI * M.D_SHOT ** 2) / 4;
  const ratio = F / M.F_HOLD;
  const kk = M.K0 * Math.max(0, ratio - 1);
  const mdot = ((0.8 * Math.PI * M.D_N ** 2) / 4) * p0 * Math.sqrt(1.4 / (287 * 293)) * 0.5787;
  return { u, F, ratio, k: kk, Q: (mdot / M.RHO) * 60e3 };
}

function fnState() {
  return { step: 0, pt: 0, t: 0, gap: 50, u: 0, ratio: 0, k: 0, Q: 0, faces: [0, 0, 0, 0], removed: 0 };
}

function fnStep(st, dt) {
  st.pt += dt;
  st.t += dt;
  const [name, dur] = M.CYCLE[st.step];
  const j = fnJet(st.gap, M.P_REF);
  st.u = j.u;
  st.ratio = j.ratio;
  const blowing = name.startsWith("blow");
  const f = blowing ? Number(name.slice(-1)) : 0;
  if (blowing) st.faces[f] = 1 - (1 - st.faces[f]) * Math.exp(-j.k * dt);
  st.k = blowing ? j.k : 0;
  st.Q = blowing ? j.Q : 0;
  st.removed = st.faces.reduce((a, b) => a + b, 0) / 4;
  if (st.pt >= dur) {
    if (name === "next") st.faces = [0, 0, 0, 0];
    st.step = (st.step + 1) % M.CYCLE.length;
    st.pt = 0;
  }
}

// jump to the start of a step; the faces before it are taken as blown at the jet's rate
function fnGo(st, name) {
  st.step = M.CYCLE.findIndex((c) => c[0] === name);
  st.pt = 0;
  const done = M.CYCLE.slice(0, st.step).filter((c) => c[0].startsWith("blow")).length;
  const k = fnJet(st.gap, M.P_REF).k;
  st.faces = [0, 1, 2, 3].map((f) => (f < done ? 1 - Math.exp(-k * 2.6) : 0));
  st.removed = st.faces.reduce((a, b) => a + b, 0) / 4;
}

// a box about the cage axis: centre c and half sizes hs, turned th about the x axis through (y 0, z cz)
function fnBox(c, hs, th, cz, style, marks) {
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

// the BC block at x = bx, turned th about its centre: the deck with its four bores on local +z, two
// passages on each long side (local ±y)
function fnBlock(bx, th, alpha) {
  if (alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const zc = M.BLOCK_CZ;
  const svg = fnBox([bx, 0, zc], [w / 2, d / 2, h / 2], th, zc, { tone: "hi", crease: "lo", lit: true }, (R, on) => {
    const at = (p) => k.iso(R(p), P);
    const circle = (c, r, plane) => k.pathOf(Array.from({ length: 20 }, (_, j) => {
      const a = (j / 20) * 2 * Math.PI;
      return at(plane === "z" ? [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]] : [c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)]);
    }), true);
    let d1 = "";
    if (on([0, 0, 1])) for (let i = 0; i < 4; i++) d1 += circle([bx - w / 2 + 4 + i * 5.33, 0, zc + h / 2], 2.2, "z");
    for (const s of [-1, 1]) if (on([0, s, 0])) d1 += circle([bx + 6, (s * d) / 2, zc + 0.5], 1.6, "y") + circle([bx - 5, (s * d) / 2, zc + 2.5], 1.2, "y");
    return k.lineSvg(d1, { tone: "lit" });
  });
  return alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(3)}">${svg}</g>`;
}

function fnArc(x, r, t0, t1, n) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
    return k.iso([x, Math.cos(t) * r, M.CAGE.z + Math.sin(t) * r], P);
  });
}

// a ring of the cage with its index notches and face bolts turned with it (deg in degrees)
function fnRing(x, deg) {
  const { r, t } = M.CAGE;
  const loop = (xx, rr) => k.pathOf(fnArc(xx, rr, 0, 360, 72), true);
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(xx, r + t)}${loop(xx, r)}"/>`;
  const out = [band(x, "fnl-ring fnl-back"), band(x + 3, "fnl-ring")];
  out.push(k.lineSvg(loop(x + 3, r + t) + loop(x + 3, r), { tone: "mid" }));
  out.push(k.dotsSvg([0, 90, 180, 270].map((a) => fnArc(x + 3, r + t + 0.8, a + deg, a + deg, 1)[0]), { size: 0.7, tone: "lo" }));
  out.push(k.dotsSvg(Array.from({ length: 8 }, (_, i) => fnArc(x + 3, r + t / 2, i * 45 + 22 + deg, i * 45 + 22 + deg, 1)[0]), { size: 0.45 }));
  return out.join("");
}

// the tie bars: the upper ones behind the block, the lower ones in front of it, as in the still
function fnBars(front, deg) {
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

// platform rails, clamp bar and the block, turning together; sorted by depth
function fnCore(th, lift, block) {
  const { x0, x1, z } = M.CAGE;
  const xm = (x0 + 3 + x1) / 2;
  const xh = (x1 - x0 - 3) / 2;
  const items = [];
  const rot = (p) => [p[0], p[1] * Math.cos(th) - (p[2] - z) * Math.sin(th), z + p[1] * Math.sin(th) + (p[2] - z) * Math.cos(th)];
  const add = (c, svg) => items.push({ d: k.depthOf(rot(c), P), svg });
  for (const y of [-10, 10]) add([xm, y, M.CONV_Z - 2], fnBox([xm, y, M.CONV_Z - 2], [xh, 2, 2], th, z, { tone: "mid" }));
  const cz = M.CONV_Z + M.BLOCK.h + 1.5 + lift * 5;
  add([xm, 0, cz], fnBox([xm, 0, cz], [xh, 3, 1.5], th, z, { tone: "mid" }));
  if (block) add([0, 0, M.BLOCK_CZ], block);
  return items.sort((a, b) => a.d - b.d).map((i) => i.svg).join("");
}

// the index plunger and its red lever, swung over while the cage turns
function fnLever(swing) {
  const x = M.LEVER_X;
  const v = [8 * Math.cos(swing) - 14 * Math.sin(swing), 10, 8 * Math.sin(swing) + 14 * Math.cos(swing)];
  const tip = [x + v[0], 20 + v[1], 20 + v[2]];
  const out = [k.solidSvg(k.slabOf({ x: x - 2, y: 14, w: 4, d: 6, r: 0.6 }, 12, 10, P, 2, 0.5), { tone: "mid" })];
  out.push(k.lineSvg(k.segment([x, 20, 20], tip, P), { tone: "mid" }));
  out.push(k.solidSvg(k.cylinder(tip[0], tip[1], 2, tip[2] - 1, 5, P, 16, 0.4), { tone: "hi" }));
  return out.join("");
}

// the blow gun with its nozzle at g, the jet into the face and the loose shot it chases out
function fnGun(g, jet, drops) {
  const [x, y, z] = g;
  const out = [];
  if (jet > 0) for (let i = -2; i <= 2; i++) out.push(k.fadeLineSvg([k.iso([x - 1, y, z - 2], P), k.iso([x - 1 + i * 0.8, y - jet, z - 3 + i * 0.6], P)], { fade: [0, 0.6], tone: "mid" }));
  out.push(k.solidSvg(k.slabOf({ x: x - 1, y, w: 2, d: 6, r: 1 }, z - 3, 2, P, 3, 0.5), { tone: "mid", crease: "none" }));
  out.push(k.solidSvg(k.slabOf({ x: x - 2.5, y: y + 6, w: 5, d: 9, r: 1.5 }, z - 4, 5, P, 3, 0.4), { tone: "mid" }));
  out.push(k.solidSvg(k.slabOf({ x: x - 2, y: y + 12, w: 4, d: 4, r: 1 }, z - 12, 9, P, 3, 0.5), { tone: "mid" }));
  if (drops.length) out.push(k.dotsSvg(drops.map((p) => k.iso(p, P)), { size: 0.55, tone: "mid" }));
  return out.join("");
}

// the hose rail, its trolley over the gun and the hose dropping in a coil to the grip
function fnRail(g) {
  const { y, z } = M.RAIL;
  const out = [k.solidSvg(k.slabOf({ x: M.PORTAL_X[0] - 3, y: y - 2, w: M.PORTAL_X[1] - M.PORTAL_X[0] + 6, d: 4, r: 0.5 }, z, 4, P, 2, 0.4), { tone: "mid" })];
  const tx = g[0] - 2;
  out.push(k.solidSvg(k.slabOf({ x: tx - 5, y: y - 4, w: 10, d: 8, r: 1 }, z - 6, 6, P, 3, 0.4), { tone: "mid" }));
  out.push(k.dotsSvg([k.iso([tx - 3, y + 4, z - 3], P), k.iso([tx + 3, y + 4, z - 3], P)], { size: 0.5 }));
  const helix = Array.from({ length: 7 * 16 + 1 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return k.iso([tx + Math.cos(a) * 3, y + 6 + Math.sin(a) * 3, z - 10 - (i / (7 * 16)) * (z - 76)], P);
  });
  out.push(k.lineSvg(k.pathOf(helix), { tone: "lo" }));
  out.push(k.lineSvg(k.pathOf([k.iso([tx, y + 6, z - 6], P), k.iso([tx, y + 6, z - 10], P)]) + k.pathOf([k.iso([tx, y + 6, 66], P), k.iso([g[0] + 3, g[1] + 12, g[2] + 6], P)]), { tone: "lo" }));
  return out.join("");
}

// everything that moves, for a state
function fnScene(st) {
  const [name, dur] = M.CYCLE[st.step];
  const u = Math.min(1, st.pt / dur);
  const e = u * u * (3 - 2 * u);
  const blowing = name.startsWith("blow");
  const f = blowing || name.startsWith("index") ? Number(name.slice(-1)) : name === "roll in" || name === "clamp" ? 0 : 3;
  // the cage turns a quarter on each index, the operator pulling the lever and swinging the ring round
  const quarters = name.startsWith("index") ? f + e : ["unclamp", "roll out", "next"].includes(name) ? 4 : f;
  const ang = (quarters * Math.PI) / 2;
  const swing = name.startsWith("index") ? Math.sin(u * Math.PI) * -0.6 : 0;
  const inCage = !["roll in", "roll out", "next"].includes(name);
  const lift = name === "clamp" ? 1 - e : name === "unclamp" ? e : inCage ? 0 : 1;
  let bx = 0, alpha = 1;
  if (name === "roll in") {
    bx = M.IN_X * (1 - e);
    alpha = smooth01(0, 0.25, u);
  } else if (name === "roll out") {
    bx = M.OUT_X * e;
    alpha = 1 - smooth01(0.75, 1, u);
  } else if (name === "next") alpha = 0;
  const block = fnBlock(bx, inCage ? ang : 0, alpha);
  const where = bx < -40 ? "in" : bx > 40 ? "out" : "cage";
  // the gun sweeps along the face being blown and backs off while the cage turns
  const face = f % 2 ? M.BLOCK.h / 2 : M.BLOCK.d / 2;
  // at 50 mm the gun stands where the still draws it (y 30, z 52 on face 1)
  const reach = 16.5 + st.gap * 0.08;
  const gx = blowing ? Math.sin(st.pt * 2.2) * 8.5 : 12;
  const g = [gx, face + reach + (blowing ? 0 : 7), blowing ? 52 : 57];
  // loose shot falling out of the face onto the grating, as many as are coming out
  const rate = blowing ? st.k * (1 - st.faces[f]) : 0;
  const n = Math.min(12, Math.round(rate * 18));
  const drops = Array.from({ length: n }, (_, i) => {
    const s = (st.t * 0.9 + i / n) % 1;
    return [-9 + ((i * 7) % 18), face + 1 + s * 6, M.BLOCK_CZ - s * (M.BLOCK_CZ - 7)];
  });
  const deg = (ang * 180) / Math.PI;
  return {
    name,
    ring0: fnRing(M.CAGE.x0, deg),
    barsBack: fnBars(false, deg),
    core: fnCore(ang, lift, where === "cage" ? block : ""),
    barsFront: fnBars(true, deg),
    ring1: fnRing(M.CAGE.x1, deg),
    lever: fnLever(swing),
    blockIn: where === "in" ? block : "",
    blockOut: where === "out" ? block : "",
    gun: fnGun(g, blowing ? reach - 1 : 0, drops),
    rail: fnRail(g),
  };
}

function fnSay(name) {
  return name.startsWith("blow") ? `blowing face ${Number(name.slice(-1)) + 1}` : name.startsWith("index") ? "indexing a quarter turn" : name;
}

function fnReadout(st) {
  return `${fnSay(M.CYCLE[st.step][0])} · loose shot removed ${Math.round(st.removed * 100)}%`;
}

function fnNumbers(st) {
  const f = (x) => Math.round(x).toLocaleString("en-US");
  return `${f(st.gap)} mm · jet ${f(st.u)} m/s at the shot · drag ${st.ratio.toFixed(1)}x the wedge · ${f(st.Q)} L/min`;
}

// ---- self-check: a cycle visits every step in order and clears most of the shot at 50 mm
{
  const st = fnState();
  const seen = [];
  let best = 0;
  for (let i = 0; i < 60 * 40 && !(seen.length > 1 && st.step === 0); i++) {
    fnStep(st, 1 / 60);
    const ph = M.CYCLE[st.step][0];
    if (seen.at(-1) !== ph) seen.push(ph);
    best = Math.max(best, st.removed);
  }
  const want = M.CYCLE.map((c) => c[0]);
  if (JSON.stringify(seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  if (!(best > 0.8)) throw new Error(`only ${(best * 100).toFixed(0)}% of the shot came out`);
  console.log(`cycle check passed (${want.length} steps, ${(best * 100).toFixed(0)}% of the shot out)`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    backWall(),
    portal(PORTAL_X[0], false),
    portal(PORTAL_X[1], false),
    conveyorBack(IN),
    slot("blockIn", f.blockIn),
    conveyorFront(IN),
    tray(),
    cageStands(),
    slot("ring0", f.ring0),
    slot("barsBack", f.barsBack),
    slot("core", f.core),
    slot("barsFront", f.barsFront),
    slot("ring1", f.ring1),
    slot("lever", f.lever),
    conveyorBack(OUTX),
    slot("blockOut", f.blockOut),
    conveyorFront(OUTX),
    slot("gun", f.gun),
    portal(PORTAL_X[0], true),
    slot("rail", f.rail),
    toolRack(),
    portal(PORTAL_X[1], true),
    controls(),
  ];
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `final-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `final-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = fnState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...liveBody(fnScene(st))] });
  const label = (ph) => (ph.startsWith("blow") ? `Blow ${Number(ph.slice(-1)) + 1}` : ph.startsWith("index") ? "Index" : ph[0].toUpperCase() + ph.slice(1));
  const steps = M.CYCLE.map(([ph]) => `<button type="button" data-go="${ph}">${label(ph)}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Nozzle distance <input type="range" min="20" max="150" step="5" value="50" aria-label="Nozzle distance, mm"><output>50 mm</output></label>
<div class="bari-num" data-numbers>${fnNumbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "Final Proses",
    title: "Air blow-off cycle",
    hint: "Click to pause",
    readout: fnReadout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="Final Proses cycle, click or press space to pause">${svg}</div>`,
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
  const fns = [smooth01, fnJet, fnState, fnStep, fnGo, fnBox, fnBlock, fnArc, fnRing, fnBars, fnCore, fnLever, fnGun, fnRail, fnScene, fnSay, fnReadout, fnNumbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, cameraOf, depthOf, pathOf, segment, slabOf, cylinder, solidSvg, lineSvg, dotsSvg, fadeLineSvg };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slots = ["blockIn", "ring0", "barsBack", "core", "barsFront", "ring1", "lever", "blockOut", "gun", "rail"].reduce((o, n) => ((o[n] = svg.querySelector('[data-slot="' + n + '"]')), o), {});
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = fnState();
if (still.matches) { fnGo(st, "blow 0"); st.pt = 1; }
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = fnScene(st);
  for (const n in slots) html(slots[n], f[n]);
  const text = fnReadout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = fnNumbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of stepBtns) if (b.dataset.go === f.name) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  fnStep(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { fnGo(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.gap = Number(range.value); rangeOut.textContent = st.gap + " mm"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __final.at("blow 1", 0.5) pauses that far into that step
window.__final = { at(phase, u = 0) { setPlaying(false); fnGo(st, phase); const d = M.CYCLE[st.step][1]; for (let t = 0; t < u * d - 1e-9; t += 1 / 60) fnStep(st, 1 / 60); draw(); return fnReadout(st); } };
`;
  return k.pageHtml({ title: "Final Proses · air blow-off cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "final-live.html"), html);
  console.log(`wrote ${join(OUT, "final-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
