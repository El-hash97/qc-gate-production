// Isometric figure of station HSB05 (hanger shot blast) for the station
// detail card in /visualisasi. Shapes follow the Blender layout: an octagonal
// blast cabinet with a round lid and two doors, like HSB06: the block goes in
// through the left door and comes out through the right one, with the control
// panel on the face between them. A monorail leg runs out through each door;
// the hoist picks the BC block off the stand at the end of the conveyor from
// Baritori (cut short here), carries it on a hanger into the chamber, and sets
// the blasted block down on the stand on the out side, where HSB06 takes it.
// Seen as the overview camera sees it: the in door almost face on, the conveyor
// from Baritori coming in from the left, the out side off to the right.
//   node station-kit/figure/stations/hsb05.mjs [outDir]   →   <outDir>/hsb05-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 440;

// ---- world (z up, about 1 unit = 1 cm) -------------------------------------
// The in door is on the +y face and the out door on the face next to it, facing 45 degrees; the +x face to
// the right of the out door carries the control panel. Everything on the out side is the in side turned
// 45 degrees round the cabinet, so each piece is drawn once and TURN rotates it.
const PAD = { x: -166, y: -92, w: 408, d: 334, r: 8 };
const R = 86; // cabinet circumradius
const AP = R * Math.cos(Math.PI / 8); // apothem: each door face sits at AP from the centre
const BODY = [6, 92];
const DOOR = { x0: -16, x1: 16, z0: 12, z1: 78, depth: 22 }; // posts 6 wide either side
// each door sits off its face centre, away from the other door (the in door right up to its face's left
// corner), leaving room between them for the
// control panel (centred PANEL_X across the in door's face)
const SHIFT_IN = 10.9;
const SHIFT_OUT = 8.5;
const PANEL_X = 22;
const BEAM_Y = [70, 228];
const BEAM_Z = 114; // underside of the bottom flange
const TROLLEY_Y = 101;
const CONV = { x0: -160, x1: -21, y0: 117, y1: 153, z: 31 }; // the tail of the conveyor from Baritori, in from the left to the stand, cut at the pad edge; roller tops at z
const STAND = { y0: 116, y1: 154, z: 31 }; // pick (in) and set-down (out) stand under each monorail leg, top at z
const HANG = { x: -12, y: 91.5, w: 24, d: 19, r: 1 }; // block on the hanger
const QUEUE = { x: -12, y: 126, w: 24, d: 19, r: 1 }; // block on a stand
const BLOCK_H = 17;

const octagon = (radius, cx = 0, cy = 0) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  });

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [0, 0, 112], [-158, -84, 132], [-106, -28, 132], [-158, -28, 132], [0, BEAM_Y[1], BEAM_Z + 16], [BEAM_Y[1], 0, BEAM_Z + 16], [-34, BEAM_Y[1], BEAM_Z + 16], [BEAM_Y[1], 34, BEAM_Z + 16]],
  WIDTH,
  HEIGHT,
  // the overview camera: facing the in door, a little round towards the control panel
  { pad: 26, azimuth: 72, elevation: 30 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));

