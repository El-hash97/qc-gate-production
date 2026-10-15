// Isometric figure of station HSB06 (second shot blast, rotary table) for the station
// detail card in /visualisasi. Shapes follow the Blender layout: a round blast cabinet
// whose front is two flat faces meeting at a point, each with its own door: the block
// goes in through the left door and comes out of the right one after the rotary table
// has carried it past the blast wheels. The control panel sits where the faces meet, a
// pillar jib's manipulator reaches into the left door with a raw block, and a cleaned
// block waits on the output stand outside the right door.
//   node station-kit/figure/stations/hsb06.mjs [outDir]   →   <outDir>/hsb06-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
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
const PILLAR = [-146, 112];
const BOOM_Z = 150;
const ARM_Z = 70; // the manipulator's reach arm, over the block
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

// ---- BC block on any heading: deck with four bores, head bolts ----------------
function block(f, v, z, { lit = false } = {}) {
  const { half, d, h } = BLOCK;
  const F = f.F;
  const plan = [F(-half, v - d, 0), F(half, v - d, 0), F(half, v + d, 0), F(-half, v + d, 0)].map(([x, y]) => [x, y]);
  const seam = L(k.ringSeam(plan, z + 5, P), { tone: lit ? "lit" : "faint" });
  const out = [S(k.extrude(plan, z, h, P, { bevel: 0.6 }), { tone: "hi", crease: "lo", lit, inner: seam })];
  const bores = [-8, -2.7, 2.7, 8].map((u) => F(u, v, 0));
  out.push(L(bores.map(([x, y]) => k.ring(x, y, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  const bolts = [];
  for (const u of [-10.4, -5.3, 0, 5.3, 10.4]) bolts.push(at(F(u, v - d + 2, z + h)), at(F(u, v + d - 2, z + h)));
  out.push(D(bolts, { size: 0.4, tone: "mid" }));
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
  // boom from the pillar out past the pole, trolley under it
  const tip = [POLE[0] + (POLE[0] - px) * 0.12, POLE[1] + (POLE[1] - py) * 0.12];
  out.push(S(beamBox([px, py], tip, 6, BOOM_Z, 8), { tone: "mid" }));
  out.push(L(seg([px, py, BOOM_Z + 14], [lerp(px, POLE[0], 0.5), lerp(py, POLE[1], 0.5), BOOM_Z + 8]), { tone: "mid" }));
  out.push(D([at([lerp(px, POLE[0], 0.5), lerp(py, POLE[1], 0.5), BOOM_Z + 8])], { size: 0.6 }));
  out.push(S(slab({ x: POLE[0] - 6, y: POLE[1] - 6, w: 12, d: 12, r: 1 }, BOOM_Z - 6, 6, 3, 0.4), { tone: "mid" }));
  out.push(D([at([POLE[0] - 4, POLE[1] + 6, BOOM_Z - 3]), at([POLE[0] + 4, POLE[1] + 6, BOOM_Z - 3])], { size: 0.55 }));
  return out.join("");
}

// the hanging pole, its steering ring and the reach arm that goes in through the left door
function manipulator() {
  const f = LEFT;
  const [px, py] = POLE;
  const out = [];
  out.push(S(slab({ x: px - 2.4, y: py - 2.4, w: 4.8, d: 4.8, r: 0.6 }, 96, BOOM_Z - 102, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: px - 1.6, y: py - 1.6, w: 3.2, d: 3.2, r: 0.4 }, ARM_Z, 96 - ARM_Z, 2, 0.3), { tone: "hi", crease: "none" }));
  out.push(S(slab({ x: px - 3.4, y: py - 3.4, w: 6.8, d: 6.8, r: 0.8 }, 92, 4, 2, 0.4), { tone: "mid" }));
  // steering ring round the pole, on three spokes
  out.push(L(k.ring(px, py, 11, 84, P, 48) + k.ring(px, py, 9.6, 84, P, 48), { tone: "mid" }));
  out.push(L([0, 1, 2].map((i) => {
    const a = (i * 2 * Math.PI) / 3 + 0.4;
    return seg([px + Math.cos(a) * 1.6, py + Math.sin(a) * 1.6, 84], [px + Math.cos(a) * 9.6, py + Math.sin(a) * 9.6, 84]);
  }).join(""), { tone: "lo" }));
  // reach arm from the pole in through the door, a head over the block
  out.push(S(faceBox(f, [-2.4, 2.4], [-2, 40], ARM_Z, 5), { tone: "mid" }));
  out.push(S(faceBox(f, [-BLOCK.half - 4, BLOCK.half + 4], [-4, 4], ARM_Z - 6, 6), { tone: "mid" }));
  return out.join("");
}

function jaws(v, z, near) {
  const f = LEFT;
  const u = near ? BLOCK.half + 1 : -BLOCK.half - 4;
  return S(faceBox(f, [u, u + 3], [v - 6, v + 6], z + 4, ARM_Z - 6 - z - 4), { tone: "mid" });
}

const lerp = (a, b, t) => a + (b - a) * t;

// the block in the gripper sits half way through the left door; the cleaned one waits outside the right
const IN_V = 6;
const IN_Z = 40;
const [vx0, vy0] = k.towardViewer(P);
const nearIsPlus = LEFT.t[0] * vx0 + LEFT.t[1] * vy0 > 0;

const body = [
  floor(),
  collector(),
  cabinet(),
  door(LEFT),
  door(RIGHT),
  jaws(IN_V, IN_Z, !nearIsPlus),
  block(LEFT, IN_V, IN_Z, { lit: true }),
  jaws(IN_V, IN_Z, nearIsPlus),
  frame(LEFT),
  frame(RIGHT),
  panel(),
  stand(STAND_IN),
  pillar(),
  manipulator(),
  stand(STAND_OUT),
  block({ F: (u, v, z) => [STAND_OUT[0] + u, STAND_OUT[1] + v, z] }, 0, STAND_Z + 2),
];

const STYLE = `<style>
.iso[data-theme="light"] .hsb-cav{fill:#cfcfcb}.iso[data-theme="light"] .hsb-cav-side{fill:#dadad6}.iso[data-theme="light"] .hsb-cav-floor{fill:#c4c4c0}
.iso[data-theme="dark"] .hsb-cav{fill:#060606}.iso[data-theme="dark"] .hsb-cav-side{fill:#0b0b0b}.iso[data-theme="dark"] .hsb-cav-floor{fill:#030303}
.hsb-cav{stroke:none}
</style>`;

const LABEL =
  "Station HSB06, rotary table shot blast: a round blast cabinet whose front is two flat faces, each with a door, and a control panel where they meet. A pillar jib manipulator reaches in through the left door with a BC block; the rotary table carries it past the blast wheels to the right door, and the cleaned block waits on the output stand.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `hsb06-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `hsb06-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
