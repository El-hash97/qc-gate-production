// Isometric figure of station Hanten MC (block turnover) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a housing straddling the roller line,
// drawn cut away (back wall, the back half of the roof and the infeed wall only), a
// turnover cage of two big rings tied by bars riding on support rollers, the infeed
// roller conveyor under a yellow mesh guard and the outfeed conveyor towards Final.
// The block comes in deck down and leaves deck up.
//   node station-kit/figure/stations/hanten.mjs [outDir]   →   <outDir>/hanten-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
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

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `hanten-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `hanten-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
