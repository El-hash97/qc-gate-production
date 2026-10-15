// Isometric figure of station HSB06 (second shot blast, rotary table) for the station
// detail card in /visualisasi. Shapes follow the Blender layout: a round blast cabinet
// with a flat-fronted door vestibule, a control column beside the door, a pillar jib
// whose hanging manipulator carries a BC block from the loading stand into the
// chamber, and the roller conveyor that takes blasted blocks on to Grinding.
//   node station-kit/figure/stations/hsb06.mjs [outDir]   →   <outDir>/hsb06-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as HSB05: the cabinet is 72 in radius) ----------
const PAD = { x: -166, y: -92, w: 282, d: 312, r: 8 };
const R = 72; // cabinet radius
const BODY = [6, 92];
const VEST = { x: -38, y: 44, w: 76, d: 36, r: 1 }; // flat-fronted door vestibule
const AP = VEST.y + VEST.d; // the door face sits at y = AP
const DOOR = { x0: -21, x1: 21, z0: 12, z1: 78, depth: 22 };
const PILLAR = [-62, 112]; // jib pillar
const BOOM_Z = 138; // underside of the boom
const POLE_X = 8; // hanging manipulator pole
const HANG = { x: -4, y: 102, w: 24, d: 19, r: 1 }; // block in the gripper
const HANG_Z = 44;
const BLOCK_H = 17;
const STAND = { x: -22, y: 146, w: 30, d: 30, r: 1 }; // loading stand, round plate on top
const STAND_Z = 34;
const CONV = { x0: 52, x1: 96, y0: 96, y1: 210, z: 31 }; // rollers run along x, the line along y; tops at z

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [0, 0, 112], [-158, -84, 132], [-106, -28, 132], [PILLAR[0], PILLAR[1], BOOM_Z + 20], [POLE_X + 10, PILLAR[1], BOOM_Z + 20]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const poly = (points, cls) => `<path class="${cls}" d="${k.pathOf(points.map(at), true)}"/>`;
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // walkway lines run from the vestibule to the pad edge, either side of the operator zone
  for (const x of [-92, 40]) out.push(L(k.lineOnTop([x, AP + 8], [x, PAD.y + PAD.d - 5], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- dust collector behind, ducted to the cabinet ----------------------------
function collector() {
  const box = { x: -158, y: -84, w: 52, d: 56, r: 2 };
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
  out.push(S(slab({ x: box.x + box.w, y: -40, w: 52, d: 16, r: 1 }, 70, 16, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: box.x + box.w + 24, y: -42, w: 4, d: 20, r: 0.6 }, 68, 20, 2), { tone: "mid" }));
  return out.join("");
}

// ---- the round blast cabinet ---------------------------------------------------
function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -R, y: -R, w: 2 * R, d: 2 * R, r: R }, 0, 4, P)}"/>`];
  out.push(S(k.cylinder(0, 0, R + 4, 0, BODY[0], P, 96, 0.6), { tone: "mid" }));
  const ring = k.circleRing(0, 0, R, 96);
  // two hoops round the shell and vertical panel seams that fade towards the sides
  const seams = L(k.ringSeam(ring, 36, P) + k.ringSeam(ring, 64, P) + k.knurl(0, 0, R, BODY[0] + 1, BODY[1] - 1, 16, P), { tone: "faint" });
  out.push(S(k.cylinder(0, 0, R, BODY[0], BODY[1] - BODY[0], P, 96), { tone: "hi", inner: seams }));
  out.push(S(k.cylinder(0, 0, R + 3, BODY[1], 5, P, 96, 0.8), { tone: "mid" }));
  // the flat lid, its hub and three lifting eyes
  const top = BODY[1] + 5;
  out.push(S(k.cylinder(0, 0, 64, top, 6, P, 96, 1), { tone: "mid", crease: "lo" }));
  out.push(L(k.ring(0, 0, 56, top + 6, P, 96), { tone: "faint" }));
  const eyes = [0, 1, 2].map((i) => {
    const a = Math.PI / 6 + (i * 2 * Math.PI) / 3;
    return [Math.cos(a) * 46, Math.sin(a) * 46];
  });
  for (const [x, y] of byDepth(eyes, ([x, y]) => [x, y, top + 6])) {
    out.push(S(k.cylinder(x, y, 3.2, top + 6, 2, P, 16), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 1.4, top + 8, 4, P, 12), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.cylinder(0, 0, 14, top + 6, 6, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(0, 0, 14, top + 7, top + 11, 40, P), { tone: "faint" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at([Math.cos((i * Math.PI) / 4) * 10, Math.sin((i * Math.PI) / 4) * 10, top + 12])), { size: 0.45 }));
  // blast wheel housing and motor on the shell's right side
  const wy = -20;
  const wx = Math.sqrt(R * R - wy * wy);
  out.push(S(slab({ x: wx - 4, y: wy - 14, w: 14, d: 28, r: 2 }, 44, 30, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: wx - 4, y: wy - 14, w: 14, d: 28, r: 2 }, 59, P, 3), { tone: "faint" }) }));
  out.push(S(k.cylinder(wx + 4, wy, 8, 74, 16, P, 32, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(wx + 4, wy, 8, 76, 88, 20, P), { tone: "faint" }));
  // stack light on the rim
  const [lx, ly] = [44, -44];
  out.push(S(k.cylinder(lx, ly, 3, top, 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(lx, ly, 1, top + 3, 8, P, 12), { tone: "mid", crease: "none" }));
  for (const [i, tone] of [[0, "mid"], [1, "mid"], [2, "hi"]]) out.push(S(k.cylinder(lx, ly, 2.6, top + 11 + i * 5, 5, P, 20), { tone }));
  out.push(S(k.cylinder(lx, ly, 2.8, top + 26, 1.2, P, 20), { tone: "mid" }));
  return out.join("");
}

// flat-fronted vestibule on the shell, carrying the door and the name plate
function vestibule() {
  const out = [S(slab(VEST, 0, BODY[1] - 4, 3, 0.6), { tone: "hi", inner: L(k.sideSeam(VEST, 36, P, 3) + k.sideSeam(VEST, 64, P, 3), { tone: "faint" }) })];
  out.push(S(slab(k.insetPlan(VEST, -2), BODY[1] - 4, 4, 3, 0.6), { tone: "mid" }));
  // name plate on the +x face
  const fx = VEST.x + VEST.w;
  const plate = { x: fx, y: VEST.y + 4, w: 1, d: 26, r: 0.3 };
  out.push(S(slab(plate, 66, 14, 2), { tone: "mid", crease: "none" }));
  out.push(k.faceTextSvg(k.sideMatrix([fx + 1, VEST.y + 17], 71, P, "right"), "HSB 06", { size: 5.2, tone: "hi", anchor: "middle" }));
  out.push(D([[7, 77], [27, 77], [7, 69], [27, 69]].map(([dy, z]) => at([fx + 1, VEST.y + dy, z])), { size: 0.4 }));
  return out.join("");
}

// ---- door: dark chamber with the rotary table behind the opening, posts, leaves
function door() {
  const { x0, x1, z0, z1, depth } = DOOR;
  const back = AP - depth;
  const out = [];
  out.push(poly([[x0, back, z0], [x1, back, z0], [x1, back, z1], [x0, back, z1]], "hsb-cav"));
  out.push(poly([[x0, back, z0], [x0, AP, z0], [x0, AP, z1], [x0, back, z1]], "hsb-cav hsb-cav-side"));
  out.push(poly([[x0, back, z0], [x1, back, z0], [x1, AP, z0], [x0, AP, z0]], "hsb-cav hsb-cav-floor"));
  out.push(L(k.pathOf([at([x0, back, z1]), at([x0, back, z0]), at([x1, back, z0])]) + k.segment([x0, back, z0], [x0, AP, z0], P), { tone: "lo" }));
  // the rim of the rotary table runs across the chamber floor, edge to edge
  out.push(L(k.lineOnTop([x0, back + 8], [x1, back + 8], z0, P) + k.lineOnTop([x0, back + 11], [x1, back + 11], z0, P), { tone: "faint" }));
  out.push(L(Array.from({ length: 9 }, (_, i) => k.segment([x0 + 4.2 * (i + 1), back + 6, z1], [x0 + 4.2 * (i + 1), back + 6, z1 - 18], P)).join(""), { tone: "lo" }));
  out.push(L(k.pathOf([at([x0, AP, z0]), at([x1, AP, z0]), at([x1, AP, z1]), at([x0, AP, z1])], true), { tone: "mid" }));
  for (const x of [-29, 21]) {
    out.push(S(slab({ x, y: AP - 6, w: 8, d: 12, r: 0.8 }, 0, z1 + 12, 2, 0.5), { tone: "mid" }));
    out.push(D([14, 30, 46, 62, 78].map((z) => at([x + 4, AP + 6, z])), { size: 0.45 }));
  }
  out.push(S(slab({ x: -29, y: AP - 6, w: 58, d: 12, r: 0.8 }, z1, 12, 2, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: -29, y: AP - 6, w: 58, d: 12, r: 0.8 }, z1 + 6, P, 2), { tone: "faint" }) }));
  return out.join("");
}