// ---- the turn: TURN rotates the in side (+y) round the cabinet onto the out door's face -----------
let TURN = 0;
const R2 = ([x, y]) => (TURN ? [x * Math.cos(TURN) - y * Math.sin(TURN), x * Math.sin(TURN) + y * Math.cos(TURN)] : [x, y]);
const P3 = (p) => [...R2(p), p[2]];
const A = (p) => at(P3(p));
const sl = (plan, z, h, steps = 3, bevel = 0.5) => (TURN ? k.extrude(k.ringOf(plan, steps).map(R2), z, h, P, { convex: true, bevel }) : slab(plan, z, h, steps, bevel));
const seg = (p, q) => k.segment(P3(p), P3(q), P);
const ring = (x, y, r, z, n = 24) => k.ring(...R2([x, y]), r, z, P, n);
const cyl = (x, y, r, z, h, n = 16, bevel = 0) => k.cylinder(...R2([x, y]), r, z, h, P, n, bevel);
// a seam round the sides we see of a (turned) plan, at height z
function sideSeam(plan, z, steps) {
  if (!TURN) return k.sideSeam(plan, z, P, steps);
  const ringPts = k.ringOf(plan, steps).map(R2);
  const [vx, vy] = k.towardViewer(P);
  let area = 0;
  ringPts.forEach(([ax, ay], i) => { const [bx, by] = ringPts[(i + 1) % ringPts.length]; area += ax * by - bx * ay; });
  return ringPts.map(([ax, ay], i) => {
    const [bx, by] = ringPts[(i + 1) % ringPts.length];
    const nx = area > 0 ? by - ay : ay - by;
    const ny = area > 0 ? ax - bx : bx - ax;
    return nx * vx + ny * vy > 1e-9 ? k.segment([ax, ay, z], [bx, by, z], P) : "";
  }).join("");
}
const onTop = (a, b, z) => k.lineOnTop(R2(a), R2(b), z, P);
const poly = (points, cls) => `<path class="${cls}" d="${k.pathOf(points.map(A), true)}"/>`;
const turned = (t, draw) => { TURN = t; const out = draw(); TURN = 0; return out; };

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
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
  out.push(S(k.cylinder(0, 0, R * 0.83, top, 7, P, 96, 1), { tone: "mid", crease: "lo" }));
  out.push(L(k.ring(0, 0, R * 0.72, top + 7, P, 96), { tone: "faint" }));
  const eyes = [0, 1, 2].map((i) => {
    const a = Math.PI / 6 + (i * 2 * Math.PI) / 3;
    return [Math.cos(a) * R * 0.61, Math.sin(a) * R * 0.61];
  });
  for (const [x, y] of byDepth(eyes, ([x, y]) => [x, y, top + 7])) {
    out.push(S(k.cylinder(x, y, 3.2, top + 7, 2, P, 16), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 1.4, top + 9, 4, P, 12), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.cylinder(0, 0, 13, top + 7, 6, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(0, 0, 13, top + 8, top + 12, 40, P), { tone: "faint" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at([Math.cos((i * Math.PI) / 4) * 9, Math.sin((i * Math.PI) / 4) * 9, top + 13])), { size: 0.45 }));
  // rivets along both panel seams on the face between the doors (face 0, facing 45 degrees)
  const faceAt = (i, t, z) => {
    const [[ax, ay], [bx, by]] = [body[i], body[(i + 1) % 8]];
    return [ax + (bx - ax) * t, ay + (by - ay) * t, z];
  };
  const rivets = [];
  for (const z of [36, 64]) for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) rivets.push(at(faceAt(7, t, z + 1.4)));
  out.push(D(rivets, { size: 0.4, tone: "mid" }));
  // the control panel in the gap between the two doors: a box standing off the face, a screen, buttons
  const u = [1, 0], n = [0, 1];
  const c = [PANEL_X, AP];
  const pt = (s, d) => [c[0] + u[0] * s + n[0] * d, c[1] + u[1] * s + n[1] * d];
  out.push(S(k.extrude([pt(-8, 0), pt(8, 0), pt(8, 6), pt(-8, 6)], 38, 30, P, { bevel: 0.4 }), { tone: "mid" }));
  const face = (s, z) => at([...pt(s, 6), z]);
  out.push(L(k.pathOf([face(-5.5, 58), face(5.5, 58), face(5.5, 64), face(-5.5, 64)], true), { tone: "lo" }));
  out.push(D([face(-4, 50), face(0, 50), face(4, 50), face(-4, 44), face(0, 44), face(4, 44)], { size: 0.8, tone: "hi" }));
  out.push(D([face(-6, 40), face(6, 40), face(-6, 66), face(6, 66)], { size: 0.4, tone: "mid" }));
  // stack light on the rim
  const [lx, ly] = [R * 0.64, -R * 0.56];
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
  // chamber inside: back wall, the reveal that faces the viewer and the floor
  out.push(poly([[x0, back, z0], [x1, back, z0], [x1, back, z1], [x0, back, z1]], "hsb-cav"));
  out.push(poly([[x0, back, z0], [x0, AP, z0], [x0, AP, z1], [x0, back, z1]], "hsb-cav hsb-cav-side"));
  out.push(poly([[x0, back, z0], [x1, back, z0], [x1, AP, z0], [x0, AP, z0]], "hsb-cav hsb-cav-floor"));
  out.push(L(k.pathOf([A([x0, back, z1]), A([x0, back, z0]), A([x1, back, z0])]) + seg([x0, back, z0], [x0, AP, z0]), { tone: "lo" }));
  // grating of the blast floor, edge to edge across the chamber floor
  out.push(L(Array.from({ length: 6 }, (_, i) => onTop([x0, back + 3 + i * 3.4], [x1, back + 3 + i * 3.4], z0)).join(""), { tone: "faint" }));
  // rubber curtain strips hanging from the lintel
  out.push(L(Array.from({ length: 7 }, (_, i) => seg([x0 + 4 * (i + 1), back + 6, z1], [x0 + 4 * (i + 1), back + 6, z1 - 18])).join(""), { tone: "lo" }));
  out.push(L(k.pathOf([A([x0, AP, z0]), A([x1, AP, z0]), A([x1, AP, z1]), A([x0, AP, z1])], true), { tone: "mid" }));
  // posts and header, bolted to the cabinet face
  for (const x of [x0 - 6, x1]) {
    out.push(S(sl({ x, y: AP - 6, w: 6, d: 12, r: 0.8 }, 0, z1 + 12, 2, 0.5), { tone: "mid" }));
    out.push(D([14, 30, 46, 62, 78].map((z) => A([x + 3, AP + 6, z])), { size: 0.45 }));
  }
  const header = { x: x0 - 6, y: AP - 6, w: x1 - x0 + 12, d: 12, r: 0.8 };
  out.push(S(sl(header, z1, 12, 2, 0.6), { tone: "mid", inner: L(sideSeam(header, z1 + 6, 2), { tone: "faint" }) }));
  return out.join("");
}

