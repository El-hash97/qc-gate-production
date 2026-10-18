// Isometric figure of station QC Gate 1 (visual inspection) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: two portal frames over the roller line
// carrying an LED light bar, a powered turntable in the line (drive box, guide rails) that
// turns the block so every face comes round to the inspector, a task lamp on an arm at the
// operator side, and the limit-sample board on a side table.
// The live page runs the cycle of qc1-3d.html: roll in, then check a face and turn a quarter, four
// times, and roll on to QC Gate 2. The same light model gives the illuminance on the face being checked
// (light bar plus task lamp); the lamp head rides out along its line to the face at the set distance.
//   node station-kit/figure/stations/qc1.mjs [outDir]
//     →   <outDir>/qc1-{light,dark}.svg and <outDir>/qc1-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/qc1.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
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
function turntable(ticks = true) {
  const out = [];
  const box = { x: -20, y: -20, w: 40, d: 40, r: 2 };
  out.push(S(slab(box, 0, 14, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 7, P, 3), { tone: "faint" }) }));
  out.push(L(k.pathOf([at([20, -12, 3]), at([20, 12, 3]), at([20, 12, 11]), at([20, -12, 11])], true), { tone: "lo" }));
  out.push(D([[-9, 4], [9, 4], [9, 10], [-9, 10]].map(([y, z]) => at([20, y, z])), { size: 0.4 }));
  out.push(S(k.cylinder(0, 0, 7, 14, TT.z - 17, P, 32, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, TT.r, TT.z - 3, 3, P, 72, 0.6), { tone: "mid" }));
  if (ticks) {
    const t = k.radialTicks(0, 0, TT.r - 0.5, 36, 9, TT.z, [1.4, 3], P);
    out.push(L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }));
  }
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

// =============================================================================
// The cycle, as in qc1-3d.html. The model (qcStep, qcGo) and the moving pieces (qcScene and the builders it
// calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the kit inlined.
// The still above is the approved drawing; the live page follows one block through the cycle.
// =============================================================================
const CYCLE = [["roll in", 1.4], ["settle", 0.4]];
for (let f = 0; f < 4; f++) CYCLE.push([`check ${f}`, 2.0], [`turn ${f}`, 1.0]);
CYCLE.push(["roll out", 1.4], ["next", 0.6]);
// the task lamp in the still: clamp, elbow and head; at 0.95 m the head stands just there
const LAMP_J1 = [PORTAL_X[1] - 2, PORTAL_Y[1] + 3, 72];
const LAMP_HEAD = [PORTAL_X[1] + 16, PORTAL_Y[1] + 6, 74];
const FACE0 = [0, BLOCK.d / 2, TT.z + BLOCK.h / 2];
const M = {
  BLOCK,
  TT,
  CONV_Z,
  IN_X: -120,
  OUT_X: 120,
  CYCLE,
  LAMP_J1,
  LAMP_HEAD,
  FACE0,
  LAMP_ELBOW: [PORTAL_X[1] + 8 - (LAMP_J1[0] + (LAMP_HEAD[0] - LAMP_J1[0]) * 0.55), PORTAL_Y[1] + 12 - (LAMP_J1[1] + (LAMP_HEAD[1] - LAMP_J1[1]) * 0.55), 84 - (LAMP_J1[2] + (LAMP_HEAD[2] - LAMP_J1[2]) * 0.55)],
  // light model (SI, the 3D page's frame: y up, z towards the inspector)
  ROLL_Y: 0.47,
  BLOCK_M: [0.475, 0.336, 0.371],
  BAR: { y: 2.3 - 0.12, z: 0.45, half: 0.8, n: 9 },
  PHI_BAR: 6000,
  I_TASK: 1600 / (2 * Math.PI * (1 - Math.cos((30 * Math.PI) / 180))),
  LAMP_DIR: (() => {
    const v = [0.45, 0.67, 0.56];
    const n = Math.hypot(...v);
    return v.map((c) => c / n);
  })(),
  E_NEED: 1000,
};

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// illuminance on the face looking at the inspector (face f), from the light bar and the task lamp at dist m
function qcLux(f, dist) {
  const half = f % 2 ? M.BLOCK_M[0] / 2 : M.BLOCK_M[2] / 2;
  const Pc = [0, M.ROLL_Y + M.BLOCK_M[1] / 2, half];
  let Ebar = 0;
  for (let i = 0; i < M.BAR.n; i++) {
    const s = [-M.BAR.half + (2 * M.BAR.half * i) / (M.BAR.n - 1), M.BAR.y - 0.05, M.BAR.z];
    const d = [s[0] - Pc[0], s[1] - Pc[1], s[2] - Pc[2]];
    const r = Math.hypot(...d);
    const cf = d[2] / r;
    const cs = d[1] / r;
    if (cf > 0 && cs > 0) Ebar += ((M.PHI_BAR / M.BAR.n / Math.PI) * cs * cf) / (r * r);
  }
  const Etask = (M.I_TASK * M.LAMP_DIR[2]) / (dist * dist);
  return { Ebar, Etask };
}

