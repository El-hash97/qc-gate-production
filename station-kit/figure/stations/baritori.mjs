// Isometric figure of station Baritori (deburring) for the station detail card in
// /visualisasi, laid out from the Blender file (animasi/line finishing before
// improvement.blend): a closed deburring booth with a timber portal and a lift door on
// its front face, a carriage on rails that takes the block in through the portal, and a
// roller conveyor at right angles to the carriage line that turns the block away to
// HSB05. The booth's near wall is drawn cut away so the work inside shows: an air chisel
// on a gantry slide chips the casting flash off the parting line while a turntable turns
// the block a quarter turn between faces. (The Blender booth is a closed box; what is
// inside is our assumption.)
// The live page runs the cycle: load at the mouth, carriage in, door down, chip four
// faces, door up, carriage out, a kicker tips the block over onto the conveyor, and it
// rolls away to HSB05. The static SVGs are one frame of the same scene.
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
const HEIGHT = 440;

// ---- world (cm, z up) -----------------------------------------------------------
// Blender units are 10 cm; the layout is turned half a turn (x = -10·Xb, y = -10·Yb) so
// the operator side, the portal and the conveyor face the viewer.
const BOOTH = { x: -393, y: 36, w: 345, d: 278, h: 183, wall: 4 }; // Cube.017
const FRONT_X = BOOTH.x + BOOTH.w; // -48: the portal face
const CUT_Y = BOOTH.y; // 36: the long wall towards the camera, drawn cut away
const FAR_Y = BOOTH.y + BOOTH.d - BOOTH.wall; // 310: inner face of the far long wall
const OPEN = { y0: 103, y1: 197, z1: 120 }; // doorway in the front wall
const POST_Y = [90, 197]; // timber posts 13 square (Cube.022 / Cube.032), from y to y + 13
const POST = { x0: -48, x1: -35, h: 226 };
const BEAM_Z = 226; // top beam, 13 deep (Cube.023)
const DOOR = { x0: -46, x1: -42, y0: 104, y1: 196, z0: 14, h: 104, lift: 100 }; // Cylinder.007
const LIFT = { x: -41, y: 150 }; // lift cylinder on the beam (Cylinder.005)
const LINE_Y = 149; // carriage line, through the middle of the doorway
const RAILS = [133, 161]; // 4 wide
const RAIL_X = [-305, 40];
const MOUTH_X = 8; // carriage outside the portal: load and tip here
const WORK_X = -220; // carriage inside: the block turns under the chisel here
const CART = { half: 30, y0: 121, y1: 177 };
const SEAT_Z = 22; // block base on the cradle
const BLOCK = { A: 37, B: 34, H: 48, PART: 26 }; // standing: A along x, B along y, H tall (Cube.019 3.7 x 3.4 x 4.8)
const CONV = { x0: -24, x1: 40, y0: 178, y1: 470, z: 22 }; // rollers (Cylinder.006), at right angles to the line
const KICK = { x: MOUTH_X, y0: 100, y1: 122, z: 58, rest: 128 }; // tips the block over onto the conveyor
const GANTRY = { x0: -305, x1: -140, y: 86, z: 150 }; // chisel slide inside the booth, on the camera side, its beam well above the block
const RAILING_X = 56; // low yellow guard rail along the walkway (Cube.033 ...)
const RAILING_H = 28;
const PAD = { x: -410, y: 22, w: 490, d: 540, r: 10 };
const BOX = { x: -48, y: 46, w: 12, d: 28 }; // push-button box on the booth face (Cube.030), z 70..110

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), ...k.boxCorners(BOOTH, 0, BOOTH.h), [LIFT.x, LIFT.y, BEAM_Z + 13 + 70]],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: -58, elevation: 35 }, // from the booth's end, left of the portal, as the overview camera sees it
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 2, bevel = 0.4) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));
const vseams = (xs, y, z0, z1) => xs.map((x) => k.segment([x, y, z0], [x, y, z1], P)).join("");
const vseamsX = (ys, x, z0, z1) => ys.map((y) => k.segment([x, y, z0], [x, y, z1], P)).join("");

