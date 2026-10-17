// Isometric figure of station HSB06 (second shot blast, rotary table) for the station
// detail card in /visualisasi. Shapes follow the Blender layout: a round blast cabinet
// whose front is two flat faces meeting at a point, each with its own door: the block
// goes in through the left door and comes out of the right one after the rotary table
// has carried it past the blast wheels. The control panel sits where the faces meet, a
// pillar jib's manipulator reaches into the left door with a raw block, and a cleaned
// block waits on the output stand outside the right door.
// The live page runs the cycle of hsb06-3d.html: grip at the loading stand, swing in through the left
// door, set the block on the rotary table, manipulator out, doors down, blast while the table carries it
// round, right door up, reach in, lift out, drop on the output stand, back to the loading stand.
//   node station-kit/figure/stations/hsb06.mjs [outDir]
//     →   <outDir>/hsb06-{light,dark}.svg and <outDir>/hsb06-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/hsb06.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, about 44 units to the metre; the front faces +y, and the
// viewer standing in front has -x on their left) --------------------------------
const PAD = { x: -176, y: -112, w: 340, d: 290, r: 8 };
const R = 84; // cabinet radius (3.8 m across)
const BODY = [6, 92];
const A0 = (6 * Math.PI) / 180; // a face runs from the point (A0) out to A1, both off +y
const A1 = (58 * Math.PI) / 180;
const DOOR = { half: 22, z0: 10, z1: 74, depth: 16 };
const BLOCK = { half: 12, d: 9.5, h: 17 }; // half length along the face, half width, height
const PILLAR = [0, 160]; // on the chamber axis, in front of the panel, as in the 3D page
const BOOM_Z = 150;
const STAND_Z = 34;

// a face: s = -1 left door (block in), s = +1 right door (block out)
function face(s) {
  const a = [s * Math.sin(A0) * R, Math.cos(A0) * R];
  const b = [s * Math.sin(A1) * R, Math.cos(A1) * R];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const t = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]; // along the face, away from the point
  const m = (A0 + A1) / 2;
  const n = [s * Math.sin(m), Math.cos(m)]; // outward normal
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // a point in face coordinates: u along the face, v out of it, z up
  const F = (u, v, z) => [c[0] + u * t[0] + v * n[0], c[1] + u * t[1] + v * n[1], z];
  return { s, a, b, len, t, n, c, F };
}
const LEFT = face(-1);
const RIGHT = face(1);

