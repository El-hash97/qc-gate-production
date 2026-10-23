// Isometric figure of station Spray Booth (rust-preventive oil) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: inside the booth (back wall with its long window
// and the left wall with the exit opening; front, right and roof cut away) the roller line from
// QC Gate 2 turns 90 degrees and runs out towards Junbiki. Over the outgoing line stands the spray
// portal with five nozzles (top, two side spray bars, two ends), the oil tank under it and the
// pump behind it, feeding the manifold.
// The live page runs the cycle of spray-3d.html: the block rolls in from QC Gate 2, round the corner and
// under the portal, five nozzles coat its five faces (film eta Q / A per face), and it rolls on to Junbiki.
//   node station-kit/figure/stations/spray.mjs [outDir]
//     →   <outDir>/spray-{light,dark}.svg and <outDir>/spray-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/spray.mjs --check   runs the cycle model's self-check only
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";
import { liveHtml } from "../live-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as QC Gate 2; the line comes in along +y, turns, and leaves along -x)
const PAD = { x: -205, y: -108, w: 245, d: 173, r: 8 };
const CONV_Z = 23, CW = 15;
const R = 35, C = [-35, 0];                  // corner: centre-line radius and centre
const IN_Y = [-100, 0], OUT_X = [-35, -190], OUT_Y = R;
const PORTAL = { x: -107, w: 17.5, d: 21, top: 62 };
const BLOCK = { w: 24, d: 19, h: 17 };
const AXIS_Z = CONV_Z + BLOCK.h / 2;
const WALL = { x0: -198, x1: 30, y0: -103, y1: 57, h: 56, t: 3 }; // drawn lower than the real 3.1 m so the portal reads
const PUMP = [-149.5, -2];

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [WALL.x0, WALL.y0, WALL.h], [WALL.x1, WALL.y0, WALL.h], [WALL.x0, WALL.y1, WALL.h]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const loop = (pts) => k.pathOf(pts.map(at), true);
const byDepth = (items) => items.sort((a, b) => k.depthOf(a[0], P) - k.depthOf(b[0], P)).map((i) => i[1]);

// ---- floor and booth walls ----------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// back wall with the long window and the opening where the line comes in; left wall with the exit
function walls() {
  const { x0, x1, y0, y1, h, t } = WALL;
  const wall = (plan, z, hh) => S(slab({ ...plan, r: 0.4 }, z, hh, 2, 0.3), { tone: "lo" });
  const out = [];
  const gate = [-22, 22], lintel = 42;
  out.push(wall({ x: x0, y: y0, w: gate[0] - x0, d: t }, 0, h));
  out.push(wall({ x: gate[0], y: y0, w: gate[1] - gate[0], d: t }, lintel, h - lintel));
  out.push(wall({ x: gate[1], y: y0, w: x1 - gate[1], d: t }, 0, h));
  const win = [[x0 + 22, y0 + t, 22], [gate[0] - 22, y0 + t, 22], [gate[0] - 22, y0 + t, 46], [x0 + 22, y0 + t, 46]];
  out.push(`<path class="sp-glass" d="${loop(win)}"/>`);
  out.push(L(loop(win), { tone: "mid" }));
  out.push(L(k.pathOf([at([x0 + 22, y0 + t, 34]), at([gate[0] - 22, y0 + t, 34])]), { tone: "faint" }));
  const exit = [OUT_Y - 22, OUT_Y + 22];
  out.push(wall({ x: x0, y: y0 + t, w: t, d: exit[0] - y0 - t }, 0, h));
  out.push(wall({ x: x0, y: exit[0], w: t, d: exit[1] - exit[0] }, lintel, h - lintel));
  out.push(wall({ x: x0, y: exit[1], w: t, d: y1 - exit[1] }, 0, h));
  return out.join("");
}

