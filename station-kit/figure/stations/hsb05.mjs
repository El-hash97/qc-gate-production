// Isometric figure of station HSB05 (hanger shot blast) for the station
// detail card in /visualisasi. Shapes follow the Blender layout: an octagonal
// blast cabinet with a round lid, a door between two posts, a monorail hoist
// carrying a BC block on a hanger, and the roller conveyor feeding it.
//   node station-kit/figure/stations/hsb05.mjs [outDir]   →   <outDir>/hsb05-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, about 1 unit = 1 cm) -------------------------------------
const PAD = { x: -166, y: -92, w: 262, d: 334, r: 8 };
const R = 72; // cabinet circumradius
const AP = R * Math.cos(Math.PI / 8); // apothem: the door face sits at y = AP
const BODY = [6, 92];
const DOOR = { x0: -21, x1: 21, z0: 12, z1: 78, depth: 22 };
const BEAM_Y = [70, 228];
const BEAM_Z = 114; // underside of the bottom flange
const TROLLEY_Y = 101;
const CONV = { y0: 120, y1: 214, z: 31 }; // roller tops at z
const HANG = { x: -12, y: 91.5, w: 24, d: 19, r: 1 }; // block on the hanger
const QUEUE = { x: -12, y: 172, w: 24, d: 19, r: 1 }; // block waiting on the conveyor
const BLOCK_H = 17;

const octagon = (radius, cx = 0, cy = 0) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  });

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [0, 0, 112], [-158, -84, 132], [-106, -28, 132], [-158, -28, 132], [0, BEAM_Y[0], BEAM_Z + 16], [-34, BEAM_Y[1], BEAM_Z + 16], [34, BEAM_Y[1], BEAM_Z + 16]],
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
  // walkway lines run edge to edge across the pad, beside the conveyor
  for (const x of [-48, 44]) out.push(L(k.lineOnTop([x, PAD.y + 5], [x, PAD.y + PAD.d - 5], 0, P), { tone: "faint" }));
  // anchor bolts at the pad corners
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
  // hopper and the filter housing above it
  out.push(S(slab(k.insetPlan(box, 6), 14, 16, 3, 0.4), { tone: "mid" }));
  out.push(S(slab(box, 30, 82, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(box, 58, P, 3) + k.sideSeam(box, 86, P, 3), { tone: "faint" }) }));
  // two cartridge doors on the front faces, each a closed outline with a latch
  const fx = box.x + box.w;
  const fy = box.y + box.d;
  out.push(L(k.pathOf([at([fx, box.y + 10, 36]), at([fx, box.y + box.d - 10, 36]), at([fx, box.y + box.d - 10, 80]), at([fx, box.y + 10, 80])], true), { tone: "lo" }));
  out.push(L(k.pathOf([at([box.x + 10, fy, 36]), at([box.x + box.w - 10, fy, 36]), at([box.x + box.w - 10, fy, 80]), at([box.x + 10, fy, 80])], true), { tone: "lo" }));
  out.push(D([at([fx, box.y + box.d - 14, 58]), at([box.x + box.w - 14, fy, 58])], { size: 0.6, tone: "mid" }));
  // fan and motor on the roof
  out.push(S(k.cylinder(box.x + 26, box.y + 28, 14, 112, 8, P, 40, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(box.x + 26, box.y + 28, 7, 120, 10, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(box.x + 26, box.y + 28, 7, 121, 129, 22, P), { tone: "faint" }));
  // rectangular duct from the cabinet's back-left face into the collector
  out.push(S(slab({ x: box.x + box.w, y: -40, w: 52, d: 16, r: 1 }, 70, 16, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: box.x + box.w + 24, y: -42, w: 4, d: 20, r: 0.6 }, 68, 20, 2), { tone: "mid" }));
  return out.join("");
}