function leaf(x) {
  const plan = { x, y: AP + 6, w: 3, d: 44, r: 0.6 };
  const fx = x + 3;
  const out = [S(slab(plan, DOOR.z0 - 4, DOOR.z1 - DOOR.z0 + 8, 2, 0.4), { tone: "mid" })];
  out.push(L(k.pathOf([at([fx, AP + 11, DOOR.z0 + 2]), at([fx, AP + 45, DOOR.z0 + 2]), at([fx, AP + 45, DOOR.z1 - 2]), at([fx, AP + 11, DOOR.z1 - 2])], true), { tone: "lo" }));
  out.push(S(slab({ x: fx, y: AP + 40, w: 2.4, d: 3, r: 0.6 }, 40, 12, 2), { tone: "mid" }));
  for (const z of [DOOR.z0 + 6, DOOR.z1 - 10]) out.push(S(k.cylinder(x + 1.5, AP + 6.5, 1.6, z, 6, P, 12), { tone: "mid" }));
  return out.join("");
}

// ---- control column right of the door: start / stop buttons, selector, lamps --
function column() {
  const plan = { x: 46, y: AP - 2, w: 12, d: 10, r: 0.8 };
  const out = [S(slab({ x: 44, y: AP - 4, w: 16, d: 14, r: 1 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(slab(plan, 2, 58, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 24, P, 2), { tone: "faint" }) }));
  const fy = plan.y + plan.d;
  const pairs = [[49, 54], [55, 54], [49, 47], [55, 47], [49, 40], [55, 40]];
  out.push(L(pairs.map(([x, z]) => k.sideRing([x, fy, z], 1.7, "y", P)).join(""), { tone: "lo" }));
  out.push(D(pairs.map(([x, z]) => at([x, fy, z])), { size: 0.7, tone: "mid" }));
  out.push(D([at([49, fy, 31]), at([55, fy, 31])], { size: 1.1, tone: "hi" }));
  return out.join("");
}

// ---- pillar jib: column, slewing boom, trolley, hanging manipulator ----------
function pillar() {
  const [px, py] = PILLAR;
  const out = [S(slab({ x: px - 10, y: py - 10, w: 20, d: 20, r: 1 }, 0, 3, 2, 0.6), { tone: "mid" })];
  out.push(D(k.corners({ x: px - 10, y: py - 10, w: 20, d: 20 }, 2.5).map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(px, py, 5, 3, BOOM_Z - 3, P, 32, 0.4), { tone: "mid", crease: "lo" }));
  // slewing ring and the boom's root bracket
  out.push(S(k.cylinder(px, py, 7.5, BOOM_Z - 4, 4, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(px, py, 7.5, BOOM_Z - 3.5, BOOM_Z - 0.5, 28, P), { tone: "faint" }));
  out.push(S(k.cylinder(px, py, 5.5, BOOM_Z + 8, 4, P, 32, 0.6), { tone: "mid" }));
  return out.join("");
}

function boom() {
  const [px, py] = PILLAR;
  const out = [];
  // box boom from the pillar to past the pole, a tie strut up to the pillar cap
  const plan = { x: px - 6, y: py - 3, w: POLE_X - px + 16, d: 6, r: 0.5 };
  out.push(S(slab(plan, BOOM_Z, 8, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, BOOM_Z + 4, P, 2), { tone: "faint" }) }));
  out.push(L(k.segment([px + 4, py + 3, BOOM_Z + 11], [px + 40, py + 3, BOOM_Z + 8], P), { tone: "mid" }));
  out.push(D([at([px + 40, py + 3, BOOM_Z + 8])], { size: 0.6 }));
  // end stop and the trolley riding under the boom
  out.push(S(slab({ x: POLE_X + 8, y: py - 4, w: 3, d: 8, r: 0.4 }, BOOM_Z - 3, 11, 2), { tone: "mid" }));
  out.push(S(slab({ x: POLE_X - 6, y: py - 5, w: 12, d: 10, r: 1 }, BOOM_Z - 6, 6, 3, 0.4), { tone: "mid" }));
  out.push(D([at([POLE_X - 3, py + 5, BOOM_Z - 3]), at([POLE_X + 3, py + 5, BOOM_Z - 3])], { size: 0.55 }));
  return out.join("");
}