// ---- conveyors -------------------------------------------------------------------
const roll = (plan) => S(slab(plan, CONV_Z - 4.6, 4.6, 6), { tone: "mid", crease: "none" });
const rail = (plan) => S(slab({ ...plan, r: 0.5 }, CONV_Z - 8, 9, 2, 0.4), { tone: "mid" });
const leg = (x, y) => S(slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.4 }, 0, CONV_Z - 7, 2), { tone: "mid", crease: "none" });

// The line's centre path: up the incoming straight (x = 0), round the corner, out along y = R. Each rail is one
// band at a fixed offset from it, so the straights and the corner join without end faces stacking up.
const bandAt = (o, n = 18) => {
  const pts = [[o, IN_Y[0]], [o, IN_Y[1]]];
  for (let i = 1; i < n; i++) { const t = (i / n) * (Math.PI / 2); pts.push([C[0] + Math.cos(t) * (R + o), C[1] + Math.sin(t) * (R + o)]); }
  pts.push([OUT_X[0], R + o], [OUT_X[1], R + o]);
  return pts;
};
const railBand = (o0, o1) => S(k.extrude([...bandAt(o1), ...bandAt(o0).reverse()], CONV_Z - 8, 9, P, { convex: false }), { tone: "mid" });
const legsAt = (o) => [leg(o, IN_Y[0] + 8), leg(o, -20), ...[OUT_X[0] - 14, PORTAL.x - 36, OUT_X[1] + 8].map((x) => leg(x, R + o))].join("");

// the inside rail (behind everything on the line) and, after the blocks, the outside rail
const innerRail = () => legsAt(-CW - 2) + railBand(-CW - 4, -CW);
const outerRail = () => legsAt(CW + 2) + railBand(CW, CW + 4);

function inRollers() {
  const out = [];
  for (let y = IN_Y[0] + 3; y < IN_Y[1] - 3; y += 7) out.push(roll({ x: -CW, y, w: 2 * CW, d: 4.6, r: 2.3 }));
  return out.join("");
}

// the corner rollers: radial, a little wider at the outside
function cornerRollers() {
  const rollers = [];
  for (let i = 0; i < 9; i++) {
    const t = ((i + 0.5) / 9) * (Math.PI / 2);
    const [cx, cy] = [C[0] + Math.cos(t) * R, C[1] + Math.sin(t) * R];
    const [rx, ry] = [Math.cos(t), Math.sin(t)], [tx, ty] = [-Math.sin(t), Math.cos(t)];
    const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + rx * a * CW + tx * b * 2.3 * (1 + a * 0.3), cy + ry * a * CW + ty * b * 2.3 * (1 + a * 0.3)]);
    rollers.push([[cx, cy, CONV_Z], S(k.extrude(ring, CONV_Z - 4.6, 4.6, P), { tone: "mid", crease: "none" })]);
  }
  return byDepth(rollers).join("");
}

function outRollers() {
  const out = [];
  for (let x = OUT_X[1] + 3; x < OUT_X[0] - 3; x += 7) out.push(roll({ x, y: OUT_Y - CW, w: 4.6, d: 2 * CW, r: 2.3 }));
  return out.join("");
}

