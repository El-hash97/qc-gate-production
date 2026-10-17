// Isometric figure of station Baritori (deburring) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a timber portal with an air
// cylinder that lowers a guard plate, a slide table whose carriage carries the BC
// block on a tilting cradle, a tie-rod pusher cylinder at the far end, the roller
// conveyor that takes the block on to HSB05 and the push-button box beside the portal.
// The live page runs the same cycle as baritori-3d.html: load, push in, guard down,
// chip the flash off four faces with a quarter turn between them, guard up, hand the
// block on to HSB05, carriage back.
//   node station-kit/figure/stations/baritori.mjs [outDir]
//     →   <outDir>/baritori-{light,dark}.svg and <outDir>/baritori-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/baritori.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, 1 unit = 1 cm; the line runs along +x) --------------------
const PAD = { x: -236, y: -96, w: 484, d: 200, r: 10 };
const TABLE = { x: -128, y: -38, w: 226, d: 76, r: 2 }; // slide table, top at TABLE_Z
const TABLE_Z = 40;
const RAIL_Y = [-20, 16]; // guide rails (4 wide) along the table top
const CART_X = 42; // carriage centre: pushed out from under the portal
const BLOCK = { x: CART_X - 24, y: -18.5, w: 48, d: 37, r: 1.2 }; // BC block 47.5 × 37.1 × 33.6
const BLOCK_H = 34;
const CRADLE_Z = TABLE_Z + 10; // block seat
const PIVOT_Z = TABLE_Z + 18; // cradle tilt axis
const PARTING = 22; // casting parting line, above the block's base
const POST_Y = [-62, 48]; // timber posts 14 × 14, from y to y + 14
const POST_TOP = 236;
const BEAM_Z = POST_TOP; // top beam underside
const GUARD = { x0: 8, z0: 104, z1: 158 }; // guard plate hanging off the cross bar
const CONV = { x0: 104, x1: 236, y0: -32, y1: 32, z: 40 }; // roller tops at z
const ROD = { y: 0, z: 62 }; // pusher rod axis

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [0, POST_Y[0], BEAM_Z + 96], [0, POST_Y[1] + 14, BEAM_Z + 96], [-8, -70, BEAM_Z + 14], [8, 70, BEAM_Z + 14], [-60, 84, 120]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 52 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const rect = (pts) => k.pathOf(pts.map(at), true);
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 6), 0, P), { tone: "faint" }));
  // walkway line along the operator side, edge to edge
  out.push(L(k.lineOnTop([PAD.x + 6, 70], [PAD.x + PAD.w - 6, 70], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 14);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- guard railing behind the line ------------------------------------------
function railing() {
  const y = -86;
  const xs = [-200, -140, -80, -20, 40, 100, 160, 220];
  const out = [];
  for (const x of xs) {
    out.push(S(slab({ x: x - 4, y: y - 4, w: 8, d: 8, r: 0.6 }, 0, 1.5, 2), { tone: "mid" }));
    out.push(S(slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.4 }, 1.5, 98.5, 2, 0.3), { tone: "mid" }));
  }
  for (const z of [52, 98]) out.push(S(slab({ x: xs[0] - 2, y: y - 2, w: xs.at(-1) - xs[0] + 4, d: 4, r: 0.6 }, z, 4, 2, 0.3), { tone: "mid" }));
  out.push(L(xs.slice(1).map((x) => k.segment([x - 30, y + 2, 4], [x - 30, y + 2, 50], P)).join(""), { tone: "faint" }));
  return out.join("");
}

// ---- timber portal -------------------------------------------------------------
function post(y) {
  const plan = { x: -7, y, w: 14, d: 14, r: 0.8 };
  const out = [S(slab({ x: -11, y: y - 4, w: 22, d: 22, r: 1 }, 0, 3, 2, 0.6), { tone: "mid" })];
  out.push(D(k.corners({ x: -11, y: y - 4, w: 22, d: 22 }, 3).map(([px, py]) => at([px, py, 3])), { size: 0.45 }));
  // grain runs the full height of the two faces the viewer sees
  const grain = [3.5, 7, 10.5].map((t) => k.segment([7, y + t, 3], [7, y + t, POST_TOP], P) + k.segment([-7 + t, y + 14, 3], [-7 + t, y + 14, POST_TOP], P)).join("");
  out.push(S(slab(plan, 3, POST_TOP - 3, 2, 0.6), { tone: "mid", inner: L(grain, { tone: "faint" }) }));
  // guide strip for the cross bar on the inner face
  const inner = y < 0 ? y + 14 : y - 3;
  out.push(S(slab({ x: -3, y: inner, w: 6, d: 3, r: 0.4 }, 90, 130, 2, 0.3), { tone: "mid" }));
  out.push(D([100, 140, 180, 214].map((z) => at([3, inner + 1.5, z])), { size: 0.4 }));
  return out.join("");
}

function beam() {
  const plan = { x: -9, y: POST_Y[0] - 8, w: 18, d: POST_Y[1] - POST_Y[0] + 30, r: 1 };
  const grain = [4.5, 9, 13.5].map((t) => k.segment([9, plan.y, BEAM_Z + t], [9, plan.y + plan.d, BEAM_Z + t], P)).join("");
  const out = [S(slab(plan, BEAM_Z, 18, 2, 0.7), { tone: "mid", inner: L(grain, { tone: "faint" }) })];
  // steel angle brackets bolting the beam onto each post
  for (const y of POST_Y) {
    out.push(S(slab({ x: 7, y: y - 2, w: 1.6, d: 18, r: 0.3 }, BEAM_Z - 16, 30, 2), { tone: "mid", crease: "none" }));
    out.push(D([[y + 2, BEAM_Z - 10], [y + 12, BEAM_Z - 10], [y + 2, BEAM_Z + 8], [y + 12, BEAM_Z + 8]].map(([py, z]) => at([8.6, py, z])), { size: 0.45 }));
  }
  return out.join("");
}