function poleAndWheel() {
  const py = PILLAR[1];
  const out = [];
  // telescopic pole from the trolley down to the gripper head
  out.push(S(slab({ x: POLE_X - 2.4, y: py - 2.4, w: 4.8, d: 4.8, r: 0.6 }, 92, BOOM_Z - 98, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: POLE_X - 1.6, y: py - 1.6, w: 3.2, d: 3.2, r: 0.4 }, HANG_Z + BLOCK_H + 8, 92 - HANG_Z - BLOCK_H - 8, 2, 0.3), { tone: "hi", crease: "none" }));
  out.push(S(slab({ x: POLE_X - 3.4, y: py - 3.4, w: 6.8, d: 6.8, r: 0.8 }, 88, 4, 2, 0.4), { tone: "mid" }));
  // handwheel the operator steers with, on the front of the pole
  const c = [POLE_X, py + 6, 80];
  out.push(L(k.sideRing(c, 8, "y", P, 36) + k.sideRing(c, 7, "y", P, 36), { tone: "mid" }));
  out.push(L([0, 1, 2].map((i) => {
    const a = (i * 2 * Math.PI) / 3 + Math.PI / 2;
    return k.segment(c, [c[0] + Math.cos(a) * 7, c[1], c[2] + Math.sin(a) * 7], P);
  }).join(""), { tone: "lo" }));
  out.push(D([at(c)], { size: 1, tone: "mid" }));
  out.push(L(k.segment([POLE_X, py + 2.4, 80], [POLE_X, py + 6, 80], P), { tone: "lo" }));
  return out.join("");
}

