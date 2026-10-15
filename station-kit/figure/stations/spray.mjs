// Isometric figure of station Spray Booth (rust-preventive oil) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: inside the booth (back wall with its long window
// and the left wall with the exit opening; front, right and roof cut away) the roller line from
// QC Gate 2 turns 90 degrees and runs out towards Junbiki. Over the outgoing line stands the spray
// portal with five nozzles (top, two side spray bars, two ends), the oil tank under it and the
// pump behind it, feeding the manifold.
//   node station-kit/figure/stations/spray.mjs [outDir]   →   <outDir>/spray-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
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

// incoming, along +y at x = 0: the far rail, the rollers, then (after the block on it) the near rail
function inBack() {
  const out = [leg(-CW - 2, IN_Y[0] + 8), leg(-CW - 2, -20)];
  out.push(rail({ x: -CW - 4, y: IN_Y[0], w: 4, d: IN_Y[1] - IN_Y[0] }));
  for (let y = IN_Y[0] + 3; y < IN_Y[1] - 3; y += 7) out.push(roll({ x: -CW, y, w: 2 * CW, d: 4.6, r: 2.3 }));
  return out.join("");
}
function inFront() {
  return [leg(CW + 2, IN_Y[0] + 8), leg(CW + 2, -20), rail({ x: CW, y: IN_Y[0], w: 4, d: IN_Y[1] - IN_Y[0] })].join("");
}

// the corner: annular rails and radial rollers, a little wider at the outside
const arcRing = (r0, r1, n = 18) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); pts.push([C[0] + Math.cos(t) * r1, C[1] + Math.sin(t) * r1]); }
  for (let i = n; i >= 0; i--) { const t = (i / n) * (Math.PI / 2); pts.push([C[0] + Math.cos(t) * r0, C[1] + Math.sin(t) * r0]); }
  return pts;
};
function corner() {
  const out = [S(k.extrude(arcRing(R - CW - 4, R - CW), CONV_Z - 8, 9, P, { convex: false }), { tone: "mid" })];
  const rollers = [];
  for (let i = 0; i < 9; i++) {
    const t = ((i + 0.5) / 9) * (Math.PI / 2);
    const [cx, cy] = [C[0] + Math.cos(t) * R, C[1] + Math.sin(t) * R];
    const [rx, ry] = [Math.cos(t), Math.sin(t)], [tx, ty] = [-Math.sin(t), Math.cos(t)];
    const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + rx * a * CW + tx * b * 2.3 * (1 + a * 0.3), cy + ry * a * CW + ty * b * 2.3 * (1 + a * 0.3)]);
    rollers.push([[cx, cy, CONV_Z], S(k.extrude(ring, CONV_Z - 4.6, 4.6, P), { tone: "mid", crease: "none" })]);
  }
  out.push(...byDepth(rollers));
  out.push(S(k.extrude(arcRing(R + CW, R + CW + 4), CONV_Z - 8, 9, P, { convex: false }), { tone: "mid" }));
  return out.join("");
}

// outgoing, along -x at y = R
function outBack() {
  const out = [];
  for (const x of [OUT_X[0] - 14, PORTAL.x - 36, OUT_X[1] + 8]) out.push(leg(x, OUT_Y - CW - 2));
  out.push(rail({ x: OUT_X[1], y: OUT_Y - CW - 4, w: OUT_X[0] - OUT_X[1], d: 4 }));
  return out.join("");
}
function outRollers() {
  const out = [];
  for (let x = OUT_X[1] + 3; x < OUT_X[0] - 3; x += 7) out.push(roll({ x, y: OUT_Y - CW, w: 4.6, d: 2 * CW, r: 2.3 }));
  return out.join("");
}
function outFront() {
  const out = [];
  for (const x of [OUT_X[0] - 14, PORTAL.x - 36, OUT_X[1] + 8]) out.push(leg(x, OUT_Y + CW + 2));
  out.push(rail({ x: OUT_X[1], y: OUT_Y + CW, w: OUT_X[0] - OUT_X[1], d: 4 }));
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
  inBack(),
  block(0, -60, "y"),
  inFront(),
  corner(),
  post(PX - PW, OUT_Y - PD),
  post(PX + PW, OUT_Y - PD),
  outBack(),
  tank(),
  outRollers(),
  block(-168, OUT_Y, "x"),
  sprayBar(OUT_Y - PD),
  nozzle(PX, OUT_Y - PD + 1, AXIS_Z - 1.5),
  mist([PX - PW, OUT_Y, PTOP - 6], [PX - BLOCK.w / 2, OUT_Y, AXIS_Z], 2.5, [1, 2]),
  block(PX, OUT_Y, "x", { lit: true }),
  mist([PX, OUT_Y, PTOP - 6], [PX, OUT_Y, BTOP], 3.5, [0]),
  mist([PX + PW, OUT_Y, PTOP - 6], [PX + BLOCK.w / 2, OUT_Y, AXIS_Z], 2.5, [1]),
  mist([PX, OUT_Y + PD - 2, AXIS_Z], [PX, OUT_Y + BLOCK.d / 2, AXIS_Z], 3.5, [0]),
  outFront(),
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

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `spray-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `spray-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