// ---- BC block, deck up; along "x" (outgoing) or "y" (incoming) ---------------------
function block(cx, cy, along = "x", { lit = false } = {}) {
  const { h } = BLOCK;
  const [w, d] = along === "x" ? [BLOCK.w, BLOCK.d] : [BLOCK.d, BLOCK.w];
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const top = CONV_Z + h;
  const out = [S(slab(plan, CONV_Z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, CONV_Z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  const bores = [0, 1, 2, 3].map((i) => (along === "x" ? [plan.x + 4 + i * 5.33, cy] : [cx, plan.y + 4 + i * 5.33]));
  out.push(L(bores.map(([x, y]) => k.ring(x, y, 2.2, top, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  return out.join("");
}

// ---- the spray portal, nozzles, pump, manifold and oil tank -------------------------
const { x: PX, w: PW, d: PD, top: PTOP } = PORTAL;
const post = (x, y) => S(slab({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.3 }, 0, PTOP, 2, 0.3), { tone: "mid" });
const sprayBar = (y) => S(slab({ x: PX - PW, y: y - 1, w: 2 * PW, d: 2, r: 1 }, AXIS_Z - 1, 2, 4), { tone: "hi", crease: "none" });
const nozzle = (x, y, z) => S(k.cylinder(x, y, 1.1, z, 3, P, 12, 0.2), { tone: "hi" });
const mist = (from, to, spread, axes) => {
  const out = [];
  for (let i = -2; i <= 2; i++) {
    const end = [...to];
    for (const a of axes) end[a] += i * spread;
    out.push(k.fadeLineSvg([at(from), at(end)], { fade: [0, 0.7], tone: "mid" }));
  }
  return out.join("");
};

function pump() {
  const [x, y] = PUMP;
  const plan = { x: x - 12, y: y - 9.5, w: 24, d: 19, r: 0.8 };
  const out = [S(slab(plan, 0, 37, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 12, P, 2), { tone: "faint" }) })];
  out.push(S(k.cylinder(x - 5, y, 3.5, 37, 10, P, 24, 0.4), { tone: "hi" }));
  // the manifold: up from the pump, across to the portal and along its back-left corner to the beam
  const px = x + 6;
  out.push(S(slab({ x: px - 1, y: y - 1, w: 2, d: 2, r: 1 }, 37, PTOP + 2 - 37, 4), { tone: "hi", crease: "none" }));
  out.push(S(slab({ x: px - 1, y: y - 1, w: PX - PW - px + 1, d: 2, r: 1 }, PTOP + 1, 2, 4), { tone: "hi", crease: "none" }));
  out.push(S(slab({ x: PX - PW - 1, y: y - 1, w: 2, d: OUT_Y - PD - y + 1, r: 1 }, PTOP + 1, 2, 4), { tone: "hi", crease: "none" }));
  return out.join("");
}

function tank() {
  const plan = { x: PX - 16, y: OUT_Y - 13, w: 32, d: 26, r: 1 };
  return S(slab(plan, 0, 17, 2, 0.5), { tone: "lo", inner: L(k.planOutline(k.insetPlan(plan, 2), 17, P), { tone: "faint" }) });
}

function portalTop() {
  const out = [];
  for (const y of [OUT_Y - PD, OUT_Y + PD]) out.push(S(slab({ x: PX - PW - 1.5, y: y - 1.5, w: 2 * PW + 3, d: 3, r: 0.3 }, PTOP - 3, 3, 2, 0.3), { tone: "mid" }));
  for (const x of [PX - PW, PX, PX + PW]) out.push(S(slab({ x: x - 1.5, y: OUT_Y - PD + 1.5, w: 3, d: 2 * PD - 3, r: 0.3 }, PTOP - 3, 3, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

const BTOP = CONV_Z + BLOCK.h;
const body = [
  floor(),
  walls(),
  pump(),
  post(PX - PW, OUT_Y - PD),
  post(PX + PW, OUT_Y - PD),
  innerRail(),
  tank(),
  inRollers(),
  cornerRollers(),
  outRollers(),
  block(0, -60, "y"),
  block(-168, OUT_Y, "x"),
  sprayBar(OUT_Y - PD),
  nozzle(PX, OUT_Y - PD + 1, AXIS_Z - 1.5),
  mist([PX - PW, OUT_Y, PTOP - 6], [PX - BLOCK.w / 2, OUT_Y, AXIS_Z], 2.5, [1, 2]),
  block(PX, OUT_Y, "x", { lit: true }),
  mist([PX, OUT_Y, PTOP - 6], [PX, OUT_Y, BTOP], 3.5, [0]),
  mist([PX + PW, OUT_Y, PTOP - 6], [PX + BLOCK.w / 2, OUT_Y, AXIS_Z], 2.5, [1]),
  mist([PX, OUT_Y + PD - 2, AXIS_Z], [PX, OUT_Y + BLOCK.d / 2, AXIS_Z], 3.5, [0]),
  outerRail(),
  sprayBar(OUT_Y + PD),
  nozzle(PX, OUT_Y + PD - 1, AXIS_Z - 1.5),
  post(PX - PW, OUT_Y + PD),
  post(PX + PW, OUT_Y + PD),
  portalTop(),
  nozzle(PX, OUT_Y, PTOP - 6),
  nozzle(PX - PW, OUT_Y, PTOP - 6),
  nozzle(PX + PW, OUT_Y, PTOP - 6),
];

const STYLE = `<style>
.iso[data-theme="light"] .sp-glass{fill:#eef1f4}
.iso[data-theme="dark"] .sp-glass{fill:#161a1e}
.sp-glass{stroke:none}
</style>`;

const LABEL =
  "Station Spray Booth, rust-preventive oil: inside the booth the roller line from QC Gate 2 turns the corner and runs out towards Junbiki. The OK block stops under the spray portal, where five nozzles mist rust-preventive oil onto its top, both long sides and both ends. The pump behind the line feeds the nozzles from the oil tank under the rollers, which catches the overspray.";

// =============================================================================
// The cycle, as in spray-3d.html. The model (sprStep, sprGo) and the moving pieces (sprScene and the builders
// it calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the kit inlined.
// The still above is the approved drawing; the live page follows one block: in from QC Gate 2, round the
// corner, under the portal, sprayed on five faces, out towards Junbiki.
// =============================================================================
const CYCLE = [["roll in", 1.4], ["corner", 1.5], ["to portal", 1.3], ["spray", 3], ["drip", 0.8], ["roll out", 1.8], ["next", 0.4]];
const M = {
  BLOCK,
  CONV_Z,
  CYCLE,
  C,
  R,
  IN_Y,
  OUT_X,
  OUT_Y,
  PX,
  PW: PORTAL.w,
  PD: PORTAL.d,
  PTOP: PORTAL.top,
  AXIS_Z,
  PUMP,
  // SI, as in the 3D page: Q a nozzle's flow (mL/min), ETA the share of the spray that lands, H_MIN the film the block must leave with (um)
  Q_ML: 12,
  ETA: 0.6,
  H_MIN: 1.5,
  CLOG: 0.2,
  // face areas (m2): top, the two long sides, the two ends
  AREA: [0.475 * 0.371, 0.475 * 0.336, 0.475 * 0.336, 0.336 * 0.371, 0.336 * 0.371],
};

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function sprState() {
  return { step: 0, pt: 0, time: 3, broken: false, flow: 1, mist: 0, film: [0, 0, 0, 0, 0], clock: 0 };
}

// the spray step lasts as long as the slider says
function sprDur(st) {
  const [name, d] = M.CYCLE[st.step];
  return name === "spray" ? st.time : d;
}

// um a second on face i: eta Q / A
function sprRate(i, flow) {
  return ((M.ETA * (M.Q_ML * (i === 0 ? flow : 1) * 1e-6)) / 60 / M.AREA[i]) * 1e6;
}

function sprFilmAfter(st) {
  const flow = st.broken ? M.CLOG : 1;
  return M.AREA.map((_, i) => sprRate(i, flow) * st.time);
}

function sprStep(st, dt) {
  st.clock += dt;
  st.pt += dt;
  const [name] = M.CYCLE[st.step];
  const spraying = name === "spray";
  st.flow += ((st.broken ? M.CLOG : 1) - st.flow) * (1 - Math.exp(-dt / 0.6));
  if (spraying) st.film = st.film.map((h, i) => h + sprRate(i, st.flow) * dt);
  st.mist += ((spraying ? 1 : 0) - st.mist) * (1 - Math.exp(-dt / (spraying ? 0.12 : 0.25)));
  if (st.pt >= sprDur(st)) {
    st.step = (st.step + 1) % M.CYCLE.length;
    st.pt = 0;
    if (M.CYCLE[st.step][0] === "roll in") st.film = [0, 0, 0, 0, 0];
  }
}

function sprGo(st, name) {
  st.step = M.CYCLE.findIndex((c) => c[0] === name);
  st.pt = 0;
  st.flow = st.broken ? M.CLOG : 1;
  st.mist = name === "spray" ? 1 : 0;
  st.film = name === "drip" || name === "roll out" ? sprFilmAfter(st) : [0, 0, 0, 0, 0];
}

// where the block is (centre on the floor plan), which way it points, and how visible it is
function sprPose(name, u) {
  const e = u * u * (3 - 2 * u);
  if (name === "roll in") return { x: 0, y: M.IN_Y[0] + 10 + (-M.IN_Y[0] - 10) * e, dx: 0, dy: 1, alpha: smooth01(0, 0.25, u) };
  if (name === "corner") {
    const t = u * (Math.PI / 2);
    return { x: M.C[0] + Math.cos(t) * M.R, y: M.C[1] + Math.sin(t) * M.R, dx: -Math.sin(t), dy: Math.cos(t), alpha: 1 };
  }
  if (name === "to portal") return { x: M.C[0] + (M.PX - M.C[0]) * e, y: M.OUT_Y, dx: -1, dy: 0, alpha: 1 };
  if (name === "spray" || name === "drip") return { x: M.PX, y: M.OUT_Y, dx: -1, dy: 0, alpha: 1 };
  if (name === "roll out") return { x: M.PX + (M.OUT_X[1] + 15 - M.PX) * e, y: M.OUT_Y, dx: -1, dy: 0, alpha: 1 - smooth01(0.8, 1, u) };
  return { x: 0, y: 0, dx: 0, dy: 1, alpha: 0 };
}

// the BC block, deck up, long axis along its heading; `wet` fades in the oiled look
function sprBlock(p, wet) {
  if (p.alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const z = M.CONV_Z;
  const vx = -p.dy, vy = p.dx;
  const T = ([a, b]) => [p.x + a * p.dx + b * vx, p.y + a * p.dy + b * vy];
  const ring = k.ringOf({ x: -w / 2, y: -d / 2, w, d, r: 1 }, 2).map(T);
  const bores = [0, 1, 2, 3].map((i) => k.ring(...T([-8 + i * 5.33, 0]), 2.2, z + h, P, 24)).join("");
  const seam = (tone) => k.lineSvg(k.ringSeam(ring, z + 5, P), { tone });
  let out = k.solidSvg(k.extrude(ring, z, h, P, { bevel: 0.6 }), { tone: "hi", crease: "lo", inner: seam("faint") }) + k.lineSvg(bores, { tone: "mid" });
  if (wet > 0.01) {
    const sheen = k.solidSvg(k.extrude(ring, z, h, P, { bevel: 0.6 }), { tone: "hi", crease: "lo", lit: true, inner: seam("lit") }) + k.lineSvg(bores, { tone: "lit" });
    out += `<g opacity="${wet.toFixed(3)}">${sheen}</g>`;
  }
  return p.alpha >= 0.999 ? out : `<g opacity="${p.alpha.toFixed(3)}">${out}</g>`;
}

// a spray cone: droplets streaking down five lines from the nozzle to the face, `a` as strong as the spray
function sprMist(from, to, spread, axes, a, clock, phase) {
  if (a < 0.02) return "";
  const p0 = k.iso(from, P);
  const items = [];
  let cone = "";
  for (let i = -2; i <= 2; i++) {
    const end = [...to];
    for (const ax of axes) end[ax] += i * spread;
    const p1 = k.iso(end, P);
    cone += k.fadeLineSvg([p0, p1], { fade: [0, 0.7], tone: "mid" });
    const q = (s) => [p0[0] + (p1[0] - p0[0]) * s, p0[1] + (p1[1] - p0[1]) * s];
    for (const o of [0, 0.5]) {
      const t = (((clock * 1.4 + i * 0.19 + phase + o) % 1) + 1) % 1;
      items.push([k.pathOf([q(Math.max(0, t - 0.28)), q(t)]), Math.min(1, a * 1.3) * Math.sin(Math.PI * t)]);
    }
  }
  return `<g opacity="${(a * 0.8).toFixed(2)}">${cone}</g>${k.fadedSvg(items, { tone: "hi" })}`;
}

// oil running up the manifold from the pump to the portal, while it sprays
function sprFlow(st) {
  if (st.mist < 0.02) return "";
  const [x, y] = M.PUMP;
  const px = x + 6;
  const top = M.PTOP + 2;
  const path = [[px, y, 37], [px, y, top], [M.PX - M.PW, y, top], [M.PX - M.PW, M.OUT_Y - M.PD, top]];
  const lens = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1], q[2] - path[i][2]));
  const total = lens.reduce((a, b) => a + b, 0);
  const dots = [0, 1, 2, 3, 4].map((i) => {
    let s = ((((st.clock * 0.45 + i / 5) % 1) + 1) % 1) * total;
    let j = 0;
    while (j < lens.length - 1 && s > lens[j]) s -= lens[j++];
    const t = Math.min(1, s / lens[j]);
    return k.iso(path[j].map((c, n) => c + (path[j + 1][n] - c) * t), P);
  });
  return `<g opacity="${st.mist.toFixed(2)}">${k.dotsSvg(dots, { size: 0.9, tone: "lit" })}</g>`;
}

// everything that moves, for a state
function sprScene(st) {
  const [name] = M.CYCLE[st.step];
  const u = Math.min(1, st.pt / sprDur(st));
  const pose = sprPose(name, u);
  const wet = Math.min(1, Math.min(...st.film) / M.H_MIN);
  const { PX: px, PW, PD, PTOP, OUT_Y: oy, AXIS_Z: az, BLOCK: b } = M;
  const a = st.mist;
  return {
    name,
    mistBack: sprMist([px - PW, oy, PTOP - 6], [px - b.w / 2, oy, az], 2.5, [1, 2], a, st.clock, 0.1)
      + sprMist([px, oy - PD + 2, az], [px, oy - b.d / 2, az], 3.5, [0], a, st.clock, 0.45),
    block: sprBlock(pose, wet),
    mistFront: sprMist([px, oy, PTOP - 6], [px, oy, az + b.h / 2], 3.5, [0], a * st.flow, st.clock, 0.3)
      + sprMist([px + PW, oy, PTOP - 6], [px + b.w / 2, oy, az], 2.5, [1], a, st.clock, 0.7)
      + sprMist([px, oy + PD - 2, az], [px, oy + b.d / 2, az], 3.5, [0], a, st.clock, 0.2),
    flow: sprFlow(st),
  };
}

function sprReadout(st) {
  const [name] = M.CYCLE[st.step];
  const min = Math.min(...st.film);
  const say = name === "spray" ? "spraying five faces" : name === "drip" ? "dripping off over the tank" : name === "roll out" ? "oiled: on to Junbiki" : name === "next" ? "next block" : name;
  const dry = ["roll in", "corner", "to portal", "next"].includes(name);
  const after = Math.min(...sprFilmAfter(st));
  return `${say} · ${dry ? `${after.toFixed(1)} um on the thinnest face after ${st.time.toFixed(1)} s` : `thinnest film ${min.toFixed(1)} um`}`;
}

function sprNumbers(st) {
  const f = sprFilmAfter(st);
  const f1 = (x) => x.toFixed(1);
  const used = ((4 + (st.broken ? M.CLOG : 1)) * M.Q_ML * st.time) / 60;
  const top = st.broken ? `top ${f1(f[0])} um (nozzle clogged, ${Math.round(M.CLOG * 100)} % flow)` : `top ${f1(f[0])} um`;
  return `${st.time.toFixed(1)} s spray: ${top}, sides ${f1(f[1])} um, ends ${f1(f[3])} um · minimum ${M.H_MIN} um · ${f1(used)} mL oil a block, ${f1(used * (1 - M.ETA))} mL back to the tank`;
}

// ---- self-check: a cycle visits every step in order, five faces are coated above the minimum at the default time, and a clogged top nozzle leaves the top bare
{
  const run = (broken) => {
    const st = sprState();
    st.broken = broken;
    sprGo(st, "roll in");
    const seen = [];
    let atEnd = null;
    for (let i = 0; i < 60 * 40 && !(seen.length > 1 && st.step === 0); i++) {
      sprStep(st, 1 / 60);
      const ph = M.CYCLE[st.step][0];
      if (seen.at(-1) !== ph) {
        if (ph === "drip") atEnd = [...st.film];
        seen.push(ph);
      }
    }
    return { seen, atEnd };
  };
  const ok = run(false);
  const want = M.CYCLE.map((c) => c[0]);
  if (JSON.stringify(ok.seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${ok.seen.join(" → ")}`);
  if (Math.min(...ok.atEnd) < M.H_MIN) throw new Error(`film ${ok.atEnd.map((x) => x.toFixed(2))} under ${M.H_MIN} um at 3 s`);
  const bad = run(true);
  if (!(bad.atEnd[0] < M.H_MIN && Math.min(...bad.atEnd.slice(1)) >= M.H_MIN)) throw new Error(`clogged: ${bad.atEnd.map((x) => x.toFixed(2))}`);
  console.log(`cycle check passed (${want.length} steps, thinnest film ${Math.min(...ok.atEnd).toFixed(2)} um, clogged top ${bad.atEnd[0].toFixed(2)} um)`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    walls(),
    pump(),
    post(PX - PW, OUT_Y - PD),
    post(PX + PW, OUT_Y - PD),
    innerRail(),
    tank(),
    inRollers(),
    cornerRollers(),
    outRollers(),
    sprayBar(OUT_Y - PD),
    nozzle(PX, OUT_Y - PD + 1, AXIS_Z - 1.5),
    slot("mistBack", f.mistBack),
    slot("block", f.block),
    slot("mistFront", f.mistFront),
    outerRail(),
    sprayBar(OUT_Y + PD),
    nozzle(PX, OUT_Y + PD - 1, AXIS_Z - 1.5),
    post(PX - PW, OUT_Y + PD),
    post(PX + PW, OUT_Y + PD),
    portalTop(),
    slot("flow", f.flow),
    nozzle(PX, OUT_Y, PORTAL.top - 6),
    nozzle(PX - PW, OUT_Y, PORTAL.top - 6),
    nozzle(PX + PW, OUT_Y, PORTAL.top - 6),
  ];
}

function livePage() {
  const st = sprState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...liveBody(sprScene(st))] });
  const label = (ph) => ph[0].toUpperCase() + ph.slice(1);
  return liveHtml({
    k,
    title: "Spray Booth · rust-preventive oil cycle",
    fig: "Spray Booth",
    figTitle: "Rust-preventive oil cycle",
    key: "spray",
    svg,
    slots: ["mistBack", "block", "mistFront", "flow"],
    steps: CYCLE.filter(([ph]) => ph !== "next").map(([ph]) => [ph, label(ph)]),
    controls: [
      { kind: "range", key: "time", label: "Spray time", min: 0.5, max: 6, step: 0.5, value: 3, unit: "s", digits: 1 },
      { kind: "toggle", key: "broken", label: "Top nozzle clogs" },
    ],
    header: `const P = ${JSON.stringify(P)};\nconst M = ${JSON.stringify(M)};`,
    fns: [smooth01, sprState, sprDur, sprRate, sprFilmAfter, sprStep, sprGo, sprPose, sprBlock, sprMist, sprFlow, sprScene, sprReadout, sprNumbers],
    model: { state: "sprState", step: "sprStep", go: "sprGo", dur: "sprDur", scene: "sprScene", readout: "sprReadout", numbers: "sprNumbers" },
    still: ["spray", 0.85],
  });
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `spray-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `spray-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
  const html = livePage();
  writeFileSync(join(OUT, "spray-live.html"), html);
  console.log(`wrote ${join(OUT, "spray-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