// gripper head: a bar across the top of the block and a jaw on each end
function gripperBack() {
  const top = HANG_Z + BLOCK_H;
  return S(slab({ x: HANG.x - 4, y: HANG.y + 2, w: 3, d: HANG.d - 4, r: 0.5 }, HANG_Z + 4, top - HANG_Z + 2, 2, 0.4), { tone: "mid" });
}

function gripperFront() {
  const top = HANG_Z + BLOCK_H;
  const out = [];
  out.push(S(slab({ x: HANG.x + HANG.w + 1, y: HANG.y + 2, w: 3, d: HANG.d - 4, r: 0.5 }, HANG_Z + 4, top - HANG_Z + 2, 2, 0.4), { tone: "mid" }));
  out.push(D([at([HANG.x + HANG.w + 4, HANG.y + 6, HANG_Z + 10]), at([HANG.x + HANG.w + 4, HANG.y + HANG.d - 6, HANG_Z + 10])], { size: 0.45 }));
  const bar = { x: HANG.x - 4, y: HANG.y + 6, w: HANG.w + 8, d: 7, r: 0.6 };
  out.push(S(slab(bar, top + 2, 4, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: POLE_X - 3, y: PILLAR[1] - 3, w: 6, d: 6, r: 0.6 }, top + 6, 2, 2), { tone: "mid" }));
  return out.join("");
}