// ---- floor -------------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 6), 0, P), { tone: "faint" }));
  // walkway line beside the railing, edge to edge
  out.push(L(k.lineOnTop([RAILING_X + 10, PAD.y + 6], [RAILING_X + 10, PAD.y + PAD.d - 6], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 14);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- booth: back and end walls, roof, the frame left where the near wall is cut ------
function boothBack() {
  const { x, y, w, d, h, wall } = BOOTH;
  const out = [];
  // panels every 57.5 on the inner faces we look at
  const xs = Array.from({ length: 5 }, (_, i) => x + (w / 6) * (i + 1));
  out.push(S(slab({ x, y: FAR_Y, w, d: wall, r: 0 }, 0, h, 1, 0), { tone: "mid", inner: L(vseams(xs, FAR_Y, 0, h), { tone: "faint" }) }));
  const ys = Array.from({ length: 3 }, (_, i) => y + (d / 4) * (i + 1));
  out.push(S(slab({ x, y, w: wall, d: d - wall, r: 0 }, 0, h, 1, 0), { tone: "mid", inner: L(vseamsX(ys, x + wall, 0, h), { tone: "faint" }) }));
  // floor plate inside, with a drain grating line along the back
  out.push(S(slab({ x: x + wall, y: y + wall, w: w - wall * 2, d: d - wall * 2, r: 0 }, 0, 1, 1, 0), { tone: "lo", flat: true }));
  out.push(L(k.lineOnTop([x + 10, FAR_Y - 12], [FRONT_X - 10, FAR_Y - 12], 1, P), { tone: "faint" }));
  return out.join("");
}

function roof() {
  const { x, y, w, d, h } = BOOTH;
  const plan = { x, y, w, d, r: 0 };
  const xs = Array.from({ length: 5 }, (_, i) => x + (w / 6) * (i + 1));
  const seams = xs.map((sx) => k.lineOnTop([sx, y], [sx, y + d], h, P)).join("");
  const out = [S(slab(plan, h - 4, 4, 1, 0.4), { tone: "mid", inner: L(seams, { tone: "faint" }) })];
  // dust extraction stub on the roof, flange bolts
  out.push(S(k.cylinder(x + 70, y + 200, 14, h, 22, P, 36, 0.5), { tone: "mid" }));
  out.push(L(k.ring(x + 70, y + 200, 11, h + 22, P, 36), { tone: "lo" }));
  out.push(D([0, 1, 2, 3, 4, 5].map((i) => at([x + 70 + 17 * Math.cos(i), y + 200 + 17 * Math.sin(i), h])), { size: 0.45 }));
  return out.join("");
}

// where the long wall towards the camera was: sill, corner posts and the roof edge stay
function nearFrame() {
  const { x, w, h, wall } = BOOTH;
  const y = CUT_Y;
  const out = [];
  out.push(S(slab({ x: x + wall, y, w: w - wall * 2, d: wall, r: 0 }, 0, 10, 1, 0), { tone: "mid" }));
  for (const px of [x, FRONT_X - wall]) out.push(S(slab({ x: px, y, w: wall, d: wall, r: 0 }, 0, h - 4, 1, 0), { tone: "mid" }));
  out.push(S(slab({ x, y, w, d: wall, r: 0 }, h - 12, 8, 1, 0), { tone: "mid" }));
  // cut edge of the missing panel: bolt heads along the sill
  out.push(D(Array.from({ length: 11 }, (_, i) => at([x + 20 + i * 31, CUT_Y, 5])), { size: 0.4 }));
  return out.join("");
}

// front wall with its doorway: left of it, right of it, the lintel above
function frontWall() {
  const { y, h, wall } = BOOTH;
  const x = FRONT_X - wall;
  const out = [];
  out.push(S(slab({ x, y: y + wall, w: wall, d: OPEN.y0 - y - wall, r: 0 }, 0, h, 1, 0), { tone: "mid", inner: L(vseamsX([72], FRONT_X, 0, h), { tone: "faint" }) }));
  out.push(S(slab({ x, y: OPEN.y0, w: wall, d: OPEN.y1 - OPEN.y0, r: 0 }, OPEN.z1, h - OPEN.z1, 1, 0), { tone: "mid" }));
  out.push(S(slab({ x, y: OPEN.y1, w: wall, d: FAR_Y - OPEN.y1, r: 0 }, 0, h, 1, 0), { tone: "mid", inner: L(vseamsX([254], FRONT_X, 0, h), { tone: "faint" }) }));
  return out.join("");
}

// ---- timber portal, lift cylinder, push-button box -------------------------------------
function post(y) {
  const { x0, x1, h } = POST;
  const plan = { x: x0, y, w: x1 - x0, d: 13, r: 0.8 };
  const out = [S(slab({ x: x0 - 2, y: y - 3, w: x1 - x0 + 4, d: 19, r: 1 }, 0, 3, 2, 0.6), { tone: "mid" })];
  const grain = [3.5, 6.5, 9.5].map((t) => k.segment([x1, y + t, 3], [x1, y + t, h], P) + k.segment([x0 + t, y + 13, 3], [x0 + t, y + 13, h], P)).join("");
  out.push(S(slab(plan, 3, h - 3, 2, 0.6), { tone: "mid", inner: L(grain, { tone: "faint" }) }));
  // door guide on the inner face
  const gy = y < 150 ? y + 13 : y - 3;
  out.push(S(slab({ x: DOOR.x0 - 1, y: gy, w: 6, d: 3, r: 0.4 }, 12, 210, 2, 0.3), { tone: "mid" }));
  out.push(D([40, 90, 140, 190].map((z) => at([DOOR.x1 + 1, gy + 1.5, z])), { size: 0.4 }));
  return out.join("");
}

function beam() {
  const plan = { x: POST.x0 - 2, y: POST_Y[0] - 6, w: POST.x1 - POST.x0 + 4, d: POST_Y[1] - POST_Y[0] + 25, r: 1 };
  const grain = [4, 8].map((t) => k.segment([plan.x + plan.w, plan.y, BEAM_Z + t], [plan.x + plan.w, plan.y + plan.d, BEAM_Z + t], P)).join("");
  const out = [S(slab(plan, BEAM_Z, 13, 2, 0.7), { tone: "mid", inner: L(grain, { tone: "faint" }) })];
  for (const y of POST_Y) {
    out.push(S(slab({ x: POST.x1, y: y - 2, w: 1.6, d: 17, r: 0.3 }, BEAM_Z - 14, 26, 2), { tone: "mid", crease: "none" }));
    out.push(D([[y + 2, BEAM_Z - 8], [y + 11, BEAM_Z - 8], [y + 2, BEAM_Z + 7], [y + 11, BEAM_Z + 7]].map(([py, z]) => at([POST.x1 + 1.6, py, z])), { size: 0.45 }));
  }
  return out.join("");
}

function liftCylinder() {
  const { x, y } = LIFT;
  const z0 = BEAM_Z + 13;
  const out = [];
  out.push(S(slab({ x: x - 11, y: y - 11, w: 22, d: 22, r: 1 }, z0, 3, 2, 0.5), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 11, y: y - 11, w: 22, d: 22 }, 3).map(([px, py]) => at([px, py, z0 + 3])), { size: 0.45 }));
  out.push(S(slab({ x: x - 8, y: y - 8, w: 16, d: 16, r: 1 }, z0 + 3, 8, 2, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 6, z0 + 11, 46, P, 36, 0.6), { tone: "mid", crease: "lo" }));
  out.push(S(slab({ x: x - 8, y: y - 8, w: 16, d: 16, r: 1 }, z0 + 57, 8, 2, 0.6), { tone: "mid" }));
  out.push(L(byDepth([[6, 6], [-6, 6], [6, -6]], ([dx, dy]) => [x + dx, y + dy, 0]).map(([dx, dy]) => k.segment([x + dx, y + dy, z0 + 11], [x + dx, y + dy, z0 + 57], P)).join(""), { tone: "lo" }));
  out.push(D(k.corners({ x: x - 8, y: y - 8, w: 16, d: 16 }, 2).map(([px, py]) => at([px, py, z0 + 65])), { size: 0.5 }));
  out.push(L(k.sideRing([x + 8, y, z0 + 7], 1.8, "x", P) + k.sideRing([x + 8, y, z0 + 61], 1.8, "x", P), { tone: "lo" }));
  out.push(D([at([x + 8, y, z0 + 7]), at([x + 8, y, z0 + 61])], { size: 0.55, tone: "mid" }));
  return out.join("");
}