// ---- the blast cabinet -------------------------------------------------------
function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -R, y: -R, w: 2 * R, d: 2 * R, r: R * 0.4 }, 0, 4, P)}"/>`];
  out.push(S(k.extrude(octagon(R + 4), 0, BODY[0], P, { bevel: 0.6 }), { tone: "mid" }));
  const body = octagon(R);
  const seams = L(k.ringSeam(body, 36, P) + k.ringSeam(body, 64, P), { tone: "faint" });
  out.push(S(k.extrude(body, BODY[0], BODY[1] - BODY[0], P), { tone: "hi", inner: seams }));
  out.push(S(k.extrude(octagon(R + 3), BODY[1], 5, P, { bevel: 0.8 }), { tone: "mid" }));
  // the round lid, its hub and three lifting eyes
  const top = BODY[1] + 5;
  out.push(S(k.cylinder(0, 0, 60, top, 7, P, 96, 1), { tone: "mid", crease: "lo" }));
  out.push(L(k.ring(0, 0, 52, top + 7, P, 96), { tone: "faint" }));
  const eyes = [0, 1, 2].map((i) => {
    const a = Math.PI / 6 + (i * 2 * Math.PI) / 3;
    return [Math.cos(a) * 44, Math.sin(a) * 44];
  });
  for (const [x, y] of byDepth(eyes, ([x, y]) => [x, y, top + 7])) {
    out.push(S(k.cylinder(x, y, 3.2, top + 7, 2, P, 16), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 1.4, top + 9, 4, P, 12), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.cylinder(0, 0, 13, top + 7, 6, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(0, 0, 13, top + 8, top + 12, 40, P), { tone: "faint" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at([Math.cos((i * Math.PI) / 4) * 9, Math.sin((i * Math.PI) / 4) * 9, top + 13])), { size: 0.45 }));
  // rivets along both panel seams on the three faces that face the viewer
  const faceAt = (i, t, z) => {
    const [[ax, ay], [bx, by]] = [body[i], body[(i + 1) % 8]];
    return [ax + (bx - ax) * t, ay + (by - ay) * t, z];
  };
  const facing = [7, 0, 1]; // faces whose normals point at 0°, 45° and 90°
  const rivets = [];
  for (const i of facing) for (const z of [36, 64]) for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) rivets.push(at(faceAt(i, t, z + 1.4)));
  out.push(D(rivets, { size: 0.4, tone: "mid" }));
  // inspection hatch on the front-right face, between the seams
  const hatch = [[0.22, 40], [0.78, 40], [0.78, 60], [0.22, 60]].map(([t, z]) => at(faceAt(0, t, z)));
  out.push(L(k.pathOf(hatch, true), { tone: "lo" }));
  out.push(D([[0.27, 43], [0.73, 43], [0.73, 57], [0.27, 57]].map(([t, z]) => at(faceAt(0, t, z))), { size: 0.45, tone: "mid" }));
  out.push(L(k.segment(faceAt(0, 0.44, 50), faceAt(0, 0.56, 50), P), { tone: "mid" }));
  // name plate on the +x face
  const plate = { x: AP, y: -16, w: 1, d: 32, r: 0.3 };
  out.push(S(slab(plate, 46, 14, 2), { tone: "mid", crease: "none" }));
  out.push(k.faceTextSvg(k.sideMatrix([AP + 1, 0], 51, P, "right"), "HSB 05", { size: 5.2, tone: "hi", anchor: "middle" }));
  out.push(D([at([AP + 1, -13, 57]), at([AP + 1, 13, 57]), at([AP + 1, -13, 49]), at([AP + 1, 13, 49])], { size: 0.4 }));
  // stack light on the rim
  const [lx, ly] = [46, -40];
  out.push(S(k.cylinder(lx, ly, 3, top, 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(lx, ly, 1, top + 3, 8, P, 12), { tone: "mid", crease: "none" }));
  for (const [i, tone] of [[0, "mid"], [1, "mid"], [2, "hi"]]) out.push(S(k.cylinder(lx, ly, 2.6, top + 11 + i * 5, 5, P, 20), { tone }));
  out.push(S(k.cylinder(lx, ly, 2.8, top + 26, 1.2, P, 20), { tone: "mid" }));
  return out.join("");
}