function qcState() {
  return { step: 0, pt: 0, dist: 0.95, E: 0, Ebar: 0, Etask: 0, judged: [0, 0, 0, 0] };
}

function qcFace(name) {
  return name.startsWith("check") || name.startsWith("turn") ? Number(name.slice(-1)) : name === "roll out" || name === "next" ? 3 : 0;
}

function qcStep(st, dt) {
  st.pt += dt;
  const [name, dur] = M.CYCLE[st.step];
  const u = Math.min(1, st.pt / dur);
  const f = qcFace(name);
  const { Ebar, Etask } = qcLux(f, st.dist);
  st.Ebar = Ebar;
  st.Etask = Etask;
  st.E += (Ebar + Etask - st.E) * (1 - Math.exp(-dt / 0.15));
  if (name.startsWith("check") && u > 0.9) st.judged[f] = st.E >= M.E_NEED ? 1 : 0;
  if (u >= 1) {
    if (name === "next") st.judged = [0, 0, 0, 0];
    st.step = (st.step + 1) % M.CYCLE.length;
    st.pt = 0;
  }
}

function qcGo(st, name) {
  st.step = M.CYCLE.findIndex((c) => c[0] === name);
  st.pt = 0;
  const { Ebar, Etask } = qcLux(qcFace(name), st.dist);
  st.E = Ebar + Etask;
}