function leaf(x) {
  // a door leaf swung fully open against its post, panel outline and handle
  const plan = { x, y: AP + 6, w: 3, d: 44, r: 0.6 };
  const fx = x + 3;
  const out = [S(sl(plan, DOOR.z0 - 4, DOOR.z1 - DOOR.z0 + 8, 2, 0.4), { tone: "mid" })];
  out.push(L(k.pathOf([A([fx, AP + 11, DOOR.z0 + 2]), A([fx, AP + 45, DOOR.z0 + 2]), A([fx, AP + 45, DOOR.z1 - 2]), A([fx, AP + 11, DOOR.z1 - 2])], true), { tone: "lo" }));
  out.push(S(sl({ x: fx, y: AP + 40, w: 2.4, d: 3, r: 0.6 }, 40, 12, 2), { tone: "mid" }));
  // hinges on the post side
  for (const z of [DOOR.z0 + 6, DOOR.z1 - 10]) out.push(S(cyl(x + 1.5, AP + 6.5, 1.6, z, 6, 12), { tone: "mid" }));
  return out.join("");
}

// ---- monorail leg, portal, trolley, hoist, hook and hanger --------------------
function beam() {
  const [y0, y1] = BEAM_Y;
  const out = [];
  // bracket on top of the door header carrying the inner end of the beam
  out.push(S(sl({ x: -5, y: AP - 4, w: 10, d: 10, r: 0.6 }, DOOR.z1 + 12, BEAM_Z - DOOR.z1 - 12, 2, 0.4), { tone: "mid" }));
  out.push(S(sl({ x: -9, y: AP - 6, w: 18, d: 14, r: 0.6 }, DOOR.z1 + 12, 2, 2), { tone: "mid" }));
  // I-beam: bottom flange, web, top flange
  out.push(S(sl({ x: -5, y: y0, w: 10, d: y1 - y0, r: 0.4 }, BEAM_Z, 2, 2), { tone: "mid" }));
  out.push(S(sl({ x: -1, y: y0, w: 2, d: y1 - y0, r: 0.3 }, BEAM_Z + 2, 8, 2), { tone: "mid", crease: "none" }));
  out.push(S(sl({ x: -5, y: y0, w: 10, d: y1 - y0, r: 0.4 }, BEAM_Z + 10, 2, 2, 0.4), { tone: "mid" }));
  out.push(D([y0 + 4, y1 - 4].map((y) => A([0, y, BEAM_Z + 12])), { size: 0.45 }));
  return out.join("");
}