// ---- door: dark chamber behind the opening, posts, header, open leaves -------
function door() {
  const { x0, x1, z0, z1, depth } = DOOR;
  const back = AP - depth;
  const out = [];
  // chamber inside: back wall, the left reveal (faces +x, so it is seen) and the floor
  out.push(poly([[x0, back, z0], [x1, back, z0], [x1, back, z1], [x0, back, z1]], "hsb-cav"));
  out.push(poly([[x0, back, z0], [x0, AP, z0], [x0, AP, z1], [x0, back, z1]], "hsb-cav hsb-cav-side"));
  out.push(poly([[x0, back, z0], [x1, back, z0], [x1, AP, z0], [x0, AP, z0]], "hsb-cav hsb-cav-floor"));
  out.push(L(k.pathOf([at([x0, back, z1]), at([x0, back, z0]), at([x1, back, z0])]) + k.segment([x0, back, z0], [x0, AP, z0], P), { tone: "lo" }));
  // grating of the blast floor, edge to edge across the chamber floor
  out.push(L(Array.from({ length: 6 }, (_, i) => k.lineOnTop([x0, back + 3 + i * 3.4], [x1, back + 3 + i * 3.4], z0, P)).join(""), { tone: "faint" }));
  // rubber curtain strips hanging from the lintel
  out.push(L(Array.from({ length: 9 }, (_, i) => k.segment([x0 + 4.2 * (i + 1), back + 6, z1], [x0 + 4.2 * (i + 1), back + 6, z1 - 18], P)).join(""), { tone: "lo" }));
  out.push(L(k.pathOf([at([x0, AP, z0]), at([x1, AP, z0]), at([x1, AP, z1]), at([x0, AP, z1])], true), { tone: "mid" }));
  // posts and header, bolted to the cabinet face
  for (const x of [-29, 21]) {
    out.push(S(slab({ x, y: AP - 6, w: 8, d: 12, r: 0.8 }, 0, z1 + 12, 2, 0.5), { tone: "mid" }));
    out.push(D([14, 30, 46, 62, 78].map((z) => at([x + 4, AP + 6, z])), { size: 0.45 }));
  }
  out.push(S(slab({ x: -29, y: AP - 6, w: 58, d: 12, r: 0.8 }, z1, 12, 2, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: -29, y: AP - 6, w: 58, d: 12, r: 0.8 }, z1 + 6, P, 2), { tone: "faint" }) }));
  return out.join("");
}

function leaf(x) {
  // a door leaf swung fully open against its post, panel outline and handle
  const plan = { x, y: AP + 6, w: 3, d: 44, r: 0.6 };
  const fx = x + 3;
  const out = [S(slab(plan, DOOR.z0 - 4, DOOR.z1 - DOOR.z0 + 8, 2, 0.4), { tone: "mid" })];
  out.push(L(k.pathOf([at([fx, AP + 11, DOOR.z0 + 2]), at([fx, AP + 45, DOOR.z0 + 2]), at([fx, AP + 45, DOOR.z1 - 2]), at([fx, AP + 11, DOOR.z1 - 2])], true), { tone: "lo" }));
  out.push(S(slab({ x: fx, y: AP + 40, w: 2.4, d: 3, r: 0.6 }, 40, 12, 2), { tone: "mid" }));
  // hinges on the post side
  for (const z of [DOOR.z0 + 6, DOOR.z1 - 10]) out.push(S(k.cylinder(x + 1.5, AP + 6.5, 1.6, z, 6, P, 12), { tone: "mid" }));
  return out.join("");
}

// ---- monorail, trolley, hoist, hook and hanger -------------------------------
function beam() {
  const [y0, y1] = BEAM_Y;
  const out = [];
  // bracket on top of the door header carrying the inner end of the beam
  out.push(S(slab({ x: -5, y: AP - 4, w: 10, d: 10, r: 0.6 }, DOOR.z1 + 12, BEAM_Z - DOOR.z1 - 12, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: -9, y: AP - 6, w: 18, d: 14, r: 0.6 }, DOOR.z1 + 12, 2, 2), { tone: "mid" }));
  // I-beam: bottom flange, web, top flange
  out.push(S(slab({ x: -5, y: y0, w: 10, d: y1 - y0, r: 0.4 }, BEAM_Z, 2, 2), { tone: "mid" }));
  out.push(S(slab({ x: -1, y: y0, w: 2, d: y1 - y0, r: 0.3 }, BEAM_Z + 2, 8, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: -5, y: y0, w: 10, d: y1 - y0, r: 0.4 }, BEAM_Z + 10, 2, 2, 0.4), { tone: "mid" }));
  out.push(D([y0 + 4, y1 - 4].map((y) => at([0, y, BEAM_Z + 12])), { size: 0.45 }));
  return out.join("");
}