// the door at rest (down): a plate in the post guides with a rubber lip; moved up by `lift`
function door() {
  const { x0, x1, y0, y1, z0, h } = DOOR;
  const plate = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.4 };
  const seams = L(k.sideSeam(plate, z0 + 36, P, 2) + k.sideSeam(plate, z0 + 70, P, 2), { tone: "faint" });
  const out = [S(slab(plate, z0, h, 2, 0.4), { tone: "mid", inner: seams })];
  out.push(S(slab({ x: x0 - 0.5, y: y0 + 2, w: x1 - x0 + 1, d: y1 - y0 - 4, r: 0.6 }, z0 - 4, 4, 2), { tone: "lo", crease: "none" }));
  // clevis on top for the lift rod, a warning label with rule lines
  out.push(S(slab({ x: LIFT.x - 5, y: LIFT.y - 6, w: 10, d: 12, r: 0.8 }, z0 + h, 7, 2, 0.4), { tone: "mid" }));
  const ly = [130, 170];
  const lz = z0 + 48;
  out.push(L(k.pathOf([[x1, ly[0], lz], [x1, ly[1], lz], [x1, ly[1], lz + 14], [x1, ly[0], lz + 14]].map(at), true), { tone: "lo" }));
  out.push(L([4, 7.5, 11].map((dz, i) => k.segment([x1, ly[0] + 4, lz + dz], [x1, ly[1] - 4 - i * 6, lz + dz], P)).join(""), { tone: "faint", free: true }));
  out.push(D([118, 150, 182].map((y) => at([x1, y, z0 + h - 4])), { size: 0.45 }));
  return out.join("");
}

function buttons() {
  const { x, y, w, d } = BOX;
  const out = [];
  out.push(S(slab({ x: x + 2, y: y + 10, w: 7, d: 7, r: 0.4 }, 0, 70, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: x - 2, y: y + 6, w: 15, d: 15, r: 0.6 }, 0, 2, 2), { tone: "mid" }));
  const box = { x, y, w, d, r: 0.8 };
  out.push(S(slab(box, 70, 40, 2, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 102, P, 2), { tone: "faint" }) }));
  const fx = x + w;
  const grid = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) grid.push([y + 5 + c * 6, 96 - r * 7]);
  out.push(L(grid.map(([py, z]) => k.sideRing([fx, py, z], 1.8, "x", P)).join(""), { tone: "lo" }));
  out.push(D(grid.map(([py, z]) => at([fx, py, z])), { size: 0.7, tone: "mid" }));
  out.push(S(k.cylinder(x + 6, y + d - 6, 3.6, 110, 2.6, P, 24, 0.5), { tone: "hi" }));
  return out.join("");
}