function portalColumn(x) {
  const y = BEAM_Y[1] - 10;
  return [
    S(sl({ x: x - 6, y: y - 3, w: 12, d: 12, r: 0.6 }, 0, 2, 2), { tone: "mid" }),
    D(k.corners({ x: x - 6, y: y - 3, w: 12, d: 12 }, 2).map(([px, py]) => A([px, py, 2])), { size: 0.4 }),
    S(sl({ x: x - 3, y, w: 6, d: 6, r: 0.4 }, 2, BEAM_Z + 10, 2, 0.4), { tone: "mid" }),
  ].join("");
}

function portalTop() {
  const y = BEAM_Y[1] - 10;
  return S(sl({ x: -40, y: y - 1, w: 80, d: 8, r: 0.5 }, BEAM_Z + 12, 6, 2, 0.5), { tone: "mid" });
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
  const out = [S(sl(plan, z, BLOCK_H, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(sideSeam(plan, z + 5, 2), { tone: "faint" }) })];
  const cy = plan.y + plan.d / 2;
  const bores = [0, 1, 2, 3].map((i) => plan.x + 4 + i * 5.33);
  out.push(L(bores.map((x) => ring(x, cy, 2.2, top)).join(""), { tone: lit ? "lit" : "mid" }));
  const bolts = [];
  for (const x of [plan.x + 1.6, ...bores.map((b) => b + 2.66).slice(0, 3), plan.x + plan.w - 1.6]) bolts.push(A([x, plan.y + 2, top]), A([x, plan.y + plan.d - 2, top]));
  out.push(D(bolts, { size: 0.4, tone: "mid" }));
  return out.join("");
}