function portalColumn(x) {
  const y = BEAM_Y[1] - 10;
  return [
    S(slab({ x: x - 6, y: y - 3, w: 12, d: 12, r: 0.6 }, 0, 2, 2), { tone: "mid" }),
    D(k.corners({ x: x - 6, y: y - 3, w: 12, d: 12 }, 2).map(([px, py]) => at([px, py, 2])), { size: 0.4 }),
    S(slab({ x: x - 3, y, w: 6, d: 6, r: 0.4 }, 2, BEAM_Z + 10, 2, 0.4), { tone: "mid" }),
  ].join("");
}

function portalTop() {
  const y = BEAM_Y[1] - 10;
  return S(slab({ x: -40, y: y - 1, w: 80, d: 8, r: 0.5 }, BEAM_Z + 12, 6, 2, 0.5), { tone: "mid" });
}

function hoist() {
  const y = TROLLEY_Y;
  const out = [];
  // trolley wheels on the bottom flange, side plates, then the hoist body
  for (const wy of [y - 6, y + 4]) out.push(S(slab({ x: -7, y: wy, w: 14, d: 3, r: 1.4 }, BEAM_Z - 3, 3, 3), { tone: "mid" }));
  out.push(S(slab({ x: -8, y: y - 8, w: 16, d: 16, r: 1 }, BEAM_Z - 12, 9, 3, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: -10, y: y - 9, w: 20, d: 18, r: 1.6 }, BEAM_Z - 26, 14, 4, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: -10, y: y - 9, w: 20, d: 18, r: 1.6 }, BEAM_Z - 19, P, 4), { tone: "faint" }) }));
  // motor on the side of the hoist
  out.push(S(slab({ x: 10, y: y - 6, w: 8, d: 12, r: 3 }, BEAM_Z - 24, 10, 6, 0.4), { tone: "mid" }));
  out.push(L(Array.from({ length: 4 }, (_, i) => k.segment([18, y - 4 + i * 2.6, BEAM_Z - 22], [18, y - 4 + i * 2.6, BEAM_Z - 16], P)).join(""), { tone: "faint" }));
  // wire rope falls to the hook block
  const hookTop = 74;
  out.push(L(k.segment([-2, y, BEAM_Z - 26], [-2, y, hookTop], P) + k.segment([2, y, BEAM_Z - 26], [2, y, hookTop], P), { tone: "hi" }));
  out.push(S(slab({ x: -5, y: y - 3.5, w: 10, d: 7, r: 1.2 }, hookTop - 7, 7, 3, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([0, y + 3.5, hookTop - 3.5], 2.2, "y", P), { tone: "lo" }));
  // pendant control on its cable
  out.push(L(k.segment([15, y, BEAM_Z - 24], [15, y, 70], P), { tone: "lo" }));
  out.push(S(slab({ x: 13.5, y: y - 2.5, w: 3, d: 5, r: 0.8 }, 56, 14, 2, 0.3), { tone: "mid" }));
  out.push(D([66, 62.5, 59].map((z) => at([16.5, y, z])), { size: 0.5, tone: "hi" }));
  return out.join("");
}