// tie-rod air cylinder standing on the beam, rod down through it to the cross bar
function liftCylinder() {
  const z0 = BEAM_Z + 18;
  const out = [];
  out.push(S(slab({ x: -12, y: -12, w: 24, d: 24, r: 1 }, z0, 4, 2, 0.5), { tone: "mid" }));
  out.push(D(k.corners({ x: -12, y: -12, w: 24, d: 24 }, 3).map(([x, y]) => at([x, y, z0 + 4])), { size: 0.45 }));
  out.push(S(slab({ x: -9, y: -9, w: 18, d: 18, r: 1 }, z0 + 4, 10, 2, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 7, z0 + 14, 50, P, 40, 0.6), { tone: "hi", crease: "lo" }));
  out.push(S(slab({ x: -9, y: -9, w: 18, d: 18, r: 1 }, z0 + 64, 10, 2, 0.6), { tone: "mid" }));
  // tie rods at the corners, nuts on top
  out.push(L(byDepth([[7, 7], [-7, 7], [7, -7]], ([x, y]) => [x, y, 0]).map(([x, y]) => k.segment([x, y, z0 + 14], [x, y, z0 + 64], P)).join(""), { tone: "lo" }));
  out.push(D(k.corners({ x: -9, y: -9, w: 18, d: 18 }, 2).map(([x, y]) => at([x, y, z0 + 74])), { size: 0.55 }));
  // air ports with push-in fittings on both end caps
  out.push(L(k.sideRing([9, 0, z0 + 9], 2, "x", P) + k.sideRing([9, 0, z0 + 69], 2, "x", P), { tone: "lo" }));
  out.push(D([at([9, 0, z0 + 9]), at([9, 0, z0 + 69])], { size: 0.6, tone: "mid" }));
  return out.join("");
}

function liftRod() {
  return S(k.cylinder(0, 0, 2.2, GUARD.z1 + 6, BEAM_Z - GUARD.z1 - 6, P, 20), { tone: "hi", crease: "none" });
}

// cross bar riding in the post guides, guard plate bolted on its front
function guard() {
  const { x0, z0, z1 } = GUARD;
  const y0 = POST_Y[0] + 14;
  const y1 = POST_Y[1];
  const out = [];
  out.push(S(slab({ x: -4, y: y0 + 3, w: 8, d: y1 - y0 - 6, r: 0.6 }, z1, 8, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: -6, y: -6, w: 12, d: 12, r: 0.8 }, z1 + 8, 6, 2, 0.4), { tone: "mid" })); // rod clevis
  out.push(D([at([6, -3, z1 + 11]), at([6, 3, z1 + 11])], { size: 0.45 }));
  const plate = { x: x0 - 3, y: y0 + 6, w: 3, d: y1 - y0 - 12, r: 0.4 };
  const seams = L(k.sideSeam(plate, z0 + 18, P, 2) + k.sideSeam(plate, z0 + 36, P, 2), { tone: "faint" });
  out.push(S(slab(plate, z0, z1 - z0 + 4, 2, 0.4), { tone: "mid", inner: seams }));
  // bolts along the top, a warning label with three rule lines
  out.push(D([-30, -15, 0, 15, 30].map((y) => at([x0, y, z1])), { size: 0.45 }));
  const ly = [-14, 14];
  out.push(L(rect([[x0, ly[0], z0 + 22], [x0, ly[1], z0 + 22], [x0, ly[1], z0 + 33], [x0, ly[0], z0 + 33]]), { tone: "lo" }));
  out.push(L([25, 28, 31].map((z, i) => k.segment([x0, ly[0] + 3, z0 + z], [x0, ly[1] - 3 - i * 4, z0 + z], P)).join(""), { tone: "faint", free: true }));
  // rubber strip along the bottom edge
  out.push(S(slab({ x: x0 - 3.5, y: plate.y + 2, w: 4, d: plate.d - 4, r: 0.6 }, z0 - 4, 4, 2), { tone: "lo", crease: "none" }));
  return out.join("");
}