// ---- BC block: deck with four bores, head bolts ------------------------------
function block(plan, z, { lit = false } = {}) {
  const top = z + BLOCK_H;
  const out = [S(slab(plan, z, BLOCK_H, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: "faint" }) })];
  const cy = plan.y + plan.d / 2;
  const bores = [0, 1, 2, 3].map((i) => plan.x + 4 + i * 5.33);
  out.push(L(bores.map((x) => k.ring(x, cy, 2.2, top, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  const bolts = [];
  for (const x of [plan.x + 1.6, ...bores.map((b) => b + 2.66).slice(0, 3), plan.x + plan.w - 1.6]) bolts.push(at([x, plan.y + 2, top]), at([x, plan.y + plan.d - 2, top]));
  out.push(D(bolts, { size: 0.4, tone: "mid" }));
  return out.join("");
}

// ---- loading stand: a welded frame with a round plate on top -----------------
function stand() {
  const { x, y, w, d } = STAND;
  const out = [];
  const posts = byDepth(k.corners(STAND, 2), ([px, py]) => [px, py, 0]);
  for (const [px, py] of posts) out.push(S(slab({ x: px - 1.6, y: py - 1.6, w: 3.2, d: 3.2, r: 0.3 }, 0, STAND_Z - 3, 2), { tone: "mid", crease: "none" }));
  for (const z of [4, STAND_Z - 6]) out.push(L(k.planOutline({ x: x + 2, y: y + 2, w: w - 4, d: d - 4, r: 0 }, z, P), { tone: "lo" }));
  out.push(S(slab(STAND, STAND_Z - 3, 3, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x + w / 2, y + d / 2, 13, STAND_Z, 2, P, 48, 0.4), { tone: "mid" }));
  // four square seats cut in the plate
  const c = [x + w / 2, y + d / 2];
  out.push(L([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => k.planOutline({ x: c[0] + sx * 5 - 2.5, y: c[1] + sy * 5 - 2.5, w: 5, d: 5, r: 0 }, STAND_Z + 2, P)).join(""), { tone: "lo" }));
  return out.join("");
}

// ---- roller conveyor towards Grinding ----------------------------------------
function conveyorBack() {
  const { x0, x1, y0, y1, z } = CONV;
  const out = [];
  for (const [x, y] of byDepth([[x0 + 4, y0 + 8], [x0 + 4, y1 - 8]], ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 4, 0, 1.4, P, 16), { tone: "mid" }));
    out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 1.4, z - 6.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: x0 - 4, y: y0, w: 4, d: y1 - y0, r: 0.5 }, z - 7, 8, 2, 0.4), { tone: "mid" }));
  for (let y = y0 + 3; y < y1 - 3; y += 6.4) out.push(S(slab({ x: x0, y, w: x1 - x0, d: 4.4, r: 2.2 }, z - 4.4, 4.4, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

function conveyorFront() {
  const { x0, x1, y0, y1, z } = CONV;
  const out = [];
  for (const [x, y] of byDepth([[x1 - 4, y0 + 8], [x1 - 4, y1 - 8]], ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 4, 0, 1.4, P, 16), { tone: "mid" }));
    out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 1.4, z - 6.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: x1, y: y0, w: 4, d: y1 - y0, r: 0.5 }, z - 7, 8, 2, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 17 }, (_, i) => at([x1 + 4, y0 + 3 + i * 6.4 + 2.2, z - 3])), { size: 0.35, tone: "lo" }));
  out.push(S(slab({ x: x0 - 4, y: y1, w: x1 - x0 + 8, d: 4, r: 0.6 }, z - 7, 14, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

const body = [
  floor(),
  collector(),
  cabinet(),
  vestibule(),
  door(),
  leaf(-32),
  column(),
  conveyorBack(),
  block({ x: 62, y: 160, w: 24, d: 19, r: 1 }, CONV.z),
  conveyorFront(),
  pillar(),
  boom(),
  leaf(29),
  gripperBack(),
  block(HANG, HANG_Z, { lit: true }),
  gripperFront(),
  poleAndWheel(),
  stand(),
];

const STYLE = `<style>
.iso[data-theme="light"] .hsb-cav{fill:#cfcfcb}.iso[data-theme="light"] .hsb-cav-side{fill:#dadad6}.iso[data-theme="light"] .hsb-cav-floor{fill:#c4c4c0}
.iso[data-theme="dark"] .hsb-cav{fill:#060606}.iso[data-theme="dark"] .hsb-cav-side{fill:#0b0b0b}.iso[data-theme="dark"] .hsb-cav-floor{fill:#030303}
.hsb-cav{stroke:none}
</style>`;

const LABEL =
  "Station HSB06, rotary table shot blast: a round blast cabinet with a door in a flat vestibule and a control column beside it. A pillar jib's hanging manipulator, steered by a handwheel, carries a BC block from the loading stand into the chamber; a roller conveyor takes blasted blocks on to Grinding.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `hsb06-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `hsb06-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