function hanger() {
  const y = TROLLEY_Y;
  const top = 67;
  const deck = 37;
  const out = [];
  // C-hook: shank from the hook block, back bar down past the block, fork under it
  out.push(S(slab({ x: -1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, top - 4, 4, 2), { tone: "mid" }));
  out.push(S(slab({ x: -16, y: y - 2, w: 32, d: 4, r: 0.8 }, top - 7, 3, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: -16, y: y - 2, w: 4, d: 4, r: 0.6 }, deck, top - 7 - deck, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

function hangerFront() {
  const deck = 37;
  return S(slab({ x: -16, y: HANG.y - 2, w: 30, d: HANG.d + 4, r: 0.8 }, deck - 2.5, 2.5, 2, 0.4), { tone: "mid" });
}

// ---- BC block (47.5 × 37.1 × 33.6 cm): deck with four bores, head bolts -----
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

// ---- roller conveyor ---------------------------------------------------------
function conveyorBack() {
  const { y0, y1, z } = CONV;
  const out = [];
  for (const [x, y] of byDepth([[-20, y0 + 8], [-20, y1 - 8]], ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 4, 0, 1.4, P, 16), { tone: "mid" }));
    out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 1.4, z - 6.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: -25, y: y0, w: 4, d: y1 - y0, r: 0.5 }, z - 7, 8, 2, 0.4), { tone: "mid" }));
  for (let y = y0 + 3; y < y1 - 3; y += 6.4) out.push(S(slab({ x: -21, y, w: 42, d: 4.4, r: 2.2 }, z - 4.4, 4.4, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

function conveyorFront() {
  const { y0, y1, z } = CONV;
  const out = [];
  for (const [x, y] of byDepth([[20, y0 + 8], [20, y1 - 8]], ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 4, 0, 1.4, P, 16), { tone: "mid" }));
    out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 1.4, z - 6.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: 21, y: y0, w: 4, d: y1 - y0, r: 0.5 }, z - 7, 8, 2, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 14 }, (_, i) => at([25, y0 + 3 + i * 6.4 + 2.2, z - 3])), { size: 0.35, tone: "lo" }));
  // end stop
  out.push(S(slab({ x: -25, y: y1, w: 50, d: 4, r: 0.6 }, z - 7, 14, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

// ---- operator panel on a pedestal right of the door --------------------------
function console_() {
  const out = [];
  out.push(S(slab({ x: 50, y: 92, w: 12, d: 12, r: 0.6 }, 0, 2, 2), { tone: "mid" }));
  out.push(S(slab({ x: 53, y: 95, w: 6, d: 6, r: 0.4 }, 2, 48, 2, 0.3), { tone: "mid" }));
  const box = { x: 46, y: 90, w: 20, d: 14, r: 1 };
  out.push(S(slab(box, 50, 24, 3, 0.6), { tone: "mid" }));
  const fy = box.y + box.d;
  // buttons on the front face, the start button lit, a key switch and a screen
  const buttons = [[50, 58], [55, 58], [60, 58]];
  out.push(L(buttons.map(([x, z]) => k.sideRing([x, fy, z], 1.6, "y", P)).join(""), { tone: "lo" }));
  out.push(D(buttons.map(([x, z]) => at([x, fy, z])), { size: 0.8, tone: "hi" }));
  out.push(L(k.pathOf([at([49, fy, 63]), at([63, fy, 63]), at([63, fy, 71]), at([49, fy, 71])], true), { tone: "mid" }));
  out.push(L(k.sideRing([62.5, fy, 54], 2.2, "y", P), { tone: "mid" }));
  return out.join("");
}

const body = [
  floor(),
  collector(),
  cabinet(),
  door(),
  leaf(-32),
  conveyorBack(),
  block(QUEUE, CONV.z),
  conveyorFront(),
  portalColumn(-34),
  hanger(),
  hangerFront(),
  block(HANG, 37, { lit: true }),
  beam(),
  hoist(),
  leaf(29),
  portalTop(),
  portalColumn(34),
  console_(),
];

const STYLE = `<style>
.iso[data-theme="light"] .hsb-cav{fill:#cfcfcb}.iso[data-theme="light"] .hsb-cav-side{fill:#dadad6}.iso[data-theme="light"] .hsb-cav-floor{fill:#c4c4c0}
.iso[data-theme="dark"] .hsb-cav{fill:#060606}.iso[data-theme="dark"] .hsb-cav-side{fill:#0b0b0b}.iso[data-theme="dark"] .hsb-cav-floor{fill:#030303}
.hsb-cav{stroke:none}
</style>`;

const LABEL =
  "Station HSB05, hanger shot blast: an octagonal blast cabinet with a round lid and an open door between two posts. A monorail hoist carries a BC block on a C-hook hanger from the roller conveyor into the chamber.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `hsb05-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `hsb05-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
