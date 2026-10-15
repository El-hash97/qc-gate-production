// Isometric figure of station Baritori (deburring) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a timber portal with an air
// cylinder that lowers a guard plate, a slide table whose carriage carries the BC
// block on a tilting cradle, a tie-rod pusher cylinder at the far end, the roller
// conveyor that takes the block on to HSB05 and the push-button box beside the portal.
//   node station-kit/figure/stations/baritori.mjs [outDir]   →   <outDir>/baritori-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
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

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
  writeFileSync(join(OUT, `baritori-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `baritori-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