// ---- carriage line ------------------------------------------------------------------
function rails(x0, x1) {
  const out = [];
  for (let x = Math.ceil((x0 + 6) / 40) * 40; x < x1 - 4; x += 40) out.push(S(slab({ x: x - 4, y: RAILS[0] - 8, w: 8, d: RAILS[1] - RAILS[0] + 20, r: 0.5 }, 0, 4, 2, 0.3), { tone: "mid" }));
  // rodless air cylinder between the rails drives the carriage
  out.push(S(slab({ x: x0, y: LINE_Y - 4, w: x1 - x0, d: 8, r: 4 }, 4, 6, 6), { tone: "mid", crease: "none" }));
  for (const y of RAILS) out.push(S(slab({ x: x0, y, w: x1 - x0, d: 4, r: 0.4 }, 4, 6, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function railEnds() {
  const out = [];
  for (const x of [RAIL_X[0] - 4, RAIL_X[1]]) out.push(S(slab({ x, y: RAILS[0] - 4, w: 4, d: RAILS[1] - RAILS[0] + 12, r: 0.5 }, 0, 14, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// carriage at the work station: bearing blocks, plate, turntable, drive bracket
function carriage() {
  const cx = WORK_X;
  const out = [];
  for (const [x, y] of byDepth([[cx - 20, RAILS[0]], [cx + 20, RAILS[0]], [cx - 20, RAILS[1]], [cx + 20, RAILS[1]]], ([x, y]) => [x, y, 0])) {
    out.push(S(slab({ x: x - 7, y: y - 2, w: 14, d: 8, r: 0.6 }, 10, 4, 2, 0.3), { tone: "mid" }));
  }
  const plate = { x: cx - CART.half, y: CART.y0, w: CART.half * 2, d: CART.y1 - CART.y0, r: 1 };
  out.push(S(slab(plate, 14, 4, 2, 0.5), { tone: "mid" }));
  out.push(D(k.corners(plate, 3.5).map(([x, y]) => at([x, y, 18])), { size: 0.45 }));
  out.push(S(k.cylinder(cx, LINE_Y, 22, 18, 3, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.ring(cx, LINE_Y, 19, 21, P, 48), { tone: "faint" }));
  return out.join("");
}

// seat and cheeks on the turntable: they turn with the block
function cradle(cx, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const W = ([lx, ly]) => [cx + lx * c - ly * s, M.LINE_Y + lx * s + ly * c];
  const solid = (plan, z, h, style, bevel = 0.4) => k.solidSvg(k.extrude(k.ringOf(plan, 2).map(W), z, h, P, { convex: true, bevel }), style);
  const out = { seat: solid({ x: -21, y: -19, w: 42, d: 38, r: 0.6 }, 21, 1, { tone: "mid", crease: "none" }, 0), cheeks: [] };
  for (const side of [-1, 1]) {
    const y = side > 0 ? 17.5 : -20.5;
    const parts = [solid({ x: -12, y, w: 24, d: 3, r: 0.5 }, M.SEAT_Z, 10, { tone: "mid" })];
    const face = side * 20.5;
    parts.push(k.dotsSvg([k.iso([...W([-8, face]), M.SEAT_Z + 5], P), k.iso([...W([8, face]), M.SEAT_Z + 5], P)], { size: 0.45 }));
    out.cheeks.push({ depth: k.depthOf([...W([0, face]), 0], P), svg: parts.join("") });
  }
  out.cheeks.sort((a, b) => a.depth - b.depth);
  return out;
}

// ---- kicker at the mouth: stand, cylinder body (rod is live) -----------------------------
function kicker() {
  const { x, y0, y1, z } = KICK;
  const out = [];
  out.push(S(slab({ x: x - 8, y: y0 - 2, w: 16, d: 16, r: 0.6 }, 0, 2, 2), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 8, y: y0 - 2, w: 16, d: 16 }, 2.5).map(([px, py]) => at([px, py, 2])), { size: 0.4 }));
  out.push(S(slab({ x: x - 3, y: y0 + 3, w: 6, d: 6, r: 0.4 }, 2, z - 7, 2, 0.3), { tone: "mid" }));
  const cap = (y) => S(slab({ x: x - 6, y, w: 12, d: 4, r: 0.6 }, z - 6, 12, 2, 0.4), { tone: "mid" });
  out.push(cap(y0));
  out.push(S(slab({ x: x - 5, y: y0 + 4, w: 10, d: y1 - y0 - 8, r: 1 }, z - 5, 10, 3, 0.4), { tone: "mid", crease: "lo" }));
  out.push(cap(y1 - 4));
  out.push(D([y0, y1].flatMap((y) => [at([x + 5, y, z + 5]), at([x + 5, y, z - 5])]), { size: 0.45 }));
  return out.join("");
}

// ---- roller conveyor at right angles to the line, on to HSB05 ------------------------------
function conveyorBack() {
  const { x0, x1, y0, y1, z } = CONV;
  const out = [];
  for (let y = y0 + 20; y < y1; y += 96) out.push(S(slab({ x: x0 - 4, y, w: 4, d: 4, r: 0.4 }, 0, z - 8, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x0 - 4, y: y0, w: 4, d: y1 - y0 + 4, r: 0.5 }, z - 9, 10, 2, 0.4), { tone: "mid" }));
  // end stop where the HSB05 hoist picks the block up: beyond the block from this side, so drawn before it
  out.push(S(slab({ x: x0 - 4, y: y1, w: x1 - x0 + 8, d: 5, r: 0.6 }, z - 9, 26, 2, 0.4), { tone: "mid" }));
  for (const x of [x0 + 10, x1 - 14]) out.push(S(slab({ x, y: y1 - 4, w: 6, d: 4, r: 1.5 }, z + 4, 6, 3), { tone: "lo", crease: "none" }));
  for (let y = y1 - 8; y > y0; y -= 8) out.push(S(slab({ x: x0, y: y + 3, w: x1 - x0, d: 4.6, r: 2.3 }, z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

function conveyorFront() {
  const { x1, y0, y1, z } = CONV;
  const out = [];
  for (let y = y0 + 20; y < y1; y += 96) {
    out.push(S(slab({ x: x1, y: y - 2, w: 8, d: 8, r: 0.5 }, 0, 1.4, 2), { tone: "mid" }));
    out.push(S(slab({ x: x1 + 2, y, w: 4, d: 4, r: 0.4 }, 1.4, z - 9.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: x1, y: y0, w: 4, d: y1 - y0 + 4, r: 0.5 }, z - 9, 10, 2, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 37 }, (_, i) => at([x1 + 4, y0 + 5.3 + i * 8, z - 3])), { size: 0.35, tone: "lo" }));
  return out.join("");
}

// ---- railings ---------------------------------------------------------------------
function railingBack() {
  const y = 92;
  const xs = [-24, 6, 36, RAILING_X];
  const out = [];
  for (const x of xs) out.push(S(slab({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.3 }, 0, RAILING_H - 3, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: xs[0] - 2, y: y - 2, w: RAILING_X - xs[0] + 4, d: 4, r: 0.6 }, RAILING_H - 3, 3, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function railingSide() {
  const x = RAILING_X;
  const ys = Array.from({ length: 16 }, (_, i) => 92 + i * 26);
  const out = [];
  for (const y of ys) out.push(S(slab({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.3 }, 0, RAILING_H - 3, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: x - 2, y: ys[0] - 2, w: 4, d: ys.at(-1) - ys[0] + 4, r: 0.6 }, RAILING_H - 3, 3, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

// ---- gantry inside the booth: two columns, a beam, the slide (live) ----------------------
function gantry() {
  const { x0, x1, y, z } = GANTRY;
  const out = [];
  for (const x of [x0, x1 - 10]) {
    out.push(S(slab({ x: x - 3, y: y - 5, w: 16, d: 20, r: 0.6 }, 1, 2, 2), { tone: "mid" }));
    out.push(S(slab({ x, y: y - 2, w: 10, d: 14, r: 0.6 }, 3, z - 3, 2, 0.4), { tone: "mid" }));
  }
  out.push(S(slab({ x: x0, y: y - 1, w: x1 - x0, d: 12, r: 0.6 }, z, 8, 2, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: x0, y: y - 1, w: x1 - x0, d: 12 }, z + 4, P, 2), { tone: "faint" }) }));
  return out.join("");
}

// the slide at x = 0: wraps the beam, a drop plate down to the chisel's feed rod
function slide() {
  const { y, z } = GANTRY;
  const out = [];
  out.push(S(slab({ x: -7, y: y - 3, w: 14, d: 16, r: 0.8 }, z - 4, 16, 2, 0.5), { tone: "mid" }));
  out.push(D([[-4, z + 8], [4, z + 8]].map(([dx, pz]) => at([dx, y - 3, pz])), { size: 0.45 }));
  out.push(S(slab({ x: -4, y: y - 2, w: 8, d: 6, r: 0.5 }, 44, z - 48, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// the chisel: tip at the origin pointing along +y at the block, body behind it towards the camera
function chisel() {
  const out = [];
  out.push(S(slab({ x: -1.2, y: -30, w: 2.4, d: 3, r: 1.2 }, -1.2, 2.4, 4), { tone: "lo", crease: "none" }));
  const bands = [-12, -17, -22].map((y) => k.lineOnTop([-2.8, y], [2.8, y], 2.8, P)).join("");
  out.push(S(slab({ x: -2.8, y: -27, w: 5.6, d: 19, r: 2.8 }, -2.8, 5.6, 6), { tone: "mid", crease: "none", inner: L(bands, { tone: "faint" }) }));
  out.push(S(slab({ x: -2.2, y: -8, w: 4.4, d: 3, r: 2.2 }, -2.2, 4.4, 4), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: -0.8, y: -6, w: 1.6, d: 6, r: 0.8 }, -0.8, 1.6, 4), { tone: "hi", crease: "none" }));
  return out.join("");
}

// =============================================================================
// The cycle. The model (bariSolve, bariStep, bariGo) and the moving geometry (bariScene
// and its parts) are plain functions over `k`, `P` and `M`; the live page gets their
// source with the kit inlined, so the browser draws every frame with the build's code.
// =============================================================================

const M = {
  // physics, as in baritori-3d.html (SI units)
  BAR: 1e5,
  A_PUSH: Math.PI * 0.025 ** 2, // 50 mm rodless carriage cylinder
  A_HAM: Math.PI * 0.0095 ** 2, // 19 mm chisel piston
  STROKE: 0.05,
  ETA: 0.45,
  E_CHIP: 3e9, // J/m3 to chip grey iron
  A_FIN: 3e-3 * 1.5e-3, // fin section
  TIME_K: 12, // chipping shown 12x fast
  DUR: { load: 1.6, in: 2.6, close: 1.2, turn: 0.9, open: 1.2, out: 2.6, tip: 2.2, convey: 2.6 },
  NEXT: { load: "in", in: "close", close: "deburr", turn: "deburr", open: "out", out: "tip", tip: "convey", convey: "load" },
  ORDER: ["load", "in", "close", "deburr", "open", "out", "tip", "convey"],
  // world (cm)
  MOUTH_X,
  WORK_X,
  LINE_Y,
  SEAT_Z,
  BLOCK,
  FACE_LEN: [BLOCK.A, BLOCK.B, BLOCK.A, BLOCK.B], // the chisel works them in this order
  CONV,
  KICK,
  GANTRY,
  DOOR_LIFT: DOOR.lift,
  LIFT_TOP: BEAM_Z,
  DOOR_TOP: DOOR.z0 + DOOR.h + 7,
  LIFT,
  INSIDE_X: FRONT_X - 12, // the carriage is drawn as inside the booth below this
  PARK: [WORK_X - 50, LINE_Y - BLOCK.A / 2 - 6, SEAT_Z + BLOCK.PART],
  FEED_Y: GANTRY.y + 4, // drop plate face the feed rod leaves from
  LAMP: [BOX.x + BOX.w, BOX.y + 5, 96], // first push button: lit while loading
};
M.FACE_END = M.FACE_LEN.map((_, i) => M.FACE_LEN.slice(0, i + 1).reduce((s, l) => s + l, 0));
M.PERIM = M.FACE_END[3];

const approach = (a, b, tau, dt) => b + (a - b) * Math.exp(-dt / tau);
const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// line pressure → carriage force, blow rate and energy, flash taken off per second
function bariSolve(p) {
  const f = p > 0.5 * M.BAR ? 30 * Math.sqrt(p / (6 * M.BAR)) : 0;
  const E = M.ETA * p * M.A_HAM * M.STROKE;
  return { F: p * M.A_PUSH, f, E, rate: ((f * E) / (M.E_CHIP * M.A_FIN)) * 100 }; // rate in cm/s
}

function bariState() {
  return { phase: "load", pt: 0, clock: 0, face: 0, removed: 0, p: 6 * M.BAR, target: 6, f: 0, E: 0, rate: 0, F: 0, chisel: [...M.PARK] };
}

// jump to a step of the cycle, the flash taken off up to `frac`
function bariGo(st, phase, frac = 0) {
  st.phase = phase;
  st.pt = 0;
  const done = ["open", "out", "tip", "convey"].includes(phase);
  st.removed = done ? M.PERIM : phase === "deburr" ? M.PERIM * frac : 0;
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
      st.phase = st.face >= 4 ? "open" : "turn"; // the door goes up during the fourth quarter turn
      st.pt = 0;
    }
  } else if (u >= 1) {
    if (st.phase === "convey") {
      st.removed = 0;
      st.face = 0;
    }
    st.phase = M.NEXT[st.phase];
    st.pt = 0;
  }
  // the chisel rides the parting line of the face towards the gantry (-y), or waits retracted
  const working = st.phase === "deburr";
  let target = M.PARK;
  if (working) {
    const f = Math.min(st.face, 3);
    const len = M.FACE_LEN[f];
    const along = Math.min(1, Math.max(0, (st.removed - (M.FACE_END[f] - len)) / len));
    const half = (f % 2 ? M.BLOCK.A : M.BLOCK.B) / 2;
    target = [M.WORK_X - len / 2 + len * along, M.LINE_Y - half - 1, M.SEAT_Z + M.BLOCK.PART];
  }
  for (let i = 0; i < 3; i++) st.chisel[i] = approach(st.chisel[i], target[i], working ? 0.06 : 0.25, dt);
}

// 3 x 3 rotations, rows
const bariRz = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const bariRtip = (a) => [[1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)]];
const bariMul = (R, v) => R.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

// where everything is at this moment of the cycle
function bariPose(st) {
  const u = M.DUR[st.phase] ? Math.min(1, st.pt / M.DUR[st.phase]) : 0;
  const e = u * u * (3 - 2 * u);
  const ph = st.phase;
  const cx = ph === "in" ? M.MOUTH_X + (M.WORK_X - M.MOUTH_X) * e : ph === "out" ? M.WORK_X + (M.MOUTH_X - M.WORK_X) * e : ["close", "deburr", "turn", "open"].includes(ph) ? M.WORK_X : M.MOUTH_X;
  const down = ph === "close" ? e : ph === "deburr" || ph === "turn" ? 1 : ph === "open" ? 1 - e : 0;
  const quarter = ph === "turn" || ph === "open" ? st.face - 1 + e : ph === "deburr" ? st.face : 0;
  const angle = (quarter * Math.PI) / 2;
  const pose = { cx, down, angle, carried: ph !== "convey", alpha: ph === "load" ? e : 1, kick: M.KICK.rest };
  const B = M.BLOCK.B;
  if (ph === "tip" || ph === "convey") {
    // one smooth turn over the pivot edge (smootherstep: no jerk at either end); the kicker rod rides the
    // block's face until the block is past balance (35°), then draws back, all from the angle so nothing jumps
    const PUSH = (35 * Math.PI) / 180;
    const contact = (phi) => M.LINE_Y + B / 2 - B * Math.cos(phi) + ((M.KICK.z - M.SEAT_Z - B * Math.sin(phi)) / Math.cos(phi)) * Math.sin(phi);
    const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    let phi = Math.PI / 2;
    if (ph === "tip") {
      phi = (Math.PI / 2) * ease(Math.min(1, Math.max(0, (u - 0.12) / 0.78)));
      const reach = M.KICK.rest + (contact(Math.min(phi, PUSH)) - M.KICK.rest) * smooth01(0, 0.12, u);
      pose.kick = reach + (M.KICK.rest - reach) * smooth01(PUSH * 0.8, PUSH + 0.5, phi);
    }
    const R = bariRtip(phi);
    const pivot = [M.MOUTH_X, M.LINE_Y + B / 2, M.SEAT_Z];
    const off = bariMul(R, [0, -B / 2, 0]);
    const run = ph === "convey" ? smooth01(0, 0.8, u) * (M.CONV.y1 - (M.LINE_Y + B / 2 + M.BLOCK.H)) : 0;
    pose.block = { o: [pivot[0] + off[0], pivot[1] + off[1] + run, pivot[2] + off[2]], R, alpha: ph === "convey" ? 1 - smooth01(0.85, 1, u) : 1 };
  } else {
    pose.block = { o: [cx, M.LINE_Y, M.SEAT_Z], R: bariRz(angle), alpha: pose.alpha };
  }
  return pose;
}

// convex hull of screen points (monotone chain)
function bariHull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// the BC block in any pose: a box shaded like the kit's solids, the parting line on the faces
// we see, the deck with its four bores, and the flash still left on the parting line
function bariBlock(b, removed) {
  const { A, B, H } = M.BLOCK;
  const W = (l) => {
    const r = bariMul(b.R, l);
    return [b.o[0] + r[0], b.o[1] + r[1], b.o[2] + r[2]];
  };
  const { sinA, cosA, sinE, cosE } = k.cameraOf(P);
  const T = [cosA * cosE, sinA * cosE, sinE];
  const seen = (n) => {
    const w = bariMul(b.R, n);
    return { w, on: w[0] * T[0] + w[1] * T[1] + w[2] * T[2] > 1e-6 };
  };
  const corner = (i) => [((i & 1) * 2 - 1) * (A / 2), (((i >> 1) & 1) * 2 - 1) * (B / 2), ((i >> 2) & 1) * H];
  const pts = Array.from({ length: 8 }, (_, i) => k.iso(W(corner(i)), P));
  // faces: local normal and corner indices in order
  const faces = [
    { n: [1, 0, 0], v: [1, 3, 7, 5] },
    { n: [-1, 0, 0], v: [0, 4, 6, 2] },
    { n: [0, 1, 0], v: [2, 6, 7, 3] },
    { n: [0, -1, 0], v: [0, 1, 5, 4] },
    { n: [0, 0, 1], v: [4, 5, 7, 6] },
    { n: [0, 0, -1], v: [0, 2, 3, 1] },
  ].map((f) => ({ ...f, ...seen(f.n) }));
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
  const fill = k.pathOf(bariHull(pts), true);
  const on = (n) => faces.find((f) => f.n.join() === n.join()).on;
  // the flash still left on the parting line (no drawn line: it reads as a cut through the block)
  const zp = M.BLOCK.PART;
  const fins = [];
  let from = 0;
  M.FACE_LEN.forEach((len, f) => {
    // face f turns towards the chisel after f quarter turns
    const a = (-f * Math.PI) / 2;
    const r = ([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const [nx, ny] = r([0, -1]);
    if (on([Math.round(nx), Math.round(ny), 0])) {
      const half = (f % 2 ? A : B) / 2 + 0.6;
      const n = Math.round(len / 4);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        if (from + t * len > removed) fins.push(k.iso(W([...r([-len / 2 + t * len, -half]), zp]), P));
      }
    }
    from += len;
  });
  // the deck (local -y face): four bores along its length, head-bolt holes
  let deck = "";
  const holes = [];
  if (on([0, -1, 0])) {
    for (const zc of [7.5, 18.5, 29.5, 40.5]) {
      const ring = Array.from({ length: 28 }, (_, i) => {
        const t = (i / 28) * Math.PI * 2;
        return k.iso(W([4.4 * Math.cos(t), -B / 2, zc + 4.4 * Math.sin(t)]), P);
      });
      deck += k.pathOf(ring, true);
    }
    for (const zc of [2.5, 13, 24, 35, 45.5]) holes.push(k.iso(W([-15, -B / 2, zc]), P), k.iso(W([15, -B / 2, zc]), P));
  }
  // the crank end (local +z): two dowels
  if (on([0, 0, 1])) holes.push(k.iso(W([-12, 0, H]), P), k.iso(W([12, 0, H]), P));
  const inner = k.lineSvg(deck, { tone: "lit" });
  const out = [k.solidSvg({ fill, shades, top, outline: fill, crease }, { tone: "hi", crease: "lo", lit: true, inner })];
  out.push(k.dotsSvg(holes, { size: 0.45, tone: "lit" }));
  out.push(k.dotsSvg(fins, { size: 0.55, tone: "lit" }));
  const svg = out.join("");
  return b.alpha < 1 ? `<g opacity="${Math.max(0, b.alpha).toFixed(3)}">${svg}</g>` : svg;
}

// the turning cradle, with the block between its cheeks while it rides the carriage
function bariCarried(pose, removed) {
  const c = cradle(pose.cx, pose.angle);
  const out = [c.seat, c.cheeks[0].svg];
  if (pose.carried && pose.alpha > 0) out.push(bariBlock(pose.block, removed));
  out.push(c.cheeks[1].svg);
  return out.join("");
}

// every moving piece of the drawing for one state, as markup and transforms
function bariScene(st) {
  const pose = bariPose(st);
  const lift = (1 - pose.down) * M.DOOR_LIFT;
  const working = st.phase === "deburr";
  const [tx, ty, tz] = st.chisel;
  let chips = "";
  if (working && st.f > 1) {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (st.clock * 2.2 + i / 12) % 1;
      const vx = ((i % 5) - 2) * 6;
      const vy = -10 - (i % 3) * 5;
      const vz = 8 + (i % 4) * 4;
      const [sx, sy] = k.iso([tx + vx * a, ty + vy * a, tz + vz * a - 40 * a * a], P);
      pts.push([sx, sy, (1 - a) * Math.min(1, st.f / 20)]);
    }
    chips = k.dotsSvg(pts, { size: 0.6, tone: "mid" });
  }
  const feed = ty - 30 - M.FEED_Y;
  return {
    carriage: k.translateAlong(P, [pose.cx - M.WORK_X, 0, 0]),
    inside: pose.cx < M.INSIDE_X,
    carried: bariCarried(pose, st.removed),
    travel: pose.carried ? "" : bariBlock(pose.block, st.removed),
    door: k.translateAlong(P, [0, 0, lift]),
    liftRod: k.solidSvg(k.cylinder(M.LIFT.x, M.LIFT.y, 2, M.DOOR_TOP + lift - 2, M.LIFT_TOP - M.DOOR_TOP - lift + 2, P, 20), { tone: "hi", crease: "none" }),
    kickRod:
      k.solidSvg(k.slabOf({ x: M.KICK.x - 1.8, y: M.KICK.y1, w: 3.6, d: pose.kick - M.KICK.y1 - 2, r: 1.8 }, M.KICK.z - 1.8, 3.6, P, 4), { tone: "hi", crease: "none" }) +
      k.solidSvg(k.slabOf({ x: M.KICK.x - 5, y: pose.kick - 2, w: 10, d: 2, r: 0.5 }, M.KICK.z - 5, 10, P, 2), { tone: "mid" }),
    slide: k.translateAlong(P, [tx, 0, 0]),
    feed: feed > 0.5 ? k.solidSvg(k.slabOf({ x: tx - 1.6, y: M.FEED_Y, w: 3.2, d: feed, r: 1.6 }, tz - 1.6, 3.2, P, 4), { tone: "hi", crease: "none" }) : "",
    chisel: k.translateAlong(P, [tx, ty + (working ? Math.sin(st.clock * st.f * 2 * Math.PI) * 0.3 : 0), tz]),
    chips,
    lamp: st.phase === "load" ? 1 : 0,
  };
}

const SAY = { load: "loading a raw block", in: "carriage in", close: "door down", deburr: "chipping the flash", turn: "turning 90°", open: "door up", out: "carriage out", tip: "tipping onto the conveyor", convey: "on to HSB05" };
const STEPS = { load: "Load", in: "In", close: "Door down", deburr: "Chip ×4", open: "Door up", out: "Out", tip: "Tip", convey: "To HSB05" };

function bariReadout(st) {
  const pct = Math.round((st.removed / M.PERIM) * 100);
  const face = st.phase === "deburr" || st.phase === "turn" ? ` · face ${Math.min(4, st.face + 1)} of 4` : "";
  return `${SAY[st.phase]}${face} · ${pct}% flash off`;
}

function bariNumbers(st) {
  const bar = (st.p / M.BAR).toFixed(1);
  return `${bar} bar · ${Math.round(st.f)} blows/s · ${st.E.toFixed(1)} J/blow · ${(st.rate * 10).toFixed(1)} mm/s · carriage ${Math.round(st.F)} N`;
}

// ---- self-check: one cycle visits every step in order, takes all the flash off, ends square
// and lying along the conveyor
{
  const st = bariState();
  const seen = ["load"];
  let removedAll = false;
  for (let t = 0; t < 80 && !(seen.length > 1 && seen.at(-1) === "load"); t += 1 / 60) {
    bariStep(st, 1 / 60);
    if (seen.at(-1) !== st.phase && st.phase !== "turn") seen.push(st.phase);
    if (st.removed >= M.PERIM - 1e-6) removedAll = true;
  }
  const want = ["load", ...M.ORDER.slice(1), "load"];
  if (JSON.stringify(seen) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  if (!removedAll) throw new Error("flash never fully removed");
  const end = bariState();
  bariGo(end, "open");
  end.pt = M.DUR.open;
  if (Math.abs(bariPose(end).angle - 2 * Math.PI) > 1e-9) throw new Error("block not square after the door goes up");
  bariGo(end, "tip");
  end.pt = M.DUR.tip;
  const lying = bariPose(end).block;
  if (Math.abs(bariMul(lying.R, [0, 0, 1])[1] - 1) > 1e-9) throw new Error("block's length should run along the conveyor after the tip");
  if (Math.abs(lying.o[2] + bariMul(lying.R, [0, BLOCK.B / 2, 0])[2] - SEAT_Z) > 1e-6) throw new Error("lying block should rest on the rollers");
  bariGo(end, "deburr", 0.4);
  if (end.face !== 1) throw new Error(`40% of the flash should be on face 2, got ${end.face + 1}`);
  console.log(`cycle check passed (${seen.join(" → ")})`);
}

// ---- the drawing --------------------------------------------------------------------
function sceneBody(st) {
  const f = bariScene(st);
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  const cart = `<g data-part="carriage" transform="${f.carriage}">${carriage()}</g>${slot("carried", f.carried)}`;
  // the kit's projection draws the world mirror-wise; flip it back so the line keeps its real hand
  // (facing the portal, the conveyor runs off to the right, as in the Blender layout)
  return [
    `<g transform="translate(${WIDTH} 0) scale(-1 1)">`,
    floor(),
    boothBack(),
    roof(),
    rails(RAIL_X[0], FRONT_X),
    railEnds(),
    slot("cart-inside", f.inside ? cart : ""),
    gantry(),
    `<g data-part="slide" transform="${f.slide}">${slide()}</g>`,
    slot("feed", f.feed),
    `<g data-part="chisel" transform="${f.chisel}">${chisel()}</g>`,
    slot("chips", f.chips),
    nearFrame(),
    frontWall(),
    post(POST_Y[1]),
    slot("liftrod", f.liftRod),
    `<g data-part="door" transform="${f.door}">${door()}</g>`,
    post(POST_Y[0]),
    beam(),
    liftCylinder(),
    buttons(),
    `<g data-part="lamp" opacity="${f.lamp}">${D([at(M.LAMP)], { size: 1.3, tone: "lit" })}</g>`,
    conveyorBack(),
    slot("travel", f.travel),
    conveyorFront(),
    rails(FRONT_X, RAIL_X[1]),
    slot("cart-outside", f.inside ? "" : cart),
    kicker(),
    slot("kickrod", f.kickRod),
    railingBack(),
    railingSide(),
    "</g>",
  ];
}

const LABEL =
  "Station Baritori, deburring: a carriage takes the cast block in through the timber portal of a closed booth; with the lift door down, an air chisel on a gantry slide chips the flash off the parting line while a turntable turns the block a quarter turn between faces; then the carriage brings it out, a kicker tips it onto a roller conveyor at right angles to the line, and it rolls away to HSB05.";

// a moment of the cycle for the still image: chipping the first face, door down
const still = bariState();
bariGo(still, "deburr", 0.12);
still.chisel = [WORK_X - BLOCK.A / 2 + M.PERIM * 0.12, LINE_Y - BLOCK.B / 2 - 1, SEAT_Z + BLOCK.PART];
still.f = 30;

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: sceneBody(still), standalone: theme });
    writeFileSync(join(OUT, `baritori-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `baritori-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = bariState();
  bariGo(st, "load");
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: sceneBody(st) });
  const steps = M.ORDER.map((p) => `<button type="button" data-go="${p}">${STEPS[p]}</button>`).join("");
  const sol = bariSolve(6 * M.BAR);
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Line pressure <input type="range" min="4" max="7" step="0.1" value="6" aria-label="Line pressure, bar"><output>6.0 bar</output></label>
<div class="bari-num" data-numbers>${bariNumbers({ ...st, f: 0, E: sol.E, rate: sol.rate, F: sol.F })}</div>
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
  const fns = [approach, smooth01, bariSolve, bariState, bariGo, bariStep, bariRz, bariRtip, bariMul, bariPose, bariHull, bariBlock, cradle, bariCarried, bariScene, bariReadout, bariNumbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, segment, ring, ringOf, extrude, slabOf, cylinder, solidSvg, lineSvg, dotsSvg, towardViewer, depthOf, translateAlong, cameraOf, pathOf };
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
const parts = { carriage: q('[data-part="carriage"]'), door: q('[data-part="door"]'), slide: q('[data-part="slide"]'), chisel: q('[data-part="chisel"]'), lamp: q('[data-part="lamp"]') };
const carried = slots.carried;
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = bariState();
bariGo(st, still.matches ? "deburr" : "load", still.matches ? 0.4 : 0);
bariStep(st, 0); // fill the solver numbers before the first frame
const set = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = bariScene(st);
  set(parts.carriage, "transform", f.carriage);
  html(carried, f.carried);
  // the carriage is drawn behind the front wall while it is inside the booth
  const home = f.inside ? slots["cart-inside"] : slots["cart-outside"];
  if (parts.carriage.parentNode !== home) { home.appendChild(parts.carriage); home.appendChild(carried); }
  html(slots.travel, f.travel);
  set(parts.door, "transform", f.door);
  html(slots.liftrod, f.liftRod);
  html(slots.kickrod, f.kickRod);
  set(parts.slide, "transform", f.slide);
  html(slots.feed, f.feed);
  set(parts.chisel, "transform", f.chisel);
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
// review shots: __bari.at("deburr", 0.4, 0.5) pauses on that step, with that much flash off, that far in
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