// ---- slide table, rails, carriage -------------------------------------------
function legsBack() {
  const out = [];
  for (const x of [TABLE.x + 8, TABLE.x + TABLE.w - 8]) {
    const y = TABLE.y + 8;
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.5 }, 0, TABLE_Z - 6, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(slab({ x: TABLE.x + 8, y: TABLE.y + 6, w: TABLE.w - 16, d: 4, r: 0.4 }, 10, 4, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function legsFront() {
  const out = [];
  for (const x of [TABLE.x + 8, TABLE.x + TABLE.w - 8]) {
    const y = TABLE.y + TABLE.d - 8;
    out.push(S(slab({ x: x - 5, y: y - 5, w: 10, d: 10, r: 0.6 }, 0, 1.5, 2), { tone: "mid" }));
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.5 }, 1.5, TABLE_Z - 7.5, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(slab({ x: TABLE.x + 8, y: TABLE.y + TABLE.d - 10, w: TABLE.w - 16, d: 4, r: 0.4 }, 10, 4, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function tableTop() {
  const out = [S(slab(TABLE, TABLE_Z - 6, 6, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(TABLE, TABLE_Z - 3, P, 3), { tone: "faint" }) })];
  // stroke ruler on the front edge of the top: minor tick every 4, major every 5th
  const fy = TABLE.y + TABLE.d - 3;
  out.push(S(slab({ x: -90, y: fy - 4, w: 180, d: 4, r: 0.3 }, TABLE_Z, 0.6, 2), { tone: "lo", flat: true }));
  const ticks = k.topTicks(-88, 88, 4, 5, fy - 4, TABLE_Z + 0.6, [1.4, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }));
  for (const y of RAIL_Y) {
    out.push(S(slab({ x: TABLE.x + 6, y, w: TABLE.w - 12, d: 4, r: 0.4 }, TABLE_Z, 3, 2, 0.3), { tone: "mid" }));
    out.push(D(Array.from({ length: 9 }, (_, i) => at([TABLE.x + 16 + i * 25, y + 2, TABLE_Z + 3])), { size: 0.35, tone: "lo" }));
  }
  // end stop with rubber buffers at the conveyor end
  out.push(S(slab({ x: TABLE.x + TABLE.w - 8, y: -30, w: 5, d: 60, r: 0.5 }, TABLE_Z, 10, 2, 0.4), { tone: "mid" }));
  for (const y of RAIL_Y) out.push(S(slab({ x: TABLE.x + TABLE.w - 12, y: y - 1, w: 4, d: 6, r: 1.5 }, TABLE_Z + 4, 5, 3), { tone: "lo", crease: "none" }));
  return out.join("");
}

function carriage() {
  const out = [];
  for (const [x, y] of byDepth([[CART_X - 18, RAIL_Y[0]], [CART_X + 18, RAIL_Y[0]], [CART_X - 18, RAIL_Y[1]], [CART_X + 18, RAIL_Y[1]]], ([x, y]) => [x, y, 0])) {
    out.push(S(slab({ x: x - 6, y: y - 3, w: 12, d: 10, r: 0.8 }, TABLE_Z + 1, 5, 2, 0.4), { tone: "mid" }));
  }
  const plate = { x: CART_X - 28, y: -30, w: 56, d: 60, r: 1 };
  out.push(S(slab(plate, TABLE_Z + 6, 4, 2, 0.5), { tone: "mid" }));
  out.push(D(k.corners(plate, 3.5).map(([x, y]) => at([x, y, TABLE_Z + 10])), { size: 0.45 }));
  return out.join("");
}

// cradle cheek: a side plate with the tilt pivot and its bearing
function cheek(y) {
  const plan = { x: CART_X - 22, y, w: 44, d: 4, r: 0.5 };
  const out = [S(slab(plan, TABLE_Z + 10, 16, 2, 0.4), { tone: "mid" })];
  const fy = y + 4;
  out.push(S(slab({ x: CART_X - 7, y: fy, w: 14, d: 4, r: 1 }, TABLE_Z + 11, 14, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([CART_X, fy + 4, PIVOT_Z], 4, "y", P), { tone: "lo" }));
  out.push(D([at([CART_X, fy + 4, PIVOT_Z])], { size: 0.7, tone: "mid" }));
  out.push(D([[-4.5, -5], [4.5, -5], [-4.5, 5], [4.5, 5]].map(([dx, dz]) => at([CART_X + dx, fy + 4, PIVOT_Z + dz])), { size: 0.35 }));
  return out.join("");
}

// tilt lever on the front cheek, the handle the operator pulls
function lever() {
  const y = 26.5;
  const out = [L(k.segment([CART_X, y, PIVOT_Z], [CART_X + 30, y, PIVOT_Z + 22], P), { tone: "mid" })];
  out.push(S(slab({ x: CART_X + 28, y: y - 2, w: 5, d: 4, r: 1.6 }, PIVOT_Z + 18, 10, 3), { tone: "mid", crease: "none" }));
  return out.join("");
}

// ---- BC block: deck with four bores, head-bolt holes, flash on the parting line
function block() {
  const z = CRADLE_Z;
  const top = z + BLOCK_H;
  const out = [S(slab(BLOCK, z, BLOCK_H, 2, 0.6), { tone: "hi", crease: "lo", lit: true, inner: L(k.sideSeam(BLOCK, z + PARTING, P, 2), { tone: "lit" }) })];
  const cy = BLOCK.y + BLOCK.d / 2;
  const bores = [0, 1, 2, 3].map((i) => BLOCK.x + 7.5 + i * 11);
  out.push(L(bores.map((x) => k.ring(x, cy, 4.4, top, P, 32)).join(""), { tone: "lit" }));
  const bolts = [];
  for (const x of [BLOCK.x + 2.5, ...bores.slice(0, 3).map((b) => b + 5.5), BLOCK.x + BLOCK.w - 2.5]) bolts.push(at([x, BLOCK.y + 2.5, top]), at([x, BLOCK.y + BLOCK.d - 2.5, top]));
  out.push(D(bolts, { size: 0.45, tone: "lit" }));
  // casting flash: short fins along the parting line on the visible faces
  const fy = BLOCK.y + BLOCK.d;
  const fx = BLOCK.x + BLOCK.w;
  out.push(D([...Array.from({ length: 9 }, (_, i) => at([BLOCK.x + 4 + i * 5, fy, z + PARTING])), ...Array.from({ length: 7 }, (_, i) => at([fx, BLOCK.y + 3 + i * 5, z + PARTING]))], { size: 0.55, tone: "lit" }));
  return out.join("");
}

// ---- pusher: tie-rod air cylinder on a bracket at the far end ---------------
function pusher() {
  const { y, z } = ROD;
  const out = [];
  const bx = TABLE.x + 6;
  // bracket bolted to the table end and a rear stand under the barrel
  out.push(S(slab({ x: bx, y: y - 14, w: 8, d: 28, r: 0.6 }, TABLE_Z, z - TABLE_Z + 12, 2, 0.4), { tone: "mid" }));
  out.push(D([[-9, TABLE_Z + 5], [9, TABLE_Z + 5]].map(([dy, pz]) => at([bx + 8, y + dy, pz])), { size: 0.45 }));
  const x0 = bx - 92;
  out.push(S(slab({ x: x0 + 6, y: y - 7, w: 10, d: 14, r: 0.6 }, 0, 1.5, 2), { tone: "mid" }));
  out.push(S(slab({ x: x0 + 8, y: y - 3, w: 6, d: 6, r: 0.5 }, 1.5, z - 11.5, 2, 0.3), { tone: "mid" }));
  // rear cap, barrel, front cap
  const cap = (x) => S(slab({ x, y: y - 10, w: 10, d: 20, r: 1 }, z - 10, 20, 2, 0.6), { tone: "mid" });
  out.push(cap(x0));
  const barrel = { x: x0 + 10, y: y - 8, w: 72, d: 16, r: 1.2 };
  out.push(S(slab(barrel, z - 8, 16, 3, 0.4), { tone: "hi", crease: "lo", inner: L(k.segment([x0 + 10, y + 8, z + 4], [x0 + 82, y + 8, z + 4], P), { tone: "faint" }) }));
  out.push(cap(x0 + 82));
  // tie rods along the visible corners, nuts on both caps
  out.push(L(k.segment([x0 + 10, y + 9, z + 9], [x0 + 82, y + 9, z + 9], P) + k.segment([x0 + 10, y + 9, z - 9], [x0 + 82, y + 9, z - 9], P), { tone: "lo" }));
  out.push(D([x0, x0 + 92].flatMap((x) => [at([x, y + 9, z + 9]), at([x, y + 9, z - 9])]), { size: 0.55 }));
  out.push(L(k.sideRing([x0 + 5, y + 10, z], 2, "y", P) + k.sideRing([x0 + 87, y + 10, z], 2, "y", P), { tone: "lo" }));
  out.push(D([at([x0 + 5, y + 10, z]), at([x0 + 87, y + 10, z])], { size: 0.6, tone: "mid" }));
  return out.join("");
}

function pusherRod() {
  const { y, z } = ROD;
  const x0 = TABLE.x + 14;
  const x1 = CART_X - 28;
  const out = [S(slab({ x: x0, y: y - 2.2, w: x1 - x0 - 6, d: 4.4, r: 2.2 }, z - 2.2, 4.4, 6), { tone: "hi", crease: "none" })];
  // clevis bolted to the carriage plate
  out.push(S(slab({ x: x1 - 8, y: y - 6, w: 8, d: 12, r: 0.8 }, TABLE_Z + 10, z - TABLE_Z - 2, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([x1 - 4, y + 6, z], 2, "y", P), { tone: "lo" }));
  return out.join("");
}

// ---- roller conveyor towards HSB05 --------------------------------------------
function conveyorBack() {
  const { x0, x1, y0, y1, z } = CONV;
  const out = [];
  for (const x of [x0 + 10, x1 - 10]) out.push(S(slab({ x: x - 2, y: y0 - 2, w: 4, d: 4, r: 0.4 }, 0, z - 7, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x0, y: y0 - 4, w: x1 - x0, d: 4, r: 0.5 }, z - 8, 9, 2, 0.4), { tone: "mid" }));
  for (let x = x0 + 4; x < x1 - 3; x += 7) out.push(S(slab({ x, y: y0, w: 4.6, d: y1 - y0, r: 2.3 }, z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

function conveyorFront() {
  const { x0, x1, y1, z } = CONV;
  const out = [];
  for (const x of [x0 + 10, x1 - 10]) {
    out.push(S(slab({ x: x - 4, y: y1, w: 8, d: 8, r: 0.5 }, 0, 1.4, 2), { tone: "mid" }));
    out.push(S(slab({ x: x - 2, y: y1 + 2, w: 4, d: 4, r: 0.4 }, 1.4, z - 8.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: x0, y: y1, w: x1 - x0, d: 4, r: 0.5 }, z - 8, 9, 2, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 19 }, (_, i) => at([x0 + 6.3 + i * 7, y1 + 4, z - 3])), { size: 0.35, tone: "lo" }));
  out.push(S(slab({ x: x1, y: CONV.y0 - 4, w: 4, d: y1 - CONV.y0 + 8, r: 0.6 }, z - 8, 16, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// a deburred block waiting on the conveyor
function doneBlock() {
  const plan = { x: 160, y: -18.5, w: 48, d: 37, r: 1.2 };
  const top = CONV.z + BLOCK_H;
  const out = [S(slab(plan, CONV.z, BLOCK_H, 2, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(plan, CONV.z + PARTING, P, 2), { tone: "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 7.5 + i * 11, 0, 4.4, top, P, 32)).join(""), { tone: "mid" }));
  return out.join("");
}

// ---- push-button box on a pedestal at the operator side ---------------------
function buttons() {
  const out = [];
  const px = -64;
  const py = 70;
  out.push(S(slab({ x: px - 8, y: py - 8, w: 16, d: 16, r: 0.8 }, 0, 2, 2), { tone: "mid" }));
  out.push(D(k.corners({ x: px - 8, y: py - 8, w: 16, d: 16 }, 2.5).map(([x, y]) => at([x, y, 2])), { size: 0.4 }));
  out.push(S(slab({ x: px - 3, y: py - 3, w: 6, d: 6, r: 0.4 }, 2, 80, 2, 0.3), { tone: "mid" }));
  const box = { x: px - 16, y: py - 10, w: 32, d: 16, r: 1 };
  out.push(S(slab(box, 82, 42, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 118, P, 3), { tone: "faint" }) }));
  // 4 × 5 grid of push buttons on the face towards the operator
  const fy = box.y + box.d;
  const grid = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) grid.push([box.x + 6 + c * 5, 110 - r * 6.5]);
  out.push(L(grid.map(([x, z]) => k.sideRing([x, fy, z], 1.8, "y", P)).join(""), { tone: "lo" }));
  out.push(D(grid.map(([x, z]) => at([x, fy, z])), { size: 0.7, tone: "mid" }));
  // emergency stop on top with its collar
  out.push(S(k.cylinder(box.x + 24, box.y + 8, 4.4, 124, 2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(box.x + 24, box.y + 8, 3.4, 126, 3, P, 24, 0.6), { tone: "hi" }));
  out.push(L(k.ring(box.x + 24, box.y + 8, 2, 129, P, 20), { tone: "lo" }));
  return out.join("");
}

const body = [
  floor(),
  railing(),
  post(POST_Y[0]),
  conveyorBack(),
  legsBack(),
  pusher(),
  tableTop(),
  carriage(),
  pusherRod(),
  cheek(-22.5),
  block(),
  cheek(18.5),
  lever(),
  doneBlock(),
  conveyorFront(),
  legsFront(),
  liftRod(),
  guard(),
  post(POST_Y[1]),
  beam(),
  liftCylinder(),
  buttons(),
];

const LABEL =
  "Station Baritori, deburring: a timber portal whose air cylinder lowers a guard plate over a slide table. A pusher cylinder drives the carriage that carries a BC block on its cradle, and a roller conveyor takes the cleaned block on to HSB05.";

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
    writeFileSync(join(OUT, `baritori-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `baritori-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// =============================================================================
// Live figure: the same drawing, moving through the cycle of baritori-3d.html.
// The model (bariSolve, bariStep, bariGo) and the moving geometry (bariScene and
// its parts) are plain functions over `k`, `P` and `M`; the page gets their source
// with the kit inlined, so the browser draws every frame with the build's own code.
// =============================================================================

const WORK_X = CART_X;
const M = {
  // physics, from baritori-3d.html (SI units)
  BAR: 1e5,
  ATM: 1.013e5,
  A_PUSH: Math.PI * 0.0315 ** 2, // 63 mm pusher bore
  A_HAM: Math.PI * 0.0095 ** 2, // 19 mm chisel piston
  STROKE: 0.05,
  ETA: 0.45,
  E_CHIP: 3e9, // J/m3 to chip grey iron
  A_FIN: 3e-3 * 1.5e-3, // fin section
  TIME_K: 12, // chipping shown 12x fast, as in 3D
  // cycle (s); deburr lasts as long as the flash takes to come off
  DUR: { load: 1.6, in: 2.2, guard: 1.2, turn: 0.9, raise: 1.2, index: 2.4, back: 2.2 },
  NEXT: { load: "in", in: "guard", guard: "deburr", turn: "deburr", raise: "index", index: "back", back: "load" },
  ORDER: ["load", "in", "guard", "deburr", "raise", "index", "back"],
  // world (cm)
  LOAD_X: -30,
  WORK_X,
  TABLE_Z,
  TURN_Z: TABLE_Z + 12, // turntable top
  BLOCK_Z: TABLE_Z + 13, // block base on the cradle seat
  BLOCK_L: 48,
  BLOCK_W: 37,
  BLOCK_H,
  PARTING,
  FACE_LEN: [48, 37, 48, 37], // in the order the chisel works them
  ROD_X0: TABLE.x + 14,
  ROD_Z: ROD.z,
  PLATE_BACK: 36, // carriage plate runs from cx - 36: clear of the block's 30.3 sweep
  GUARD_Z1: GUARD.z1,
  GUARD_DROP: 28, // rubber lip stops 2 above the clevis
  BEAM_Z,
  CONV_DROP: TABLE_Z + 13 - CONV.z,
  BAL: [WORK_X, 36, 213], // cable leaves the spring balancer here
  EYE: [0, 16.5, 5.8], // cable eye on the chisel, from its tip
  PARK: [WORK_X, 44, TABLE_Z + 13 + PARTING + 12],
  LAMP: [-74, 76, 110], // first push button: lit while loading
};
M.FACE_END = M.FACE_LEN.map((_, i) => M.FACE_LEN.slice(0, i + 1).reduce((s, l) => s + l, 0));
M.PERIM = M.FACE_END[3];

const approach = (a, b, tau, dt) => b + (a - b) * Math.exp(-dt / tau);
const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// one line pressure → pusher force, blow rate and energy, flash taken off per second
function bariSolve(p) {
  const f = p > 0.5 * M.BAR ? 30 * Math.sqrt(p / (6 * M.BAR)) : 0;
  const E = M.ETA * p * M.A_HAM * M.STROKE;
  return { F: p * M.A_PUSH, f, E, rate: (f * E) / (M.E_CHIP * M.A_FIN) * 100 }; // rate in cm/s
}

function bariState() {
  return { phase: "load", pt: 0, clock: 0, face: 0, removed: 0, p: 6 * M.BAR, target: 6, f: 0, E: 0, rate: 0, F: 0, chisel: [...M.PARK] };
}

// jump to a step of the cycle, the flash taken off up to `frac`
function bariGo(st, phase, frac = 0) {
  st.phase = phase;
  st.pt = 0;
  st.removed = phase === "raise" || phase === "index" || phase === "back" ? M.PERIM : M.PERIM * frac;
  const k = M.FACE_END.findIndex((end) => st.removed < end - 1e-6);
  st.face = k === -1 ? 4 : k;
}

function bariStep(st, dt) {
  st.clock += dt;
  st.p = approach(st.p, st.target * M.BAR, 0.3, dt);
  const sol = bariSolve(st.p);
  st.F = sol.F;
  st.E = sol.E;
  st.rate = sol.rate;
  st.f = st.phase === "deburr" ? sol.f : approach(st.f, 0, 0.1, dt);
  st.pt += dt;
  const u = M.DUR[st.phase] ? Math.min(1, st.pt / M.DUR[st.phase]) : 0;
  if (st.phase === "deburr") {
    st.removed = Math.min(M.FACE_END[st.face], st.removed + st.rate * M.TIME_K * dt);
    if (st.removed >= M.FACE_END[st.face] - 1e-6) {
      st.face++;
      st.phase = st.face >= 4 ? "raise" : "turn"; // the raise brings the fourth quarter turn: square again
      st.pt = 0;
    }
  } else if (u >= 1) {
    if (st.phase === "back") {
      st.removed = 0;
      st.face = 0;
    }
    st.phase = M.NEXT[st.phase];
    st.pt = 0;
  }
  // the chisel rides the parting line of the face towards the operator, or hangs parked
  const working = st.phase === "deburr";
  let target = M.PARK;
  if (working) {
    const k = Math.min(st.face, 3);
    const len = M.FACE_LEN[k];
    const along = Math.min(1, Math.max(0, (st.removed - (M.FACE_END[k] - len)) / len));
    target = [M.WORK_X - len / 2 + len * along, (k % 2 ? M.BLOCK_L : M.BLOCK_W) / 2 + 1, M.BLOCK_Z + M.PARTING];
  }
  for (let i = 0; i < 3; i++) st.chisel[i] = approach(st.chisel[i], target[i], working ? 0.06 : 0.25, dt);
}

// where everything is at this moment of the cycle
function bariPose(st) {
  const u = M.DUR[st.phase] ? Math.min(1, st.pt / M.DUR[st.phase]) : 0;
  const e = u * u * (3 - 2 * u);
  const ph = st.phase;
  const cx = ph === "load" ? M.LOAD_X : ph === "in" ? M.LOAD_X + (M.WORK_X - M.LOAD_X) * e : ph === "back" ? M.WORK_X + (M.LOAD_X - M.WORK_X) * e : M.WORK_X;
  const down = ph === "guard" ? e : ph === "deburr" || ph === "turn" ? 1 : ph === "raise" ? 1 - e : 0;
  const quarter = ph === "turn" || ph === "raise" ? st.face - 1 + e : ph === "deburr" ? st.face : 0;
  const pose = { cx, down, angle: (quarter * Math.PI) / 2, carried: ph !== "index" && ph !== "back", alpha: ph === "load" ? e : 1 };
  if (ph === "index") {
    pose.travel = {
      dx: smooth01(0, 0.6, u) * 95 + Math.max(0, u - 0.6) * 50,
      dz: -M.CONV_DROP * smooth01(0.45, 0.6, u),
      alpha: u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4,
    };
  }
  return pose;
}

// the BC block at any turn: body, parting line on the faces we see, bores, bolt holes,
// and the flash still left on the parting line
function bariBlock(b) {
  const c = Math.cos(b.angle);
  const s = Math.sin(b.angle);
  const W = ([lx, ly]) => [b.x + lx * c - ly * s, b.y + lx * s + ly * c];
  const L = M.BLOCK_L;
  const D = M.BLOCK_W;
  const top = b.z + M.BLOCK_H;
  const zp = b.z + M.PARTING;
  const ring = k.ringOf({ x: -L / 2, y: -D / 2, w: L, d: D, r: 1.2 }, 2).map(W);
  const [vx, vy] = k.towardViewer(P);
  let area = 0;
  ring.forEach(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % ring.length];
    area += ax * by - bx * ay;
  });
  let seam = "";
  ring.forEach(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % ring.length];
    const nx = area > 0 ? by - ay : ay - by;
    const ny = area > 0 ? ax - bx : bx - ax;
    if (nx * vx + ny * vy > 1e-9) seam += k.segment([ax, ay, zp], [bx, by, zp], P);
  });
  const out = [k.solidSvg(k.extrude(ring, b.z, M.BLOCK_H, P, { convex: true, bevel: 0.6 }), { tone: "hi", crease: "lo", lit: true, inner: k.lineSvg(seam, { tone: "lit" }) })];
  out.push(k.lineSvg([-16.5, -5.5, 5.5, 16.5].map((lx) => k.ring(...W([lx, 0]), 4.4, top, P, 32)).join(""), { tone: "lit" }));
  const bolts = [-21.5, -11, 0, 11, 21.5].flatMap((lx) => [W([lx, -16]), W([lx, 16])]);
  out.push(k.dotsSvg(bolts.map(([x, y]) => k.iso([x, y, top], P)), { size: 0.45, tone: "lit" }));
  // flash: face f is the one that turns to the operator after f quarter turns
  const fins = [];
  let from = 0;
  M.FACE_LEN.forEach((len, f) => {
    const a = (-f * Math.PI) / 2;
    const r = ([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const [nlx, nly] = r([0, 1]);
    if ((nlx * c - nly * s) * vx + (nlx * s + nly * c) * vy > 0.05) {
      const half = (f % 2 ? L : D) / 2 + 0.6;
      const n = Math.round(len / 5);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        if (from + t * len > b.removed) fins.push(k.iso([...W(r([-len / 2 + t * len, half])), zp], P));
      }
    }
    from += len;
  });
  out.push(k.dotsSvg(fins, { size: 0.55, tone: "lit" }));
  return out.join("");
}

// seat and cheeks on the turntable, turning together; the block between the cheeks
function bariCradle(pose, removed) {
  const c = Math.cos(pose.angle);
  const s = Math.sin(pose.angle);
  const W = ([lx, ly]) => [pose.cx + lx * c - ly * s, lx * s + ly * c];
  const box = (plan) => k.ringOf(plan, 2).map(W);
  const solid = (plan, z, h, style, bevel = 0.4) => k.solidSvg(k.extrude(box(plan), z, h, P, { convex: true, bevel }), style);
  const out = [solid({ x: -22, y: -18, w: 44, d: 36, r: 0.6 }, M.TURN_Z, 1, { tone: "mid", crease: "none" }, 0)];
  const cheeks = [-1, 1]
    .map((side) => {
      const y = side > 0 ? 19 : -22;
      const face = side > 0 ? 22 : -22;
      const parts = [solid({ x: -15, y, w: 30, d: 3, r: 0.5 }, M.BLOCK_Z, 10, { tone: "mid" })];
      const dot = (lx, z) => k.iso([...W([lx, face]), z], P);
      parts.push(k.dotsSvg([dot(0, M.BLOCK_Z + 5)], { size: 0.8, tone: "mid" }));
      parts.push(k.dotsSvg([dot(-11, M.BLOCK_Z + 5), dot(11, M.BLOCK_Z + 5)], { size: 0.4 }));
      return { depth: k.depthOf([...W([0, side * 20.5]), 0], P), svg: parts.join("") };
    })
    .sort((a, b) => a.depth - b.depth);
  out.push(cheeks[0].svg);
  if (pose.carried && pose.alpha > 0) {
    const block = bariBlock({ x: pose.cx, y: 0, z: M.BLOCK_Z, angle: pose.angle, removed });
    out.push(pose.alpha < 1 ? `<g opacity="${pose.alpha.toFixed(3)}">${block}</g>` : block);
  }
  out.push(cheeks[1].svg);
  return out.join("");
}

// every moving piece of the drawing for one state, as markup and transforms
function bariScene(st) {
  const pose = bariPose(st);
  const drop = pose.down * M.GUARD_DROP;
  const rodEnd = pose.cx - M.PLATE_BACK;
  const working = st.phase === "deburr";
  const [tx, ty, tz] = st.chisel;
  const eye = [tx + M.EYE[0], ty + M.EYE[1], tz + M.EYE[2]];
  let chips = "";
  if (working && st.f > 1) {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (st.clock * 2.2 + i / 12) % 1;
      const vx = ((i % 5) - 2) * 6;
      const vy = 12 + (i % 3) * 5;
      const vz = 8 + (i % 4) * 4;
      const [sx, sy] = k.iso([tx + vx * a, ty + vy * a, tz + vz * a - 40 * a * a], P);
      pts.push([sx, sy, (1 - a) * Math.min(1, st.f / 20)]);
    }
    chips = k.dotsSvg(pts, { size: 0.6, tone: "mid" });
  }
  let travel = "";
  if (pose.travel && pose.travel.alpha > 0) {
    const block = bariBlock({ x: M.WORK_X + pose.travel.dx, y: 0, z: M.BLOCK_Z + pose.travel.dz, angle: 0, removed: M.PERIM });
    travel = `<g opacity="${pose.travel.alpha.toFixed(3)}">${block}</g>`;
  }
  return {
    carriage: k.translateAlong(P, [pose.cx - M.WORK_X, 0, 0]),
    rod: k.solidSvg(k.slabOf({ x: M.ROD_X0, y: -2.2, w: rodEnd - M.ROD_X0, d: 4.4, r: 2.2 }, M.ROD_Z - 2.2, 4.4, P, 6), { tone: "hi", crease: "none" }),
    cradle: bariCradle(pose, st.removed),
    travel,
    // the guard is drawn behind the carriage once the block has passed under it
    guardBehind: pose.cx > 6,
    guard: k.translateAlong(P, [0, 0, -drop]),
    liftRod: k.solidSvg(k.cylinder(0, 0, 2.2, M.GUARD_Z1 + 6 - drop, M.BEAM_Z - M.GUARD_Z1 - 6 + drop, P, 20), { tone: "hi", crease: "none" }),
    chisel: k.translateAlong(P, [tx, ty + (working ? Math.sin(st.clock * st.f * 2 * Math.PI) * 0.3 : 0), tz]),
    cable: k.lineSvg(k.segment(M.BAL, eye, P), { tone: "lo" }) + k.dotsSvg([k.iso(eye, P)], { size: 0.5, tone: "mid" }),
    chips,
    lamp: st.phase === "load" ? 1 : 0,
  };
}

const SAY = { load: "loading a raw block", in: "pushing in", guard: "guard down", deburr: "chipping the flash", turn: "turning 90°", raise: "guard up", index: "on to HSB05", back: "carriage back" };
const STEPS = { load: "Load", in: "Push in", guard: "Guard down", deburr: "Chip ×4", raise: "Guard up", index: "To HSB05", back: "Back" };

function bariReadout(st) {
  const pct = Math.round((st.removed / M.PERIM) * 100);
  const face = st.phase === "deburr" || st.phase === "turn" ? ` · face ${Math.min(4, st.face + 1)} of 4` : "";
  return `${SAY[st.phase]}${face} · ${pct}% flash off`;
}

function bariNumbers(st) {
  const bar = (st.p / M.BAR).toFixed(1);
  return `${bar} bar · ${Math.round(st.f)} blows/s · ${st.E.toFixed(1)} J/blow · ${(st.rate * 10).toFixed(1)} mm/s · pusher ${Math.round(st.F)} N`;
}

// ---- self-check: one full cycle visits every step in order, takes all the flash off, ends square
{
  const st = bariState();
  const seen = ["load"];
  let removedAll = false;
  for (let t = 0; t < 60 && !(seen.length > 1 && seen.at(-1) === "load"); t += 1 / 60) {
    bariStep(st, 1 / 60);
    if (seen.at(-1) !== st.phase && st.phase !== "turn") seen.push(st.phase);
    if (st.removed >= M.PERIM - 1e-6) removedAll = true;
  }
  const want = ["load", "in", "guard", "deburr", "raise", "index", "back", "load"];
  if (JSON.stringify(seen) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  if (!removedAll) throw new Error("flash never fully removed");
  const end = bariState();
  bariGo(end, "raise");
  end.pt = M.DUR.raise;
  if (Math.abs(bariPose(end).angle - 2 * Math.PI) > 1e-9) throw new Error("block not square after the raise");
  bariGo(end, "deburr", 0.4);
  if (end.face !== 1) throw new Error(`40% of the flash should be on face 2, got ${end.face + 1}`);
  console.log(`cycle check passed (${seen.join(" → ")})`);
}

// ---- static parts that only the live figure has -------------------------------
// carriage with the turntable and the pusher clevis, drawn at the work station
function carriageLive() {
  const out = [];
  for (const [x, y] of byDepth([[WORK_X - 18, RAIL_Y[0]], [WORK_X + 18, RAIL_Y[0]], [WORK_X - 18, RAIL_Y[1]], [WORK_X + 18, RAIL_Y[1]]], ([x, y]) => [x, y, 0])) {
    out.push(S(slab({ x: x - 6, y: y - 3, w: 12, d: 10, r: 0.8 }, TABLE_Z + 1, 5, 2, 0.4), { tone: "mid" }));
  }
  const plate = { x: WORK_X - M.PLATE_BACK, y: -30, w: M.PLATE_BACK + 30, d: 60, r: 1 };
  out.push(S(slab(plate, TABLE_Z + 6, 4, 2, 0.5), { tone: "mid" }));
  out.push(D(k.corners(plate, 3.5).map(([x, y]) => at([x, y, TABLE_Z + 10])), { size: 0.45 }));
  // clevis standing on the plate's back edge, pin through it on the rod axis
  out.push(S(slab({ x: plate.x, y: -6, w: 5, d: 12, r: 0.6 }, TABLE_Z + 10, ROD.z - TABLE_Z - 2, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([plate.x + 2.5, 6, ROD.z], 2, "y", P), { tone: "lo" }));
  // turntable under the cradle, bolt circle on top
  out.push(S(k.cylinder(WORK_X, 0, 20, TABLE_Z + 10, 2, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.ring(WORK_X, 0, 17, TABLE_Z + 12, P, 48), { tone: "faint" }));
  out.push(D([0, 1, 2, 3, 4, 5].map((i) => at([WORK_X + 17 * Math.cos(i + 0.5), 17 * Math.sin(i + 0.5), TABLE_Z + 12])), { size: 0.4 }));
  return out.join("");
}

// the chisel at rest: tip at the origin, pointing along -y at the block
function chisel() {
  const out = [];
  out.push(S(slab({ x: -0.8, y: 0, w: 1.6, d: 6, r: 0.8 }, -0.8, 1.6, 4), { tone: "hi", crease: "none" })); // bit
  out.push(S(slab({ x: -2.2, y: 5, w: 4.4, d: 3, r: 2.2 }, -2.2, 4.4, 4), { tone: "mid", crease: "none" })); // retainer
  out.push(S(slab({ x: -2.2, y: 23, w: 4.4, d: 3, r: 1 }, -10, 8, 2, 0.4), { tone: "lo" })); // grip
  out.push(S(slab({ x: -0.8, y: 19, w: 1.6, d: 2.2, r: 0.5 }, -6, 3.2, 2), { tone: "mid", crease: "none" })); // trigger
  const bodyPlan = { x: -2.8, y: 8, w: 5.6, d: 19, r: 2.8 };
  const bands = [12, 17, 22].map((y) => k.lineOnTop([-2.8, y], [2.8, y], 2.8, P)).join("");
  out.push(S(slab(bodyPlan, -2.8, 5.6, 6), { tone: "mid", crease: "none", inner: L(bands, { tone: "faint" }) }));
  out.push(S(slab({ x: -1.2, y: 27, w: 2.4, d: 3, r: 1.2 }, -1.2, 2.4, 4), { tone: "lo", crease: "none" })); // air inlet
  out.push(S(slab({ x: -1, y: 15, w: 2, d: 3, r: 0.6 }, 2.8, 3, 2), { tone: "mid", crease: "none" })); // cable eye
  return out.join("");
}

// balancer arm off the beam's front face, the spring balancer hanging under it
function balancer() {
  const out = [];
  const arm = { x: 9, y: 33, w: 66, d: 6, r: 0.6 };
  out.push(S(slab(arm, BEAM_Z + 4, 6, 2, 0.4), { tone: "mid" }));
  out.push(D([[11.5, 34.5], [11.5, 37.5]].map(([x, y]) => at([x, y, BEAM_Z + 10])), { size: 0.45 }));
  out.push(S(slab({ x: 73, y: 32, w: 3, d: 8, r: 0.4 }, BEAM_Z + 2, 10, 2), { tone: "mid", crease: "none" })); // end stop
  const [bx, by] = M.BAL;
  out.push(S(slab({ x: bx - 1, y: by - 1, w: 2, d: 2, r: 0.4 }, BEAM_Z - 6, 10, 2), { tone: "mid", crease: "none" })); // hook
  out.push(S(k.cylinder(bx, by, 7, M.BAL[2] + 3, 18, P, 40, 0.6), { tone: "mid", inner: L(k.sideArc(bx, by, 7, M.BAL[2] + 12, P, 24), { tone: "faint" }) }));
  out.push(L(k.ring(bx, by, 4, M.BAL[2] + 21, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(bx, by, 1.6, M.BAL[2], 3, P, 16), { tone: "mid", crease: "none" }));
  return out.join("");
}

// ---- page -------------------------------------------------------------------
function livePage() {
  const st = bariState();
  bariGo(st, "deburr", 0.18);
  st.chisel = [WORK_X - 24 + 48 * 0.64, M.BLOCK_W / 2 + 1, M.BLOCK_Z + PARTING];
  const f0 = bariScene(st);
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  const guardPart = `<g data-part="guard">${slot("liftrod", f0.liftRod)}<g data-part="plate" transform="${f0.guard}">${guard()}</g></g>`;
  const liveBody = [
    floor(),
    railing(),
    post(POST_Y[0]),
    conveyorBack(),
    legsBack(),
    pusher(),
    tableTop(),
    slot("rod", f0.rod),
    slot("guard-behind", f0.guardBehind ? guardPart : ""),
    `<g data-part="carriage" transform="${f0.carriage}">${carriageLive()}</g>`,
    slot("cradle", f0.cradle),
    slot("travel", f0.travel),
    conveyorFront(),
    legsFront(),
    slot("guard-front", f0.guardBehind ? "" : guardPart),
    post(POST_Y[1]),
    beam(),
    liftCylinder(),
    buttons(),
    `<g data-part="lamp" opacity="0">${D([at(M.LAMP)], { size: 1.3, tone: "lit" })}</g>`,
    `<g data-part="chisel" transform="${f0.chisel}">${chisel()}</g>`,
    balancer(),
    slot("cable", f0.cable),
    slot("chips", f0.chips),
  ];
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "Station Baritori, running: the pusher drives the carriage through the portal, the guard drops, an air chisel on a spring balancer chips the flash off the parting line one face at a time while the cradle turns the block a quarter turn between faces, then the block rolls on to HSB05.",
    body: liveBody,
  }).replace(`viewBox="0 0 ${WIDTH} ${HEIGHT}"`, 'viewBox="78 34 444 372"'); // cropped to the drawing (getBBox 86 41 428 358) so it fills the card
  const steps = M.ORDER.map((p) => `<button type="button" data-go="${p}">${STEPS[p]}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Line pressure <input type="range" min="4" max="7" step="0.1" value="6" aria-label="Line pressure, bar"><output>6.0 bar</output></label>
<div class="bari-num" data-numbers>${bariNumbers({ ...st, f: 30, E: bariSolve(6 * M.BAR).E, rate: bariSolve(6 * M.BAR).rate, F: bariSolve(6 * M.BAR).F })}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "Baritori",
    title: "Deburring cycle",
    hint: "Click to pause",
    readout: bariReadout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="Baritori cycle, click or press space to pause">${svg}</div>`,
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
.bari-p output{min-width:52px;font-variant-numeric:tabular-nums}
.bari-num{flex-basis:100%;color:var(--anatomy-muted);font:11px/1.3 var(--anatomy-mono);font-variant-numeric:tabular-nums}
/* phones: the drawing keeps the room, the controls get tight */
@media (max-width:480px){
.iso-plate{padding:24px 4px 20px}
.iso-plate-corner[data-corner="hint"],.bari-num{display:none}
.bari-ctl{gap:4px 6px;padding:6px 8px 8px;font-size:11px}
.bari-ctl button{padding:3px 7px}
.bari-p{margin-left:0}
.bari-p input{width:84px}
}
</style>`;
  const fns = [approach, smooth01, bariSolve, bariState, bariGo, bariStep, bariPose, bariBlock, bariCradle, bariScene, bariReadout, bariNumbers].map((fn) => (typeof fn === "function" && fn.name && !fn.toString().startsWith("function") ? `const ${fn.name} = ${fn}` : `${fn}`));
  const live = `
const k = { iso, segment, ring, ringOf, extrude, slabOf, cylinder, solidSvg, lineSvg, dotsSvg, towardViewer, depthOf, translateAlong };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
const SAY = ${JSON.stringify(SAY)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const q = (sel) => svg.querySelector(sel);
const slots = Object.fromEntries([...svg.querySelectorAll("[data-slot]")].map((el) => [el.dataset.slot, el]));
const parts = { carriage: q('[data-part="carriage"]'), guard: q('[data-part="guard"]'), plate: q('[data-part="plate"]'), chisel: q('[data-part="chisel"]'), lamp: q('[data-part="lamp"]') };
const liftSlot = parts.guard.querySelector('[data-slot="liftrod"]');
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector('.bari-p input');
const rangeOut = document.querySelector('.bari-p output');
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = bariState();
bariGo(st, still.matches ? "deburr" : "load", still.matches ? 0.4 : 0);
const set = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = bariScene(st);
  set(parts.carriage, "transform", f.carriage);
  html(slots.rod, f.rod);
  html(slots.cradle, f.cradle);
  html(slots.travel, f.travel);
  const home = f.guardBehind ? slots["guard-behind"] : slots["guard-front"];
  if (parts.guard.parentNode !== home) home.appendChild(parts.guard);
  set(parts.plate, "transform", f.guard);
  html(liftSlot, f.liftRod);
  set(parts.chisel, "transform", f.chisel);
  html(slots.cable, f.cable);
  html(slots.chips, f.chips);
  set(parts.lamp, "opacity", String(f.lamp));
  const text = bariReadout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = bariNumbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  const current = st.phase === "turn" ? "deburr" : st.phase;
  for (const b of stepBtns) if (b.dataset.go === current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  bariStep(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { bariGo(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.target = Number(range.value); rangeOut.textContent = st.target.toFixed(1) + " bar"; if (!playing) { st.p = st.target * M.BAR; draw(); } });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __bari.at("deburr", 0.4, 0) pauses on that step, with that much flash off, that far in
window.__bari = { at(phase, frac = 0, pt = 0) { setPlaying(false); bariGo(st, phase, frac); for (let t = 0; t < pt; t += 1 / 60) bariStep(st, 1 / 60); draw(); return bariReadout(st); } };
`;
  return k.pageHtml({ title: "Baritori · deburring cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "baritori-live.html"), html);
  console.log(`wrote ${join(OUT, "baritori-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
