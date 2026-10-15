// Isometric figure of station Junbiki (sequenced staging) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a three-level gravity flow rack with lanes running
// away from the line, the infeed from the Spray Booth alongside it, and a traversing lift on a floor
// track along the rack front that takes each block to the lane of its delivery lot, raises it to the
// top level and runs it in. The blocks roll down the lane to queue at the far end for the truck.
//   node station-kit/figure/stations/junbiki.mjs [outDir]   →   <outDir>/junbiki-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, 50 units a metre like the other stations; lanes run along +y, towards the viewer)
const LX = [50, 25, 0, -25, -50, -75];          // lane centres
const RAILS = [...LX.map((x) => x + 12.5), LX[LX.length - 1] - 12.5];
const Y0 = 27, Y1 = 320;                        // lane entry (lift side) and far end (pick face)
const LEVELS = [99, 78, 57];                    // roller tops; the 2 % fall is too small to draw
const POST_Y = [Y0 + 3, Y0 + 72, Y0 + 145, Y0 + 218, Y1 - 3];
const CONV_Z = 23.5;
const BLOCK = { w: 19, d: 24, h: 17 };          // long axis along the lane
const HOME = 85, INFEED = [170, 16];
const LIFT = { x: LX[0], top: 145 };
const PAD = { x: -112, y: -48, w: 240, d: 382, r: 8 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [LIFT.x, -21, LIFT.top + 10], [RAILS[RAILS.length - 1], Y1, LEVELS[0] + 20], [RAILS[0], -30, LIFT.top]],
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
const box = (plan, z, h, tone = "mid") => S(slab({ ...plan, r: plan.r ?? 0.4 }, z, h, 2, 0.3), { tone });

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // the pick face at the far end of the lanes, where lots go out to the truck
  out.push(L(k.lineOnTop([RAILS[RAILS.length - 1], Y1 + 14], [RAILS[0], Y1 + 14], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- BC block, deck up, long axis along y ---------------------------------------
function block(cx, cy, z, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(cx, plan.y + 4 + i * 5.33, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  return out.join("");
}

// ---- the traversing lift, behind the rack front ------------------------------------
function lift() {
  const { x, top } = LIFT;
  const out = [];
  for (const y of [-27, -15]) out.push(box({ x: RAILS[RAILS.length - 1] - 10, y, w: HOME + 20 - RAILS[RAILS.length - 1], d: 2.5 }, 0, 1.5, "lo"));
  out.push(box({ x: x - 22, y: -32, w: 44, d: 22, r: 1 }, 1.5, 6));
  out.push(S(k.cylinder(x - 15, -36, 3.5, 3, 7, P, 20, 0.3), { tone: "hi" }));
  for (const dx of [-17, 13]) out.push(box({ x: x + dx, y: -24, w: 4, d: 5 }, 7.5, top - 7.5));
  out.push(box({ x: x - 20, y: -25, w: 40, d: 8, r: 0.6 }, top, 6));
  out.push(S(k.cylinder(x + 6, -21, 4.5, top + 6, 12, P, 24, 0.4), { tone: "hi" }));
  out.push(box({ x: x - 13, y: -25, w: 9, d: 8 }, top + 6, 6));
  // the carriage at the top level with the block on it, about to run it into lane 1
  const cz = LEVELS[0];
  out.push(box({ x: x - 15.5, y: -16, w: 31, d: 32, r: 0.6 }, cz - 4, 3));
  out.push(L(Array.from({ length: 7 }, (_, i) => seg([x - 14, -13 + i * 4.5, cz - 0.5], [x + 14, -13 + i * 4.5, cz - 0.5])).join(""), { tone: "lo" }));
  for (const dx of [-17, 15]) out.push(box({ x: x + dx, y: -18, w: 2, d: 35 }, cz - 6, 7));
  out.push(block(x, 0, cz - 1, { lit: true }));
  return out.join("");
}

// ---- infeed from the Spray Booth, alongside the rack --------------------------------
function infeed() {
  const [y1, y0] = INFEED;
  const out = [];
  for (const y of [y0 + 10, y1 - 10]) for (const dx of [-16, 16]) out.push(box({ x: HOME + dx - 2, y: y - 2, w: 4, d: 4 }, 0, CONV_Z - 7));
  out.push(box({ x: HOME - 18, y: y0, w: 4, d: y1 - y0, r: 0.5 }, CONV_Z - 8, 9));
  for (let y = y0 + 3; y < y1 - 3; y += 7) out.push(S(slab({ x: HOME - 14, y, w: 28, d: 4.6, r: 2.3 }, CONV_Z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  out.push(block(HOME, 120, CONV_Z));
  out.push(box({ x: HOME + 14, y: y0, w: 4, d: y1 - y0, r: 0.5 }, CONV_Z - 8, 9));
  return out.join("");
}

// ---- the flow rack ---------------------------------------------------------------
const post = (x, y) => box({ x: x - 1.5, y: y - 1.5, w: 3, d: 3 }, 0, LEVELS[0] + 3);
const STAGED = [[0, 4], [1, 2], [2, 5], [3, 1], [4, 3], [5, 2]];   // lane, blocks queued
const LOWER = [[0, 1], [1, 3], [2, 0], [3, 2], [4, 0], [5, 3]];
function level(z, staged, { brakes = false } = {}) {
  const out = [];
  // cross beams under each post row, then the rails (farthest first), the rollers, the speed controllers
  for (const y of POST_Y) out.push(box({ x: RAILS[RAILS.length - 1] - 1.5, y: y - 1.5, w: RAILS[0] - RAILS[RAILS.length - 1] + 3, d: 3 }, z - 6, 2.5));
  const rollers = [], brakeLines = [];
  for (const x of LX) for (let y = Y0 + 4; y < Y1 - 2; y += 6) rollers.push(seg([x - 11, y, z - 0.6], [x + 11, y, z - 0.6]));
  if (brakes) for (const x of LX) for (const y of [Y0 + 75, Y0 + 150, Y0 + 225]) brakeLines.push(seg([x - 11, y, z - 0.4], [x + 11, y, z - 0.4]));
  for (const x of [...RAILS].reverse()) out.push(box({ x: x - 1, y: Y0, w: 2, d: Y1 - Y0 }, z - 3.5, 4.5));
  out.push(L(rollers.join(""), { tone: "faint" }));
  if (brakes) out.push(L(brakeLines.join(""), { tone: "mid" }));
  out.push(box({ x: RAILS[RAILS.length - 1], y: Y1, w: RAILS[0] - RAILS[RAILS.length - 1], d: 2 }, z - 2, 6));
  // the queues at the far end, drawn back to front
  const blocks = [];
  for (const [lane, n] of staged) for (let i = 0; i < n; i++) blocks.push([LX[lane], Y1 - 13 - i * 25]);
  blocks.sort((a, b) => a[1] - b[1] || a[0] - b[0]).forEach(([x, y]) => out.push(block(x, y, z)));
  return out.join("");
}

function rack() {
  const out = [];
  for (const y of POST_Y.slice(0, -1)) for (const x of [...RAILS].reverse()) out.push(post(x, y));
  out.push(level(LEVELS[2], LOWER.map(([l, n]) => [l, Math.max(0, n - 1)])));
  out.push(level(LEVELS[1], LOWER));
  out.push(level(LEVELS[0], STAGED, { brakes: true }));
  for (const x of [...RAILS].reverse()) out.push(post(x, POST_Y[POST_Y.length - 1]));
  return out.join("");
}

const body = [floor(), lift(), rack(), infeed()];

const LABEL =
  "Station Junbiki, sequenced staging: a traversing lift on a floor track along the front of a three-level gravity flow rack takes each oiled block off the infeed from the Spray Booth, travels to the lane of its delivery lot, raises it to the top level and runs it in. The lanes fall gently away from the lift, so the blocks roll down past braking rollers to queue at the far end, where complete lots go out to the truck.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
  writeFileSync(join(OUT, `junbiki-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `junbiki-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