// a plan point turned th about the turntable axis
function qcTurn([x, y], th) {
  return [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
}

// a box on the table: plan corners turned th, extruded from z
function qcBox([x0, x1], [y0, y1], th, z, h, bevel, style) {
  const ring = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((q) => qcTurn(q, th));
  return k.solidSvg(k.extrude(ring, z, h, P, { bevel }), style);
}

// the BC block at x = bx (base z), turned th: deck bores on top, a passage on each side face we can see
function qcBlock(bx, z, th, alpha) {
  if (alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const T = (q) => {
    const [x, y] = qcTurn(q, th);
    return [x + bx, y];
  };
  const plan = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(T);
  const seam = k.lineSvg(k.ringSeam(plan, z + 5, P), { tone: "lit" });
  const out = [k.solidSvg(k.extrude(plan, z, h, P, { bevel: 0.6 }), { tone: "hi", crease: "lo", lit: true, inner: seam })];
  out.push(k.lineSvg([0, 1, 2, 3].map((i) => k.ring(...T([-w / 2 + 4 + i * 5.33, 0]), 2.2, z + h, P, 24)).join(""), { tone: "lit" }));
  const [vx, vy] = k.towardViewer(P);
  let rings = "";
  // [face centre in the block's plan, outward normal, tangent, passage offset along the tangent]
  for (const [c, n, t, off] of [[[0, d / 2], [0, 1], [1, 0], 6], [[0, -d / 2], [0, -1], [1, 0], 6], [[w / 2, 0], [1, 0], [0, 1], 2.5], [[-w / 2, 0], [-1, 0], [0, 1], 2.5]]) {
    const nw = qcTurn(n, th);
    if (nw[0] * vx + nw[1] * vy <= 0) continue;
    const tw = qcTurn(t, th);
    const cw = T([c[0] + t[0] * off, c[1] + t[1] * off]);
    rings += k.pathOf(Array.from({ length: 16 }, (_, j) => {
      const a = (j / 16) * 2 * Math.PI;
      return k.iso([cw[0] + tw[0] * 1.6 * Math.cos(a), cw[1] + tw[1] * 1.6 * Math.cos(a), z + 9 + 1.6 * Math.sin(a)], P);
    }), true);
  }
  out.push(k.lineSvg(rings, { tone: "lit" }));
  const svg = out.join("");
  return alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(3)}">${svg}</g>`;
}

// a guide rail at y on the table: two posts and the bar, turned th
function qcRail(y, th) {
  const z = M.TT.z;
  const out = [];
  for (const x of [-18, 18]) out.push(qcBox([x - 1.5, x + 1.5], [y - 1.5, y + 1.5], th, z, 8, 0.3, { tone: "mid", crease: "none" }));
  out.push(qcBox([-22, 22], [y - 1.5, y + 1.5], th, z + 8, 3, 0.4, { tone: "mid" }));
  return out.join("");
}

// the turning part of the table: its degree scale, the rails and the block on it, sorted by depth
function qcTable(th, block) {
  const t = k.radialTicks(0, 0, M.TT.r - 0.5, 36, 9, M.TT.z, [1.4, 3], P, th);
  const scale = k.lineSvg(t.minor, { tone: "lo" }) + k.lineSvg(t.major, { tone: "mid" });
  const items = [-14, 14].map((y) => ({ d: k.depthOf([...qcTurn([0, y], th), M.TT.z], P), svg: qcRail(y, th) }));
  if (block) items.push({ d: k.depthOf([0, 0, M.TT.z], P), svg: block });
  return scale + items.sort((a, b) => a.d - b.d).map((i) => i.svg).join("");
}

// the task lamp: clamp on the post, arm and elbow out to the head, and the beam onto the face it lights
function qcLamp(face, dist, on) {
  const H = M.LAMP_HEAD, F0 = M.FACE0;
  const dir = [H[0] - F0[0], H[1] - F0[1], H[2] - F0[2]];
  const s = dist / 0.95;
  const head = [face[0] + dir[0] * s, face[1] + dir[1] * s, face[2] + dir[2] * s];
  const j1 = M.LAMP_J1;
  const j2 = [0, 1, 2].map((i) => j1[i] + (head[i] - j1[i]) * 0.55 + M.LAMP_ELBOW[i]);
  const at = (p) => k.iso(p, P);
  const out = [k.solidSvg(k.slabOf({ x: j1[0] - 2, y: j1[1] - 1, w: 6, d: 4, r: 0.6 }, 68, 8, P, 2, 0.5), { tone: "mid" })];
  out.push(k.lineSvg(k.pathOf([at(j1), at(j2), at(head)]), { tone: "mid" }));
  out.push(k.dotsSvg([at(j1), at(j2)], { size: 0.8, tone: "mid" }));
  if (on) for (let i = -2; i <= 2; i++) out.push(k.fadeLineSvg([at([head[0], head[1], head[2] - 4]), at([face[0] + i * 3, face[1] + 0.5, face[2] + i * 1.5])], { fade: [0.15, 0.9], tone: "faint" }));
  out.push(k.solidSvg(k.cylinder(head[0], head[1], 5, head[2] - 4, 5, P, 32, 0.6), { tone: "mid" }));
  out.push(k.lineSvg(k.ring(head[0], head[1], 3.6, head[2] - 4, P, 24), { tone: "hi" }));
  return out.join("");
}

// everything that moves, for a state
function qcScene(st) {
  const [name, dur] = M.CYCLE[st.step];
  const u = Math.min(1, st.pt / dur);
  const e = u * u * (3 - 2 * u);
  const f = qcFace(name);
  const quarters = name.startsWith("turn") ? f + e : name === "roll out" || name === "next" ? 4 : f;
  const th = (quarters * Math.PI) / 2;
  let bx = 0, alpha = 1;
  if (name === "roll in") {
    bx = M.IN_X * (1 - e);
    alpha = smooth01(0, 0.25, u);
  } else if (name === "roll out") {
    bx = M.OUT_X * e;
    alpha = 1 - smooth01(0.75, 1, u);
  } else if (name === "next") alpha = 0;
  const onTable = !["roll in", "roll out", "next"].includes(name);
  // off the plate the block rides the rollers, 2 higher than the plate
  const z = M.TT.z + 2 * smooth01(20, 30, Math.abs(bx));
  const block = qcBlock(bx, z, onTable ? th : 0, alpha);
  const where = bx < -30 ? "in" : bx > 30 ? "out" : "table";
  const half = f % 2 ? M.BLOCK.w / 2 : M.BLOCK.d / 2;
  return {
    name,
    table: qcTable(th, where === "table" ? block : ""),
    blockIn: where === "in" ? block : "",
    blockOut: where === "out" ? block : "",
    lamp: qcLamp([0, half, M.FACE0[2]], st.dist, name.startsWith("check")),
  };
}

function qcReadout(st) {
  const [name] = M.CYCLE[st.step];
  const f = qcFace(name);
  const dark = st.E < M.E_NEED;
  const say = name.startsWith("check") ? (dark ? `face ${f + 1}: too dark to judge` : `checking face ${f + 1}`) : name.startsWith("turn") ? "turning a quarter" : name;
  return `${say} · ${Math.round(st.E).toLocaleString("en-US")} lx on the face`;
}

function qcNumbers(st) {
  const f = (x) => Math.round(x).toLocaleString("en-US");
  return `task lamp at ${st.dist.toFixed(2)} m: ${f(st.Etask)} lx + light bar ${f(st.Ebar)} lx · needs ${f(M.E_NEED)} lx · ${st.judged.filter((x) => x).length} of 4 faces judged`;
}

// ---- self-check: a cycle visits every step in order and judges all four faces at the default distance
{
  const st = qcState();
  const seen = [];
  let judged = 0;
  for (let i = 0; i < 60 * 40 && !(seen.length > 1 && st.step === 0); i++) {
    qcStep(st, 1 / 60);
    const ph = M.CYCLE[st.step][0];
    if (seen.at(-1) !== ph) seen.push(ph);
    judged = Math.max(judged, st.judged.reduce((a, b) => a + b, 0));
  }
  const want = M.CYCLE.map((c) => c[0]);
  if (JSON.stringify(seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  if (judged !== 4) throw new Error(`only ${judged} of 4 faces judged at 0.95 m`);
  const far = qcLux(0, 1.6);
  if (far.Ebar + far.Etask >= M.E_NEED) throw new Error("1.6 m should be too dark to judge");
  console.log(`cycle check passed (${want.length} steps, 4 faces judged at 0.95 m, ${Math.round(far.Ebar + far.Etask)} lx at 1.6 m)`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    post(PORTAL_X[0], PORTAL_Y[0]),
    post(PORTAL_X[1], PORTAL_Y[0]),
    conveyorBack(IN),
    slot("blockIn", f.blockIn),
    conveyorFront(IN),
    turntable(false),
    light(),
    slot("table", f.table),
    conveyorBack(OUTX),
    slot("blockOut", f.blockOut),
    conveyorFront(OUTX),
    post(PORTAL_X[0], PORTAL_Y[1]),
    portalBeams(),
    sampleTable(),
    post(PORTAL_X[1], PORTAL_Y[1]),
    slot("lamp", f.lamp),
  ];
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
    writeFileSync(join(OUT, `qc1-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `qc1-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = qcState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: liveBody(qcScene(st)) });
  const label = (ph) => (ph.startsWith("check") ? `Check ${Number(ph.slice(-1)) + 1}` : ph.startsWith("turn") ? "Turn" : ph[0].toUpperCase() + ph.slice(1));
  const steps = M.CYCLE.map(([ph]) => `<button type="button" data-go="${ph}">${label(ph)}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Task lamp distance <input type="range" min="0.5" max="1.6" step="0.05" value="0.95" aria-label="Task lamp distance, m"><output>0.95 m</output></label>
<div class="bari-num" data-numbers>${qcNumbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "QC Gate 1",
    title: "Visual inspection cycle",
    hint: "Click to pause",
    readout: qcReadout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="QC Gate 1 cycle, click or press space to pause">${svg}</div>`,
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
  const fns = [smooth01, qcLux, qcState, qcFace, qcStep, qcGo, qcTurn, qcBox, qcBlock, qcRail, qcTable, qcLamp, qcScene, qcReadout, qcNumbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, pathOf, ring, ringSeam, extrude, slabOf, cylinder, radialTicks, towardViewer, depthOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slots = ["blockIn", "table", "blockOut", "lamp"].reduce((o, n) => ((o[n] = svg.querySelector('[data-slot="' + n + '"]')), o), {});
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = qcState();
if (still.matches) { qcGo(st, "check 0"); st.pt = 1; }
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = qcScene(st);
  for (const n in slots) html(slots[n], f[n]);
  const text = qcReadout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = qcNumbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of stepBtns) if (b.dataset.go === f.name) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  qcStep(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { qcGo(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.dist = Number(range.value); rangeOut.textContent = st.dist.toFixed(2) + " m"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __qc1.at("turn 0", 0.5) pauses that far into that step
window.__qc1 = { at(phase, u = 0) { setPlaying(false); qcGo(st, phase); const d = M.CYCLE[st.step][1]; for (let t = 0; t < u * d - 1e-9; t += 1 / 60) qcStep(st, 1 / 60); draw(); return qcReadout(st); } };
`;
  return k.pageHtml({ title: "QC Gate 1 · visual inspection cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "qc1-live.html"), html);
  console.log(`wrote ${join(OUT, "qc1-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