const POLE = LEFT.F(0, 40, 0); // manipulator pole, in front of the left door
const STAND_IN = LEFT.F(-4, 92, 0); // loading stand, further out from the left door
const STAND_OUT = RIGHT.F(0, 64, 0); // output stand outside the right door

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [0, 0, 120], [-160, -100, 132], [-112, -40, 132], [PILLAR[0], PILLAR[1], BOOM_Z + 22], [POLE[0], POLE[1], BOOM_Z + 22]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 95 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const poly = (points, cls) => `<path class="${cls}" d="${k.pathOf(points.map(at), true)}"/>`;
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));
const seg = (p, q) => k.segment(p, q, P);
// a box set square to a face: u and v ranges in face coordinates
const faceBox = (f, [u0, u1], [v0, v1], z, h, bevel = 0.4) => k.extrude([f.F(u0, v0, 0), f.F(u1, v0, 0), f.F(u1, v1, 0), f.F(u0, v1, 0)].map(([x, y]) => [x, y]), z, h, P, { bevel });
// a box along any direction in plan: from p to q, w wide
function beamBox(p, q, w, z, h) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const d = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
  const o = [-d[1] * (w / 2), d[0] * (w / 2)];
  return k.extrude([[p[0] + o[0], p[1] + o[1]], [q[0] + o[0], q[1] + o[1]], [q[0] - o[0], q[1] - o[1]], [p[0] - o[0], p[1] - o[1]]], z, h, P, { bevel: 0.4 });
}

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // walkway line in front of the doors, edge to edge
  out.push(L(k.lineOnTop([PAD.x + 5, 150], [PAD.x + PAD.w - 5, 150], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- dust collector behind, ducted to the cabinet ----------------------------
function collector() {
  const box = { x: -164, y: -104, w: 52, d: 56, r: 2 };
  const out = [`<path class="iso-halo" d="${k.haloOf(box, 0, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(box, 5), ([x, y]) => [x, y, 0])) out.push(S(k.cylinder(x, y, 3, 0, 14, P, 16), { tone: "mid" }));
  out.push(S(slab(k.insetPlan(box, 6), 14, 16, 3, 0.4), { tone: "mid" }));
  out.push(S(slab(box, 30, 82, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(box, 58, P, 3) + k.sideSeam(box, 86, P, 3), { tone: "faint" }) }));
  const fx = box.x + box.w;
  const fy = box.y + box.d;
  out.push(L(k.pathOf([at([fx, box.y + 10, 36]), at([fx, box.y + box.d - 10, 36]), at([fx, box.y + box.d - 10, 80]), at([fx, box.y + 10, 80])], true), { tone: "lo" }));
  out.push(L(k.pathOf([at([box.x + 10, fy, 36]), at([box.x + box.w - 10, fy, 36]), at([box.x + box.w - 10, fy, 80]), at([box.x + 10, fy, 80])], true), { tone: "lo" }));
  out.push(D([at([fx, box.y + box.d - 14, 58]), at([box.x + box.w - 14, fy, 58])], { size: 0.6, tone: "mid" }));
  out.push(S(k.cylinder(box.x + 26, box.y + 28, 14, 112, 8, P, 40, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(box.x + 26, box.y + 28, 7, 120, 10, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(box.x + 26, box.y + 28, 7, 121, 129, 22, P), { tone: "faint" }));
  out.push(S(slab({ x: box.x + box.w, y: -64, w: 60, d: 16, r: 1 }, 70, 16, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: box.x + box.w + 24, y: -66, w: 4, d: 20, r: 0.6 }, 68, 20, 2), { tone: "mid" }));
  return out.join("");
}

// ---- the cabinet: round at the back, two flat faces in front ------------------
// plan outline: the arc from the right face round the back to the left face, then the point
function outline(r) {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const a = A1 + (i / 60) * (2 * Math.PI - 2 * A1);
    pts.push([Math.sin(a) * r, Math.cos(a) * r]);
  }
  pts.push([-Math.sin(A0) * r, Math.cos(A0) * r], [Math.sin(A0) * r, Math.cos(A0) * r]);
  return pts;
}

function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -R, y: -R, w: 2 * R, d: 2 * R, r: R }, 0, 4, P)}"/>`];
  out.push(S(k.extrude(outline(R + 4), 0, BODY[0], P, { bevel: 0.6 }), { tone: "mid" }));
  const ring = outline(R);
  const seams = L(k.ringSeam(ring, 36, P) + k.ringSeam(ring, 64, P), { tone: "faint" });
  out.push(S(k.extrude(ring, BODY[0], BODY[1] - BODY[0], P), { tone: "hi", inner: seams }));
  out.push(S(k.extrude(outline(R + 3), BODY[1], 5, P, { bevel: 0.8 }), { tone: "mid" }));
  // the flat lid, its hub and three lifting eyes
  const top = BODY[1] + 5;
  out.push(S(k.cylinder(0, -4, 70, top, 6, P, 96, 1), { tone: "mid", crease: "lo" }));
  out.push(L(k.ring(0, -4, 62, top + 6, P, 96), { tone: "faint" }));
  const eyes = [0, 1, 2].map((i) => {
    const a = Math.PI / 6 + (i * 2 * Math.PI) / 3;
    return [Math.cos(a) * 50, Math.sin(a) * 50 - 4];
  });
  for (const [x, y] of byDepth(eyes, ([x, y]) => [x, y, top + 6])) {
    out.push(S(k.cylinder(x, y, 3.2, top + 6, 2, P, 16), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 1.4, top + 8, 4, P, 12), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.cylinder(0, -4, 15, top + 6, 6, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(0, -4, 15, top + 7, top + 11, 40, P), { tone: "faint" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at([Math.cos((i * Math.PI) / 4) * 11, Math.sin((i * Math.PI) / 4) * 11 - 4, top + 12])), { size: 0.45 }));
  // blast wheel housing and motor on the shell's right side, towards the back
  const wy = -34;
  const wx = Math.sqrt(R * R - wy * wy);
  const house = { x: wx - 4, y: wy - 14, w: 14, d: 28, r: 2 };
  out.push(S(slab(house, 44, 30, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(house, 59, P, 3), { tone: "faint" }) }));
  out.push(S(k.cylinder(wx + 4, wy, 8, 74, 16, P, 32, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(wx + 4, wy, 8, 76, 88, 20, P), { tone: "faint" }));
  // stack light on the rim, at the back
  const [lx, ly] = [-50, -62];
  out.push(S(k.cylinder(lx, ly, 3, top, 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(lx, ly, 1, top + 3, 8, P, 12), { tone: "mid", crease: "none" }));
  for (const [i, tone] of [[0, "mid"], [1, "mid"], [2, "hi"]]) out.push(S(k.cylinder(lx, ly, 2.6, top + 11 + i * 5, 5, P, 20), { tone }));
  out.push(S(k.cylinder(lx, ly, 2.8, top + 26, 1.2, P, 20), { tone: "mid" }));
  return out.join("");
}

// ---- a door in a face: dark chamber with the rotary table, frame, open leaves --
function door(f) {
  const { half, z0, z1, depth } = DOOR;
  const F = f.F;
  const out = [];
  out.push(poly([F(-half, -depth, z0), F(half, -depth, z0), F(half, -depth, z1), F(-half, -depth, z1)], "hsb-cav"));
  // the reveal that faces the viewer: the one whose normal (+t at u = -half, -t at u = +half) looks our way
  const [vx, vy] = k.towardViewer(P);
  const u = f.t[0] * vx + f.t[1] * vy > 0 ? -half : half;
  out.push(poly([F(u, -depth, z0), F(u, 0, z0), F(u, 0, z1), F(u, -depth, z1)], "hsb-cav hsb-cav-side"));
  out.push(poly([F(-half, -depth, z0), F(half, -depth, z0), F(half, 0, z0), F(-half, 0, z0)], "hsb-cav hsb-cav-floor"));
  // the rim of the rotary table runs across the chamber floor, edge to edge
  out.push(L(seg(F(-half, -depth + 5, z0), F(half, -depth + 5, z0)) + seg(F(-half, -depth + 8, z0), F(half, -depth + 8, z0)), { tone: "faint" }));
  // rubber curtain strips hanging from the lintel
  out.push(L(Array.from({ length: 9 }, (_, i) => seg(F(-half + 4.4 * (i + 1), -depth + 4, z1), F(-half + 4.4 * (i + 1), -depth + 4, z1 - 16))).join(""), { tone: "lo" }));
  out.push(L(k.pathOf([at(F(-half, 0, z0)), at(F(half, 0, z0)), at(F(half, 0, z1)), at(F(-half, 0, z1))], true), { tone: "mid" }));
  return out.join("");
}

function frame(f) {
  const { half, z1 } = DOOR;
  const F = f.F;
  const out = [];
  // two posts and a header in front of the face
  for (const u of byDepth([-half - 7, half + 7], (u) => F(u, 4, 0))) {
    out.push(S(faceBox(f, [u - 4, u + 4], [0, 8], 0, z1 + 10), { tone: "mid" }));
    out.push(D([14, 30, 46, 62].map((z) => at(F(u, 8, z))), { size: 0.45 }));
  }
  out.push(S(faceBox(f, [-half - 11, half + 11], [0, 8], z1, 10), { tone: "mid" }));
  // the lift door, raised into its housing above the opening
  out.push(S(faceBox(f, [-half - 4, half + 4], [8, 12], z1 + 10, 12), { tone: "mid", inner: L(seg(F(-half - 4, 12, z1 + 16), F(half + 4, 12, z1 + 16)), { tone: "faint" }) }));
  out.push(D([-half + 2, 0, half - 2].map((u) => at(F(u, 12, z1 + 19))), { size: 0.45 }));
  return out.join("");
}

// ---- control panel where the two faces meet: start, stop, selector, lamps ----
function panel() {
  const y = Math.cos(A0) * R;
  const plan = { x: -8, y: y - 4, w: 16, d: 12, r: 0.8 };
  const out = [S(slab({ x: -10, y: y - 6, w: 20, d: 16, r: 1 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(slab(plan, 2, 70, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 30, P, 2), { tone: "faint" }) }));
  const fy = plan.y + plan.d;
  const grid = [[-4, 64], [0, 64], [4, 64], [-4, 57], [0, 57], [4, 57]];
  out.push(L(grid.map(([x, z]) => k.sideRing([x, fy, z], 1.6, "y", P)).join(""), { tone: "lo" }));
  out.push(D(grid.map(([x, z]) => at([x, fy, z])), { size: 0.7, tone: "mid" }));
  out.push(D([at([-3, fy, 46]), at([3, fy, 46])], { size: 1.1, tone: "hi" }));
  out.push(L(k.pathOf([at([-5, fy, 36]), at([5, fy, 36]), at([5, fy, 42]), at([-5, fy, 42])], true), { tone: "lo" }));
  return out.join("");
}

// ---- stands: a welded frame with a round plate on top -------------------------
function stand([cx, cy]) {
  const plan = { x: cx - 15, y: cy - 15, w: 30, d: 30, r: 1 };
  const out = [];
  for (const [px, py] of byDepth(k.corners(plan, 2), ([px, py]) => [px, py, 0])) out.push(S(slab({ x: px - 1.6, y: py - 1.6, w: 3.2, d: 3.2, r: 0.3 }, 0, STAND_Z - 3, 2), { tone: "mid", crease: "none" }));
  for (const z of [4, STAND_Z - 6]) out.push(L(k.planOutline({ x: plan.x + 2, y: plan.y + 2, w: 26, d: 26, r: 0 }, z, P), { tone: "lo" }));
  out.push(S(slab(plan, STAND_Z - 3, 3, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 13, STAND_Z, 2, P, 48, 0.4), { tone: "mid" }));
  out.push(L([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => k.planOutline({ x: cx + sx * 5 - 2.5, y: cy + sy * 5 - 2.5, w: 5, d: 5, r: 0 }, STAND_Z + 2, P)).join(""), { tone: "lo" }));
  return out.join("");
}

// ---- pillar jib with its manipulator ------------------------------------------
function pillar() {
  const [px, py] = PILLAR;
  const out = [S(slab({ x: px - 10, y: py - 10, w: 20, d: 20, r: 1 }, 0, 3, 2, 0.6), { tone: "mid" })];
  out.push(D(k.corners({ x: px - 10, y: py - 10, w: 20, d: 20 }, 2.5).map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(px, py, 5, 3, BOOM_Z - 3, P, 32, 0.4), { tone: "mid", crease: "lo" }));
  out.push(S(k.cylinder(px, py, 7.5, BOOM_Z - 4, 4, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(px, py, 7.5, BOOM_Z - 3.5, BOOM_Z - 0.5, 28, P), { tone: "faint" }));
  out.push(S(k.cylinder(px, py, 5.5, BOOM_Z + 8, 6, P, 32, 0.6), { tone: "mid" }));
  // the boom, trolley and everything hanging from them move with the manipulator: h6Rig draws them
  return out.join("");
}


// =============================================================================
// The cycle, as in hsb06-3d.html. The model (h6Step, h6Go) and the moving pieces (h6Scene and the
// builders it calls) are plain functions over `k`, `P` and `M`; the live page gets their source with
// the kit inlined. The gripper moves in polar coordinates round the chamber axis (angle off +y, radius,
// block base height), like the 3D page; the pole stands ARM further out on the same radius, and the
// boom slews from the pillar to it.
// =============================================================================

const polarOf = ([x, y]) => [Math.atan2(x, y), Math.hypot(x, y)];
const MID = (A0 + A1) / 2;
const FACE_D = R * Math.cos((A1 - A0) / 2);
const [IN_SA, IN_SR] = polarOf(STAND_IN);
const [OUT_SA, OUT_SR] = polarOf(STAND_OUT);
const SPOT = FACE_D - 6; // the block on the table, just inside the doorway
const TABLE = DOOR.z0; // table top: the chamber floor seen through the doorway
const ON_STAND = STAND_Z + 2;
const CARRY = 40; // block base while carried, as in the still
const UP = 48; // gripper parked, empty
const PARK_R = 106; // parked in front of the panel while blasting
const M = {
  // [phase, seconds, angle, radius, block base height] at the end of the phase, as the 3D page
  CYCLE: [
    ["pick", 1.4, IN_SA, IN_SR, ON_STAND],
    ["swing in", 2.2, -MID, SPOT, CARRY],
    ["place", 1.0, -MID, SPOT, TABLE],
    ["retract", 1.6, -MID, IN_SR, UP],
    ["close", 1.4, 0, PARK_R, UP],
    ["blast", 10, 0, PARK_R, UP],
    ["open", 1.4, OUT_SA, OUT_SR, UP],
    ["reach in", 1.6, MID, SPOT, TABLE],
    ["lift out", 2.2, OUT_SA, OUT_SR, CARRY],
    ["drop", 1.0, OUT_SA, OUT_SR, ON_STAND],
    ["return", 2.2, IN_SA, IN_SR, UP],
  ],
  MID,
  FACE_D,
  STAND_IN,
  STAND_OUT,
  IN_SA,
  OUT_SA,
  ON_STAND,
  TABLE,
  SPOT,
  ARM: 34, // pole from the gripper, along the radius
  ARM_UP: 30, // reach arm above the block base
  BOOM_Z,
  PILLAR,
  BLOCK,
  DOOR,
  INSIDE: FACE_D + 14, // closer in than this the head is drawn in the doorway slot
  LAMP: [-50, -62, BODY[1] + 5 + 23.5],
  // physics (SI), as the 3D page: two wheels, a share of the shot reaches the pockets (Avrami)
  WHEEL_D: 0.48,
  MDOT: 2.0,
  M_SHOT: (7600 * Math.PI * 0.84e-3 ** 3) / 6,
  F_HIT: 0.12,
  A_POCKET: 0.35,
  ETA: 0.6,
  WHEELS: 2,
  TIME_K: 8, // blast shown 8x fast
};
M.LEN = M.CYCLE.reduce((sum, c) => sum + c[1], 0);
M.TURN = -(2 * Math.PI - 2 * MID); // the table carries the block the long way round, past the wheels at the back

const approach = (a, b, tau, dt) => b + (a - b) * Math.exp(-dt / tau);
const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function h6Solve(n) {
  const v = (Math.PI * M.WHEEL_D * n) / 60;
  const dDent = 0.24e-3 * Math.pow(Math.max(v, 1) / 72, 0.4);
  const kk = (M.F_HIT * ((M.MDOT * M.WHEELS) / M.M_SHOT) * ((Math.PI * dDent * dDent) / 4)) / M.A_POCKET;
  return { v, k: kk, P: (M.MDOT * v * v) / (2 * M.ETA) };
}

function h6State() {
  return { t: 0, n: 0, sim: 0, rpm: 2900, v: 0, P: 0 };
}

function h6Phase(t) {
  let a = ((t % M.LEN) + M.LEN) % M.LEN;
  for (let i = 0; i < M.CYCLE.length; i++) {
    if (a < M.CYCLE[i][1]) return [i, a / M.CYCLE[i][1]];
    a -= M.CYCLE[i][1];
  }
  return [0, 0];
}

// jump to the start of a step
function h6Go(st, name) {
  let t = 0;
  for (const c of M.CYCLE) {
    if (c[0] === name) break;
    t += c[1];
  }
  st.t = t + 1e-6;
  const order = M.CYCLE.map((c) => c[0]);
  st.sim = order.indexOf(name) > order.indexOf("blast") ? h6Solve(st.rpm).k * 10 * M.TIME_K : 0;
}

function h6Step(st, dt) {
  st.t += dt;
  const phase = M.CYCLE[h6Phase(st.t)[0]][0];
  const want = phase === "blast" ? st.rpm : 0;
  st.n = approach(st.n, want, want > st.n ? 0.9 : 2.2, dt);
  const sol = h6Solve(st.n);
  st.v = sol.v;
  st.P = sol.P;
  if (phase === "pick") st.sim = 0;
  if (phase === "blast") st.sim += sol.k * dt * M.TIME_K;
}

// plan point at angle a (off +y) and radius r
function h6At(a, r) {
  return [Math.sin(a) * r, Math.cos(a) * r];
}

// plan frame at c heading hd: v along the heading (out of the chamber for a radial heading), u across it
function h6Frame(c, hd) {
  const n = [Math.sin(hd), Math.cos(hd)];
  const t = [Math.cos(hd), -Math.sin(hd)];
  return (u, v) => [c[0] + n[0] * v + t[0] * u, c[1] + n[1] * v + t[1] * u];
}

function h6Box(c, hd, [u0, u1], [v0, v1], z, h, bevel = 0.4) {
  const F = h6Frame(c, hd);
  return k.extrude([F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], z, h, P, { bevel });
}

// the BC block centred at c, heading hd, base z
function h6Block(c, hd, z, lit) {
  const { half, d, h } = M.BLOCK;
  const F = h6Frame(c, hd);
  const plan = [F(-half, -d), F(half, -d), F(half, d), F(-half, d)];
  const seam = k.lineSvg(k.ringSeam(plan, z + 5, P), { tone: lit ? "lit" : "faint" });
  const out = [k.solidSvg(k.extrude(plan, z, h, P, { bevel: 0.6 }), { tone: "hi", crease: "lo", lit, inner: seam })];
  out.push(k.lineSvg([-8, -2.7, 2.7, 8].map((u) => k.ring(...F(u, 0), 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  const bolts = [];
  for (const u of [-10.4, -5.3, 0, 5.3, 10.4]) bolts.push(k.iso([...F(u, -d + 2), z + h], P), k.iso([...F(u, d - 2), z + h], P));
  out.push(k.dotsSvg(bolts, { size: 0.4, tone: "mid" }));
  return out.join("");
}

// the gripper at c, heading hd: its jaws (and the block, when it holds one); the near jaw goes after the block
function h6Head(c, hd, z, held) {
  const { half } = M.BLOCK;
  const armZ = z + M.ARM_UP;
  const [vx, vy] = k.towardViewer(P);
  const nearPlus = Math.cos(hd) * vx - Math.sin(hd) * vy > 0;
  const jaw = (plus) => {
    const u = plus ? half + 1 : -half - 4;
    return k.solidSvg(h6Box(c, hd, [u, u + 3], [-6, 6], z + 4, armZ - 6 - z - 4), { tone: "mid" });
  };
  const out = [jaw(!nearPlus)];
  if (held) out.push(h6Block(c, hd, z, true));
  out.push(jaw(nearPlus));
  return out.join("");
}

// boom from the pillar to the pole, trolley, the hanging pole with its collar and steering ring, reach arm
function h6Rig(a, r, z, hd) {
  const armZ = z + M.ARM_UP;
  const pr = r + M.ARM;
  const pole = h6At(a, pr);
  const [px, py] = M.PILLAR;
  const out = [];
  const tip = [pole[0] + (pole[0] - px) * 0.12, pole[1] + (pole[1] - py) * 0.12];
  const len = Math.hypot(tip[0] - px, tip[1] - py);
  const d = [(tip[0] - px) / len, (tip[1] - py) / len];
  const o = [-d[1] * 3, d[0] * 3];
  out.push(k.solidSvg(k.extrude([[px + o[0], py + o[1]], [tip[0] + o[0], tip[1] + o[1]], [tip[0] - o[0], tip[1] - o[1]], [px - o[0], py - o[1]]], M.BOOM_Z, 8, P, { bevel: 0.4 }), { tone: "mid" }));
  const mid = [(px + pole[0]) / 2, (py + pole[1]) / 2];
  out.push(k.lineSvg(k.segment([px, py, M.BOOM_Z + 14], [mid[0], mid[1], M.BOOM_Z + 8], P), { tone: "mid" }));
  out.push(k.dotsSvg([k.iso([mid[0], mid[1], M.BOOM_Z + 8], P)], { size: 0.6 }));
  const box = (w, r, z0, h, steps, bevel, style) => k.solidSvg(k.slabOf({ x: pole[0] - w / 2, y: pole[1] - w / 2, w, d: w, r }, z0, h, P, steps, bevel), style);
  out.push(box(12, 1, M.BOOM_Z - 6, 6, 3, 0.4, { tone: "mid" }));
  out.push(k.dotsSvg([k.iso([pole[0] - 4, pole[1] + 6, M.BOOM_Z - 3], P), k.iso([pole[0] + 4, pole[1] + 6, M.BOOM_Z - 3], P)], { size: 0.55 }));
  out.push(box(4.8, 0.6, armZ + 26, M.BOOM_Z - 6 - armZ - 26, 2, 0.3, { tone: "mid" }));
  out.push(box(3.2, 0.4, armZ, 26, 2, 0.3, { tone: "hi", crease: "none" }));
  out.push(box(6.8, 0.8, armZ + 22, 4, 2, 0.4, { tone: "mid" }));
  out.push(k.lineSvg(k.ring(pole[0], pole[1], 11, armZ + 14, P, 48) + k.ring(pole[0], pole[1], 9.6, armZ + 14, P, 48), { tone: "mid" }));
  out.push(k.lineSvg([0, 1, 2].map((i) => {
    const b = (i * 2 * Math.PI) / 3 + 0.4;
    return k.segment([pole[0] + Math.cos(b) * 1.6, pole[1] + Math.sin(b) * 1.6, armZ + 14], [pole[0] + Math.cos(b) * 9.6, pole[1] + Math.sin(b) * 9.6, armZ + 14], P);
  }).join(""), { tone: "lo" }));
  out.push(k.solidSvg(h6Box(h6At(a, r), a, [-2.4, 2.4], [-8, M.ARM], armZ, 5), { tone: "mid" }));
  // the head plate under the arm's end, over the block, turned with the head
  out.push(k.solidSvg(h6Box(h6At(a, r), hd, [-M.BLOCK.half - 4, M.BLOCK.half + 4], [-10, -2], armZ - 6, 6), { tone: "mid" }));
  return out.join("");
}

// a lift door coming down over its doorway as a shutter, `down` 0..1 (face sgn: -1 left, +1 right)
function h6Shutter(sgn, down) {
  if (down <= 0.001) return "";
  const a = sgn * M.MID;
  const { half, z0, z1 } = M.DOOR;
  const h = (z1 - z0) * down;
  const c = h6At(a, M.FACE_D);
  const body = k.solidSvg(h6Box(c, a, [-half - 2, half + 2], [0.5, 3], z1 - h, h), { tone: "mid" });
  const G = h6Frame(c, a);
  const F = (u, v, z) => k.iso([...G(u, v), z], P);
  const slats = [];
  for (let z = z1 - 6; z > z1 - h + 1; z -= 6) slats.push(k.pathOf([F(-half - 2, 3, z), F(half + 2, 3, z)]));
  return body + k.lineSvg(slats.join(""), { tone: "faint" });
}

// where the gripper is at this moment of the cycle: angle, radius, block base, heading, holding or not
function h6Pose(st) {
  const [i, u] = h6Phase(st.t);
  const cur = M.CYCLE[i];
  const prev = M.CYCLE[(i + M.CYCLE.length - 1) % M.CYCLE.length];
  const phase = cur[0];
  // lift first, then move, then lower: height leads when rising and trails when coming down
  const a = prev[2] + (cur[2] - prev[2]) * smooth01(0.15, 0.85, u);
  const r = prev[3] + (cur[3] - prev[3]) * smooth01(0.1, 0.9, u);
  const z = prev[4] + (cur[4] - prev[4]) * (cur[4] > prev[4] ? smooth01(0, 0.35, u) : smooth01(0.6, 1, u));
  // the head swivels on the way out so the block lands square on the output stand, and back on the way home
  const swivel = phase === "lift out" ? smooth01(0.2, 0.9, u) : phase === "drop" ? 1 : phase === "return" ? 1 - smooth01(0.1, 0.6, u) : 0;
  const held = ["swing in", "lift out"].includes(phase) || (phase === "pick" && u > 0.45) || (phase === "reach in" && u > 0.9) || (phase === "place" && u < 0.85) || (phase === "drop" && u < 0.85);
  return { phase, u, a, r, z, hd: a - a * swivel, held };
}

// everything that moves, for a pose; the still passes its own pose and keeps both doors up
function h6Scene(st, pose = h6Pose(st), still = false) {
  const { phase, u, a, r, z, hd, held } = pose;
  const e = u * u * (3 - 2 * u);
  const c = h6At(a, r);
  // the table carries the block the long way round while blasting; it shows only while in a doorway
  const onTable = ["place", "retract", "close", "blast", "open", "reach in"].includes(phase) && !held;
  const turn = phase === "blast" ? M.TURN * smooth01(0.05, 0.95, u) : phase === "open" || phase === "reach in" ? M.TURN : 0;
  let door = "";
  if (onTable) {
    const ta = -M.MID + turn;
    const near = (b) => Math.abs(Math.atan2(Math.sin(ta - b), Math.cos(ta - b))) < 0.12;
    if (near(-M.MID) || near(M.MID)) door = h6Block(h6At(ta, M.SPOT), ta, M.TABLE, true);
  }
  // a raw block waits on the loading stand from the return until it is picked; the cleaned one is set
  // on the output stand and taken away (to Grinding) while the manipulator goes back
  const inAlpha = phase === "return" ? smooth01(0.5, 1, u) : phase === "pick" && !held ? 1 : 0;
  const outAlpha = phase === "drop" ? (held ? 0 : 1) : phase === "return" ? 1 - smooth01(0.4, 0.9, u) : 0;
  const fade = (alpha, svg) => (alpha <= 0.001 ? "" : alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(3)}">${svg}</g>`);
  const leftUp = phase === "close" ? 1 - e : phase === "return" ? e : ["pick", "swing in", "place", "retract"].includes(phase) ? 1 : 0;
  const rightUp = phase === "open" ? e : phase === "return" ? 1 - e : ["reach in", "lift out", "drop"].includes(phase) ? 1 : 0;
  return {
    phase,
    head: h6Head(c, hd, z, held),
    headInside: r < M.INSIDE,
    rig: h6Rig(a, r, z, hd),
    door,
    stand: [fade(inAlpha, h6Block(M.STAND_IN, M.IN_SA, M.ON_STAND, false)), fade(outAlpha, h6Block(M.STAND_OUT, 0, M.ON_STAND, false))],
    shutters: still ? ["", ""] : [h6Shutter(-1, 1 - leftUp), h6Shutter(1, 1 - rightUp)],
    lamp: phase === "blast" ? 1 : 0,
  };
}

const SAY = { pick: "gripping at the loading stand", "swing in": "in through the left door", place: "setting on the table", retract: "manipulator out", close: "doors down", blast: "blasting, table turning", open: "right door up", "reach in": "reaching in at the right door", "lift out": "out through the right door", drop: "onto the output stand", return: "back to the loading stand" };
const STEPS = { pick: "Pick", "swing in": "In", place: "Place", retract: "Retract", close: "Close", blast: "Blast", open: "Open", "reach in": "Reach", "lift out": "Lift out", drop: "Drop", return: "Return" };

function h6Readout(st) {
  const phase = M.CYCLE[h6Phase(st.t)[0]][0];
  return `${SAY[phase]} · pocket coverage ${((1 - Math.exp(-st.sim)) * 100).toFixed(1)}%`;
}

function h6Numbers(st) {
  const f = (x) => Math.round(x).toLocaleString("en-US");
  return `${f(st.n)} rpm · shot ${f(st.v)} m/s · ${(st.P / 1000).toFixed(1)} kW per wheel · 2 wheels`;
}

// ---- self-check: a cycle visits every step in order and the blast reaches the pockets
{
  const st = h6State();
  const seen = [];
  for (let t = 0; t < M.LEN; t += 1 / 60) {
    h6Step(st, 1 / 60);
    const ph = M.CYCLE[h6Phase(st.t)[0]][0];
    if (seen.at(-1) !== ph) seen.push(ph);
  }
  const want = M.CYCLE.map((c) => c[0]);
  if (JSON.stringify(seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  const full = h6State();
  h6Go(full, "blast");
  for (let t = 0; t < 10; t += 1 / 60) h6Step(full, 1 / 60);
  const C = 1 - Math.exp(-full.sim);
  if (!(C > 0.5 && C < 1)) throw new Error(`pocket coverage after the blast ${(C * 100).toFixed(1)}%`);
  console.log(`cycle check passed (${want.join(" → ")}, pocket coverage ${(C * 100).toFixed(1)}%)`);
}

// ---- the drawing, with slots for the moving pieces --------------------------------
function sceneBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    collector(),
    cabinet(),
    `<g data-part="lamp" opacity="${f.lamp}">${D([at(M.LAMP)], { size: 2.2, tone: "lit" })}</g>`,
    door(LEFT),
    door(RIGHT),
    slot("block-door", f.door),
    slot("head-door", f.headInside ? f.head : ""),
    slot("shutter-0", f.shutters[0]),
    slot("shutter-1", f.shutters[1]),
    frame(LEFT),
    frame(RIGHT),
    panel(),
    stand(STAND_IN),
    slot("block-in", f.stand[0]),
    pillar(),
    slot("head-out", f.headInside ? "" : f.head),
    slot("rig", f.rig),
    stand(STAND_OUT),
    slot("block-out", f.stand[1]),
  ];
}

// the still image is the approved drawing: the manipulator carrying the raw block half way in through the
// left door (a moment of the swing in), both doors up, the output stand empty
const STILL = { phase: "swing in", u: 0.8, a: -MID, r: FACE_D + 6, z: CARRY, hd: -MID, held: true };
const body = sceneBody(h6Scene(h6State(), STILL, true));

const STYLE = `<style>
.iso[data-theme="light"] .hsb-cav{fill:#cfcfcb}.iso[data-theme="light"] .hsb-cav-side{fill:#dadad6}.iso[data-theme="light"] .hsb-cav-floor{fill:#c4c4c0}
.iso[data-theme="dark"] .hsb-cav{fill:#060606}.iso[data-theme="dark"] .hsb-cav-side{fill:#0b0b0b}.iso[data-theme="dark"] .hsb-cav-floor{fill:#030303}
.hsb-cav{stroke:none}
</style>`;

const LABEL =
  "Station HSB06, rotary table shot blast: a round blast cabinet whose front is two flat faces, each with a door, and a control panel where they meet. A pillar jib manipulator reaches in through the left door with a BC block; the rotary table carries it past the blast wheels to the right door, where the manipulator lifts it out onto the output stand.";

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `hsb06-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `hsb06-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = h6State();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...sceneBody(h6Scene(st))] });
  const steps = M.CYCLE.map(([ph]) => `<button type="button" data-go="${ph}">${STEPS[ph]}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Wheel speed <input type="range" min="1800" max="3000" step="50" value="2900" aria-label="Blast wheel speed, rpm"><output>2,900 rpm</output></label>
<div class="bari-num" data-numbers>${h6Numbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "HSB06",
    title: "Rotary table shot blast cycle",
    hint: "Click to pause",
    readout: h6Readout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="HSB06 cycle, click or press space to pause">${svg}</div>`,
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
.bari-p output{min-width:68px;font-variant-numeric:tabular-nums}
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
  const fns = [approach, smooth01, h6Solve, h6State, h6Phase, h6Go, h6Step, h6At, h6Frame, h6Box, h6Block, h6Head, h6Rig, h6Shutter, h6Pose, h6Scene, h6Readout, h6Numbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, segment, pathOf, ring, ringSeam, extrude, slabOf, solidSvg, lineSvg, dotsSvg, towardViewer };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
const SAY = ${JSON.stringify(SAY)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slot = (name) => svg.querySelector('[data-slot="' + name + '"]');
const slots = ["block-door", "head-door", "shutter-0", "shutter-1", "block-in", "head-out", "rig", "block-out"].reduce((o, n) => ((o[n] = slot(n)), o), {});
const lamp = svg.querySelector('[data-part="lamp"]');
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = h6State();
if (still.matches) { h6Go(st, "swing in"); st.t += 1.5; }
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = h6Scene(st);
  html(slots["block-door"], f.door);
  html(slots["block-in"], f.stand[0]);
  html(slots["block-out"], f.stand[1]);
  html(slots["head-door"], f.headInside ? f.head : "");
  html(slots["head-out"], f.headInside ? "" : f.head);
  html(slots.rig, f.rig);
  html(slots["shutter-0"], f.shutters[0]);
  html(slots["shutter-1"], f.shutters[1]);
  if (lamp.getAttribute("opacity") !== String(f.lamp)) lamp.setAttribute("opacity", String(f.lamp));
  const text = h6Readout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = h6Numbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of stepBtns) if (b.dataset.go === f.phase) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  h6Step(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { h6Go(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.rpm = Number(range.value); rangeOut.textContent = st.rpm.toLocaleString("en-US") + " rpm"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __h6.at("reach in", 0.5) pauses that far into that step
window.__h6 = { at(phase, u = 0) { setPlaying(false); h6Go(st, phase); const d = M.CYCLE.find((c) => c[0] === phase)[1]; for (let t = 0; t < u * d; t += 1 / 60) h6Step(st, 1 / 60); draw(); return h6Readout(st); } };
`;
  return k.pageHtml({ title: "HSB06 · rotary table shot blast cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "hsb06-live.html"), html);
  console.log(`wrote ${join(OUT, "hsb06-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}