// ---- the tail of the roller conveyor from Baritori: in from the left, cut at the pad edge --------
// one rail at a time (y is its inner face), so the near one is drawn over the rollers and the far one under
function conveyorRail(y) {
  const { x0, x1, z } = CONV;
  const near = y > CONV.y0;
  const ry = near ? y : y - 4;
  const out = [];
  for (const x of [x0 + 14, x1 - 12]) {
    out.push(S(cyl(x, ry + 2, 4, 0, 1.4, 16), { tone: "mid" }));
    out.push(S(sl({ x: x - 1.6, y: ry + 0.4, w: 3.2, d: 3.2, r: 0.4 }, 1.4, z - 6.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(sl({ x: x0, y: ry, w: x1 - x0, d: 4, r: 0.5 }, z - 7, 8, 2, 0.4), { tone: "mid" }));
  if (near) out.push(D(Array.from({ length: 21 }, (_, i) => A([x0 + 3 + i * 6.4 + 2.2, ry + 4, z - 3])), { size: 0.35, tone: "lo" }));
  return out.join("");
}

function rollers() {
  const { x0, x1, y0, y1, z } = CONV;
  const out = [];
  for (let x = x0 + 3; x < x1 - 3; x += 6.4) out.push(S(sl({ x, y: y0, w: 4.4, d: y1 - y0, r: 2.2 }, z - 4.4, 4.4, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

// ---- stand under a monorail leg: the hanger's tines slip in between its two top bars -------------
// `part` "back" is everything behind the block on it, "front" the near bar and its legs
function stand(part) {
  const { y0, y1, z } = STAND;
  const out = [];
  if (part === "back") {
    out.push(S(sl({ x: -17, y: y0 - 2, w: 34, d: y1 - y0 + 4, r: 0.8 }, 0, 2, 2, 0.4), { tone: "mid" }));
    out.push(D(k.corners({ x: -17, y: y0 - 2, w: 34, d: y1 - y0 + 4 }, 2.5).map(([x, y]) => A([x, y, 2])), { size: 0.4 }));
    for (const y of [y0 + 1, y1 - 4]) out.push(S(sl({ x: 9, y, w: 3, d: 3, r: 0.4 }, 2, z - 5, 2, 0.3), { tone: "mid" }));
    // cross bars at both ends, the far top bar, the stop the block sits against at the door end
    for (const y of [y0, y1 - 3]) out.push(S(sl({ x: -13, y, w: 26, d: 3, r: 0.4 }, z - 6, 3, 2, 0.3), { tone: "mid" }));
    out.push(S(sl({ x: 8, y: y0, w: 5, d: y1 - y0, r: 0.5 }, z - 3, 3, 2, 0.3), { tone: "mid" }));
    out.push(S(sl({ x: -13, y: y0 - 3, w: 26, d: 3, r: 0.5 }, z - 3, 12, 2, 0.4), { tone: "mid" }));
    out.push(D([-8, 8].map((x) => A([x, y0, z + 6])), { size: 0.45 }));
  } else {
    for (const y of [y0 + 1, y1 - 4]) out.push(S(sl({ x: -12, y, w: 3, d: 3, r: 0.4 }, 2, z - 5, 2, 0.3), { tone: "mid" }));
    out.push(S(sl({ x: -13, y: y0, w: 5, d: y1 - y0, r: 0.5 }, z - 3, 3, 2, 0.3), { tone: "mid" }));
    out.push(D([y0 + 6, y1 - 6].map((y) => A([-13, y, z - 1.5])), { size: 0.4 }));
  }
  return out.join("");
}

// the out side: the in side turned 45 degrees round the cabinet, so the two doors sit on neighbouring
// faces; its door, the monorail leg and portal, the set-down stand with a blasted block on it. The leaf
// between the two doors is left off on both sides (two leaves swung there would meet)
const outSide = () => `<g transform="${k.translateAlong(P, [SHIFT_OUT * Math.SQRT1_2, -SHIFT_OUT * Math.SQRT1_2, 0])}">` + turned(-Math.PI / 4, () => [
  door(),
  leaf(DOOR.x1 + 6),
  beam(),
  stand("back"),
  block(QUEUE, STAND.z),
  stand("front"),
  portalColumn(-34),
  portalColumn(34),
  portalTop(),
].join("")) + "</g>";

// the in side (+y, towards the viewer): door, the hoist carrying a block in, the pick stand with the next
// raw block, and the tail of the conveyor from Baritori
const inSide = () => `<g transform="${k.translateAlong(P, [-SHIFT_IN, 0, 0])}">` + [
  door(),
  hanger(),
  hangerFront(),
  block(HANG, 37, { lit: true }),
  beam(),
  hoist(),
  leaf(DOOR.x0 - 9),
  conveyorRail(CONV.y0),
  rollers(),
  conveyorRail(CONV.y1),
  stand("back"),
  block(QUEUE, STAND.z),
  stand("front"),
  portalColumn(34),
  portalTop(),
  portalColumn(-34),
].join("") + "</g>";

const body = [floor(), collector(), cabinet(), outSide(), inSide()];

const STYLE = `<style>
.iso[data-theme="light"] .hsb-cav{fill:#cfcfcb}.iso[data-theme="light"] .hsb-cav-side{fill:#dadad6}.iso[data-theme="light"] .hsb-cav-floor{fill:#c4c4c0}
.iso[data-theme="dark"] .hsb-cav{fill:#060606}.iso[data-theme="dark"] .hsb-cav-side{fill:#0b0b0b}.iso[data-theme="dark"] .hsb-cav-floor{fill:#030303}
.hsb-cav{stroke:none}
</style>`;

const LABEL =
  "Station HSB05, hanger shot blast: an octagonal blast cabinet with a round lid and two doors, with the control panel on the face between them. A monorail hoist picks the BC block on a C-hook hanger off the stand at the end of the conveyor from Baritori and carries it through the left door into the chamber; after blasting it comes out through the right door and is set down on the stand there for HSB06.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `hsb05-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `hsb05-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
