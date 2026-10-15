// Isometric figure of station Line Repair (rework benches) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a fenced area across the factory road with a wall
// at the back, two workbenches against it with a vise on each, a yellow safety fence in front and
// the pallet of Repair blocks from QC Gate 2; the out pallet back to QC Gate 2 is an interpretation.
//   node station-kit/figure/stations/repair.mjs [outDir]   →   <outDir>/repair-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, 50 units a metre like the other stations; the wall at the back, -y)
const PAD = { x: -140, y: -118, w: 280, d: 228, r: 8 };
const WALL = { y: -110, h: 80, t: 6 };          // drawn lower than the real 2.4 m so the benches read
const BENCH = { w: 51, d: 28, h: 37 };
const BENCH_X = [-30, 30], BENCH_Y = -93.5;
const FENCE = { y: 85, x0: -55, x1: 35, h: 140, rails: [18.5, 73, 84.5, 138] };
const PAL = { w: 60, d: 50, top: 7 };
const PAL_IN = [-95, 47.5], PAL_OUT = [95, 47.5];
const BLOCK = { w: 24, d: 19, h: 17 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [PAD.x, WALL.y, WALL.h], [PAD.x + PAD.w, WALL.y, WALL.h], [FENCE.x0, FENCE.y, FENCE.h], [FENCE.x1, FENCE.y, FENCE.h]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const box = (plan, z, h, tone = "mid") => S(slab({ ...plan, r: plan.r ?? 0.4 }, z, h, 2, 0.3), { tone });

// ---- floor and wall ------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function wall() {
  const plan = { x: PAD.x + 4, y: WALL.y - WALL.t, w: PAD.w - 8, d: WALL.t, r: 0.6 };
  return S(slab(plan, 0, WALL.h, 2, 0.4), { tone: "lo", inner: L(k.sideSeam(plan, WALL.h / 2, P, 2), { tone: "faint" }) });
}

// ---- BC block, deck up, long axis along x ---------------------------------------
function block(cx, cy, z, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, cy, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  return out.join("");
}

// ---- a bench: cabinet with two drawers, dark top, vise on the front corner, a block on it ----
function bench(x, { lit = false, grinder = false } = {}) {
  const { w, d, h } = BENCH;
  const plan = { x: x - w / 2, y: BENCH_Y - d / 2, w, d, r: 0.6 };
  const out = [S(slab(plan, 0, h - 3, 2, 0.4), { tone: "mid" })];
  const fy = plan.y + d;
  for (const z of [12, 22]) out.push(L(k.segment([plan.x + 4, fy, z], [plan.x + w - 4, fy, z], P), { tone: "faint" }));
  out.push(D([at([x, fy, 17]), at([x, fy, 27])], { size: 0.6, tone: "lo" }));
  out.push(S(slab({ ...k.insetPlan(plan, -1), r: 0.4 }, h - 3, 3, 2, 0.3), { tone: "lo" }));
  // vise
  const vx = plan.x + w - 9, vy = fy - 4;
  out.push(box({ x: vx - 3.5, y: vy - 6, w: 7, d: 8 }, h, 3));
  out.push(box({ x: vx - 3.5, y: vy + 2, w: 7, d: 1.5 }, h + 1, 3.5));
  out.push(L(k.segment([vx - 5, vy + 4.5, h + 2.5], [vx + 5, vy + 4.5, h + 2.5], P), { tone: "hi" }));
  out.push(block(x - 6, BENCH_Y, h, { lit }));
  if (grinder) {
    // a hand grinder working the deck face, sparks off the edge
    const gx = x - 2, edge = BENCH_Y + BLOCK.d / 2, gz = h + BLOCK.h;
    for (let i = 0; i < 6; i++) out.push(k.fadeLineSvg([at([gx, edge + 0.5, gz - 1]), at([gx - 8 + i * 3, edge + 12 + i * 2, gz - 8 - (i % 3) * 3])], { fade: [0, 0.8], tone: "mid" }));
    out.push(S(k.cylinder(gx, edge - 3, 2.6, gz + 1, 3, P, 16, 0.3), { tone: "mid" }));
    out.push(S(slab({ x: gx - 1.5, y: edge - 4.5, w: 14, d: 3, r: 1.5 }, gz + 4, 3, 4), { tone: "hi", crease: "none" }));
  }
  return out.join("");
}

// ---- pallets with blocks -----------------------------------------------------------
function pallet([cx, cy], n) {
  const { w, d, top } = PAL;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 0.4 };
  const out = [];
  for (const dx of [-25, 0, 25]) for (const dy of [-20, 0, 20]) out.push(box({ x: cx + dx - 2.5, y: cy + dy - 2.5, w: 5, d: 5 }, 0, top - 1.5));
  out.push(S(slab(plan, top - 1.5, 1.5, 2, 0.3), { tone: "mid" }));
  out.push(L([-12, 12].map((dx) => k.lineOnTop([cx + dx, plan.y + 1], [cx + dx, plan.y + d - 1], top, P)).join(""), { tone: "faint" }));
  // blocks: two across, three deep, a second layer on top; drawn back to front, bottom up
  const slots = [];
  for (let i = 0; i < n; i++) {
    const layer = Math.floor(i / 6), j = i % 6;
    slots.push([cx + (j % 2 ? 13.5 : -13.5), cy + (Math.floor(j / 2) - 1) * 21, top + layer * BLOCK.h]);
  }
  slots.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]).forEach(([x, y, z]) => out.push(block(x, y, z)));
  return out.join("");
}

// ---- the safety fence: posts and rails, in front of everything --------------------------
function fence() {
  const { y, x0, x1, h, rails } = FENCE;
  const out = [];
  const posts = [x0, (x0 + x1) / 2, x1];
  for (const x of posts.slice(0, 2)) out.push(box({ x: x - 1.5, y: y - 1.5, w: 3, d: 3 }, 0, h));
  for (const z of rails) out.push(box({ x: x0 - 1.5, y: y - 1.2, w: x1 - x0 + 3, d: 2.4 }, z - 1.5, 3));
  out.push(box({ x: x1 - 1.5, y: y - 1.5, w: 3, d: 3 }, 0, h));
  return out.join("");
}

const body = [
  floor(),
  wall(),
  bench(BENCH_X[0], { lit: true, grinder: true }),
  bench(BENCH_X[1]),
  pallet(PAL_IN, 8),
  pallet(PAL_OUT, 2),
  fence(),
];

const LABEL =
  "Station Line Repair, rework benches: blocks judged Repair at QC Gate 2 arrive on a pallet behind the yellow safety fence. Two workbenches against the back wall, each with a vise, rework them with a hand grinder, and the reworked blocks go onto the out pallet back to QC Gate 2.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
  writeFileSync(join(OUT, `repair-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `repair-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
