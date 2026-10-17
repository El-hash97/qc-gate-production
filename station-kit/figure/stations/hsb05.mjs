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
// The live page runs the cycle of hsb05-3d.html: pick up at the left stand, lift, in through the left
// door, doors close, blast (coverage from the same Avrami model), doors open, out through the right door,
// set down on the right stand, release, and back empty.
//   node station-kit/figure/stations/hsb05.mjs [outDir]
//     →   <outDir>/hsb05-{light,dark}.svg and <outDir>/hsb05-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/hsb05.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
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

// trolley on the bottom flange and the hoist under it, with its motor and pendant (moves along the leg)
function hoist() {
  const y = TROLLEY_Y;
  const out = [];
  for (const wy of [y - 6, y + 4]) out.push(S(sl({ x: -7, y: wy, w: 14, d: 3, r: 1.4 }, BEAM_Z - 3, 3, 3), { tone: "mid" }));
  out.push(S(sl({ x: -8, y: y - 8, w: 16, d: 16, r: 1 }, BEAM_Z - 12, 9, 3, 0.5), { tone: "mid" }));
  const body = { x: -10, y: y - 9, w: 20, d: 18, r: 1.6 };
  out.push(S(sl(body, BEAM_Z - 26, 14, 4, 0.6), { tone: "mid", inner: L(sideSeam(body, BEAM_Z - 19, 4), { tone: "faint" }) }));
  out.push(S(sl({ x: 10, y: y - 6, w: 8, d: 12, r: 3 }, BEAM_Z - 24, 10, 6, 0.4), { tone: "mid" }));
  out.push(L(Array.from({ length: 4 }, (_, i) => seg([18, y - 4 + i * 2.6, BEAM_Z - 22], [18, y - 4 + i * 2.6, BEAM_Z - 16])).join(""), { tone: "faint" }));
  out.push(L(seg([15, y, BEAM_Z - 24], [15, y, 70]), { tone: "lo" }));
  out.push(S(sl({ x: 13.5, y: y - 2.5, w: 3, d: 5, r: 0.8 }, 56, 14, 2, 0.3), { tone: "mid" }));
  out.push(D([66, 62.5, 59].map((z) => A([16.5, y, z])), { size: 0.5, tone: "hi" }));
  return out.join("");
}

// the hook: wire ropes (running up into the hoist body, which hides their tops as the hook rises and
// falls), the hook block and the C-hook hanger; `part` "back" is behind the block it carries, "front" under it
function hook(part) {
  const y = TROLLEY_Y;
  const top = 67;
  const deck = 37;
  const hookTop = 74;
  const out = [];
  if (part === "back") {
    out.push(L(seg([-2, y, BEAM_Z - 14], [-2, y, hookTop]) + seg([2, y, BEAM_Z - 14], [2, y, hookTop]), { tone: "hi" }));
    out.push(S(sl({ x: -5, y: y - 3.5, w: 10, d: 7, r: 1.2 }, hookTop - 7, 7, 3, 0.4), { tone: "mid" }));
    out.push(D([A([0, y + 3.5, hookTop - 3.5])], { size: 0.7, tone: "lo" }));
    out.push(S(sl({ x: -1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, top - 4, 4, 2), { tone: "mid" }));
    out.push(S(sl({ x: -16, y: y - 2, w: 32, d: 4, r: 0.8 }, top - 7, 3, 2, 0.4), { tone: "mid" }));
    out.push(S(sl({ x: -16, y: y - 2, w: 4, d: 4, r: 0.6 }, deck, top - 7 - deck, 2, 0.4), { tone: "mid" }));
  } else {
    out.push(S(sl({ x: -16, y: HANG.y - 2, w: 30, d: HANG.d + 4, r: 0.8 }, deck - 2.5, 2.5, 2, 0.4), { tone: "mid" }));
  }
  return out.join("");
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

// =============================================================================
// The cycle, as in hsb05-3d.html. The model (hsbStep, hsbGo) and the moving pieces (hsbScene, hsbLeaf)
// are plain functions over `k`, `P` and `M`; the live page gets their source with the kit inlined.
// Each side (0 in, 1 out) is the in side's drawing turned and shifted round the cabinet, with its own
// hoist and hook built in place and moved along its leg. The rig is drawn in a slot by the door while it
// is near the door and after the stand once it is over it, and fades as it passes into the chamber.
// One leaf per door, on the side away from the other door (two leaves swung between them would meet).
// =============================================================================

const SIDES = [
  { turn: 0, sx: -SHIFT_IN, sy: 0, leafX: DOOR.x0 - 7.5, leafDir: 1 },
  { turn: -Math.PI / 4, sx: SHIFT_OUT * Math.SQRT1_2, sy: -SHIFT_OUT * Math.SQRT1_2, leafX: DOOR.x1 + 7.5, leafDir: -1 },
];
const M = {
  CYCLE: [["pickup", 1.6], ["lift", 2.2], ["in", 3.4], ["close", 1.4], ["blast", 11], ["open", 1.4], ["out", 3.4], ["lower", 2.2], ["release", 2.0], ["return", 5.0]],
  SIDES,
  AP,
  TROLLEY_Y,
  STATION: (STAND.y0 + STAND.y1) / 2 + (TROLLEY_Y - (HANG.y + HANG.d / 2)), // trolley over the stand
  LOW: STAND.z - 37, // deck down on the stand
  HIGH: 8, // carried, clear of the stand's stop
  FADE: [AP - 22, AP + 10], // the rig fades as it passes into the chamber
  NEAR_STAND: STAND.y0 - 6, // past this the rig is drawn after the stand
  ROLL: CONV.x1 - 40, // the raw block rolls in from here on the conveyor
  DOOR: { z0: DOOR.z0, z1: DOOR.z1, leaf: 44 },
  LAMP: [R * 0.64, -R * 0.56, BODY[1] + 5 + 23.5],
  // physics (SI): wheel tip speed, shot dents, Avrami coverage
  WHEEL_D: 0.48,
  MDOT: 2.5,
  M_SHOT: (7600 * Math.PI * 0.84e-3 ** 3) / 6,
  F_HIT: 0.25,
  A_BLOCK: 0.92,
  ETA: 0.6,
  WHEELS: 4,
  TIME_K: 10, // blast shown 10x fast (110 s in 11 s)
};
M.LEN = M.CYCLE.reduce((sum, [, d]) => sum + d, 0);

const approach = (a, b, tau, dt) => b + (a - b) * Math.exp(-dt / tau);
const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hsbSolve(n) {
  const v = (Math.PI * M.WHEEL_D * n) / 60;
  const dDent = 0.24e-3 * Math.pow(Math.max(v, 1) / 72, 0.4);
  const kk = (M.F_HIT * ((M.MDOT * M.WHEELS) / M.M_SHOT) * ((Math.PI * dDent * dDent) / 4)) / M.A_BLOCK;
  return { v, k: kk, P: (M.MDOT * v * v) / (2 * M.ETA) };
}

function hsbState() {
  return { t: 0, n: 0, C: 0, rpm: 2900, v: 0, P: 0 };
}

function hsbPhase(t) {
  let a = ((t % M.LEN) + M.LEN) % M.LEN;
  for (const [name, d] of M.CYCLE) {
    if (a < d) return [name, a / d];
    a -= d;
  }
  return ["return", 1];
}

// jump to the start of a step
function hsbGo(st, name) {
  let t = 0;
  for (const [n, d] of M.CYCLE) {
    if (n === name) break;
    t += d;
  }
  st.t = t + 1e-6;
  if (["pickup", "lift", "in", "close", "blast"].includes(name)) st.C = 0;
  else st.C = Math.max(st.C, 1 - Math.exp(-hsbSolve(st.rpm).k * 11 * M.TIME_K));
}

function hsbStep(st, dt) {
  st.t += dt;
  const [phase] = hsbPhase(st.t);
  const want = phase === "blast" ? st.rpm : 0;
  st.n = approach(st.n, want, want > st.n ? 0.9 : 2.2, dt);
  const sol = hsbSolve(st.n);
  st.v = sol.v;
  st.P = sol.P;
  if (phase === "pickup") st.C = 0;
  if (phase === "blast") st.C = 1 - (1 - st.C) * Math.exp(-sol.k * dt * M.TIME_K);
}

// a door leaf swung `open` (1 = square to the face, 0 = shut across the doorway), side `i`
function hsbLeaf(i, open) {
  const sd = M.SIDES[i];
  const a = (((1 - open) * Math.PI) / 2) * -sd.leafDir; // swing about the hinge in over the doorway
  const hx = sd.leafX;
  const hy = M.AP + 7.5;
  const c = Math.cos(sd.turn);
  const s = Math.sin(sd.turn);
  const W = ([lx, ly]) => {
    const rx = hx + (lx * Math.cos(a) - ly * Math.sin(a));
    const ry = hy + (lx * Math.sin(a) + ly * Math.cos(a));
    return [rx * c - ry * s + sd.sx, rx * s + ry * c + sd.sy];
  };
  const L = M.DOOR.leaf;
  const ring = [[-1.5, 0], [1.5, 0], [1.5, L], [-1.5, L]].map(W);
  const z0 = M.DOOR.z0 - 4;
  const h = M.DOOR.z1 - M.DOOR.z0 + 8;
  const out = [k.solidSvg(k.extrude(ring, z0, h, P, { convex: true, bevel: 0.4 }), { tone: "mid" })];
  // the face we see: panel outline, the handle near the free edge, the hinges
  const [vx, vy] = k.towardViewer(P);
  const n = W([1, 0]);
  const o = W([0, 0]);
  const side = (n[0] - o[0]) * vx + (n[1] - o[1]) * vy > 0 ? 1.5 : -1.5;
  const pt = (t, z) => k.iso([...W([side, t]), z], P);
  out.push(k.lineSvg(k.pathOf([pt(5, M.DOOR.z0 + 2), pt(L - 5, M.DOOR.z0 + 2), pt(L - 5, M.DOOR.z1 - 2), pt(5, M.DOOR.z1 - 2)], true), { tone: "lo" }));
  out.push(k.dotsSvg([pt(L - 4, 46)], { size: 1.1, tone: "mid" }));
  out.push(k.dotsSvg([pt(1.2, M.DOOR.z0 + 9), pt(1.2, M.DOOR.z1 - 7)], { size: 0.8, tone: "mid" }));
  return out.join("");
}

// where everything is at this moment of the cycle
function hsbScene(st) {
  const [phase, u] = hsbPhase(st.t);
  const e = u * u * (3 - 2 * u);
  let p = 0;
  let lift = 1;
  let carry = true;
  if (phase === "pickup") { lift = 1 - e; carry = false; }
  else if (phase === "lift") lift = e;
  else if (phase === "in") p = e;
  else if (phase === "close" || phase === "blast" || phase === "open") p = 1;
  else if (phase === "out") p = 1 + e;
  else if (phase === "lower") { p = 2; lift = 1 - e; }
  else if (phase === "release") { p = 2; lift = e; carry = false; }
  else if (phase === "return") { p = 2 - 2 * e; carry = false; }
  const side = p < 1 ? 0 : 1;
  const d = p <= 1 ? M.STATION * (1 - p) : M.STATION * (p - 1); // distance out along the leg from the centre
  const dz = M.LOW + (M.HIGH - M.LOW) * lift;
  const fade = smooth01(M.FADE[0], M.FADE[1], d);
  const along = (i, dd, z) => {
    const t = M.SIDES[i].turn;
    const ly = dd - M.TROLLEY_Y;
    return k.translateAlong(P, [-ly * Math.sin(t), ly * Math.cos(t), z]);
  };
  const open = phase === "close" ? 1 - e : phase === "blast" ? 0 : phase === "open" ? e : 1;
  const rigs = [0, 1].map((i) => ({
    hoist: along(i, d, 0),
    hook: along(i, d, dz),
    alpha: i === side ? fade : 0,
    nearStand: d > M.NEAR_STAND,
  }));
  return {
    phase,
    rigs,
    carry,
    leaves: [hsbLeaf(0, open), hsbLeaf(1, open)],
    raw: {
      alpha: phase === "pickup" ? 1 : phase === "return" ? smooth01(0, 0.25, e) : 0,
      roll: phase === "return" ? k.translateAlong(P, [M.ROLL * (1 - smooth01(0.1, 0.8, u)), 0, 0]) : "translate(0 0)",
    },
    done: phase === "release" ? 1 - smooth01(0.75, 1, u) : 0,
    lamp: phase === "blast" ? 1 : 0,
  };
}

const SAY = { pickup: "picking up at the left stand", lift: "lifting", in: "in through the left door", close: "doors closing", blast: "blasting", open: "doors opening", out: "out through the right door", lower: "setting down on the right stand", release: "on to HSB06", return: "back empty for the next block" };
const STEPS = { pickup: "Pick up", lift: "Lift", in: "In", close: "Close", blast: "Blast", open: "Open", out: "Out", lower: "Lower", release: "Release", return: "Return" };

function hsbReadout(st) {
  const [phase] = hsbPhase(st.t);
  return `${SAY[phase]} · coverage ${(st.C * 100).toFixed(1)}%`;
}

function hsbNumbers(st) {
  const f = (x) => Math.round(x).toLocaleString("en-US");
  return `${f(st.n)} rpm · shot ${f(st.v)} m/s · ${(st.P / 1000).toFixed(1)} kW per wheel · 4 wheels`;
}

// ---- self-check: a cycle visits every step in order and reaches full coverage at the set speed
{
  const st = hsbState();
  const seen = [];
  for (let t = 0; t < M.LEN; t += 1 / 60) {
    hsbStep(st, 1 / 60);
    const [ph] = hsbPhase(st.t);
    if (seen.at(-1) !== ph) seen.push(ph);
  }
  const want = M.CYCLE.map(([n]) => n);
  if (JSON.stringify(seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  const full = hsbState();
  hsbGo(full, "blast");
  for (let t = 0; t < 11; t += 1 / 60) hsbStep(full, 1 / 60);
  if (full.C < 0.98) throw new Error(`coverage after the blast only ${(full.C * 100).toFixed(1)}%`);
  console.log(`cycle check passed (${want.join(" → ")}, coverage ${(full.C * 100).toFixed(1)}%)`);
}

// ---- the drawing: both sides with their moving parts in slots -----------------------------
function sideBody(i, f) {
  const sd = SIDES[i];
  const r = f.rigs[i];
  const slot = (name, inner = "") => `<g data-slot="${name}-${i}">${inner}</g>`;
  const hookG = () => `<g data-part="hook-${i}" transform="${r.hook}" opacity="${r.alpha.toFixed(3)}">${hook("back")}<g data-part="cargo-${i}" opacity="${f.carry ? 1 : 0}">${block(HANG, 37, { lit: true })}</g>${hook("front")}</g>`;
  const hoistG = () => `<g data-part="hoist-${i}" transform="${r.hoist}" opacity="${r.alpha.toFixed(3)}">${hoist()}</g>`;
  // built inside turned(): every helper reads TURN while the parts are drawn
  const parts = () => i === 0
    ? [
        door(),
        slot("hook-door", r.nearStand ? "" : hookG()),
        beam(),
        slot("hoist-door", r.nearStand ? "" : hoistG()),
        slot("leaf", f.leaves[0]),
        conveyorRail(CONV.y0),
        rollers(),
        conveyorRail(CONV.y1),
        stand("back"),
        `<g data-part="raw-block" opacity="${f.raw.alpha}" transform="${f.raw.roll}">${block(QUEUE, STAND.z)}</g>`,
        stand("front"),
        slot("rig-stand", r.nearStand ? hookG() + hoistG() : ""),
        portalColumn(34),
        portalTop(),
        portalColumn(-34),
      ]
    : [
        door(),
        slot("leaf", f.leaves[1]),
        slot("hook-door", r.nearStand ? "" : hookG()),
        beam(),
        slot("hoist-door", r.nearStand ? "" : hoistG()),
        stand("back"),
        `<g data-part="done-block" opacity="${f.done}">${block(QUEUE, STAND.z)}</g>`,
        stand("front"),
        slot("rig-stand", r.nearStand ? hookG() + hoistG() : ""),
        portalColumn(-34),
        portalColumn(34),
        portalTop(),
      ];
  return `<g transform="${k.translateAlong(P, [sd.sx, sd.sy, 0])}">` + turned(sd.turn, () => parts().join("")) + "</g>";
}

function sceneBody(st) {
  const f = hsbScene(st);
  return [
    floor(),
    collector(),
    cabinet(),
    `<g data-part="lamp" opacity="${f.lamp}">${D([at(M.LAMP)], { size: 2.2, tone: "lit" })}</g>`,
    sideBody(1, f),
    sideBody(0, f),
  ];
}

// a moment for the still image: the hoist carrying the raw block towards the left door
const still = hsbState();
hsbGo(still, "in");
still.t += 3.4 * 0.35;
const body = sceneBody(still);

const STYLE = `<style>
.iso[data-theme="light"] .hsb-cav{fill:#cfcfcb}.iso[data-theme="light"] .hsb-cav-side{fill:#dadad6}.iso[data-theme="light"] .hsb-cav-floor{fill:#c4c4c0}
.iso[data-theme="dark"] .hsb-cav{fill:#060606}.iso[data-theme="dark"] .hsb-cav-side{fill:#0b0b0b}.iso[data-theme="dark"] .hsb-cav-floor{fill:#030303}
.hsb-cav{stroke:none}
</style>`;

const LABEL =
  "Station HSB05, hanger shot blast: an octagonal blast cabinet with a round lid and two doors, with the control panel on the face between them. A monorail hoist picks the BC block on a C-hook hanger off the stand at the end of the conveyor from Baritori and carries it through the left door into the chamber; after blasting it comes out through the right door and is set down on the stand there for HSB06.";

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `hsb05-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `hsb05-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = hsbState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...sceneBody(st)] });
  const steps = M.CYCLE.map(([ph]) => `<button type="button" data-go="${ph}">${STEPS[ph]}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Wheel speed <input type="range" min="1800" max="3000" step="50" value="2900" aria-label="Blast wheel speed, rpm"><output>2,900 rpm</output></label>
<div class="bari-num" data-numbers>${hsbNumbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "HSB05",
    title: "Hanger shot blast cycle",
    hint: "Click to pause",
    readout: hsbReadout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="HSB05 cycle, click or press space to pause">${svg}</div>`,
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
  const fns = [approach, smooth01, hsbSolve, hsbState, hsbPhase, hsbGo, hsbStep, hsbLeaf, hsbScene, hsbReadout, hsbNumbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, segment, pathOf, extrude, solidSvg, lineSvg, dotsSvg, towardViewer, translateAlong };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
const SAY = ${JSON.stringify(SAY)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const q = (sel) => svg.querySelector(sel);
const slot = (name) => q('[data-slot="' + name + '"]');
const rig = [0, 1].map((i) => ({ hook: q('[data-part="hook-' + i + '"]'), hoist: q('[data-part="hoist-' + i + '"]'), cargo: q('[data-part="cargo-' + i + '"]'), hookDoor: slot("hook-door-" + i), hoistDoor: slot("hoist-door-" + i), stand: slot("rig-stand-" + i), leaf: slot("leaf-" + i) }));
const raw = q('[data-part="raw-block"]');
const done = q('[data-part="done-block"]');
const lamp = q('[data-part="lamp"]');
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = hsbState();
if (still.matches) { hsbGo(st, "blast"); st.t += 5; st.n = st.rpm; st.C = 0.8; }
const set = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = hsbScene(st);
  for (let i = 0; i < 2; i++) {
    const r = rig[i], fr = f.rigs[i];
    set(r.hook, "transform", fr.hook); set(r.hoist, "transform", fr.hoist);
    set(r.hook, "opacity", fr.alpha.toFixed(3)); set(r.hoist, "opacity", fr.alpha.toFixed(3));
    set(r.cargo, "opacity", f.carry ? "1" : "0");
    // over the stand the rig is drawn after it, by the door before the beam
    if (fr.nearStand) { if (r.hook.parentNode !== r.stand) { r.stand.appendChild(r.hook); r.stand.appendChild(r.hoist); } }
    else if (r.hook.parentNode !== r.hookDoor) { r.hookDoor.appendChild(r.hook); r.hoistDoor.appendChild(r.hoist); }
    html(r.leaf, f.leaves[i]);
  }
  set(raw, "opacity", String(f.raw.alpha)); set(raw, "transform", f.raw.roll);
  set(done, "opacity", f.done.toFixed(3));
  set(lamp, "opacity", String(f.lamp));
  const text = hsbReadout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = hsbNumbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  const [phase] = hsbPhase(st.t);
  for (const b of stepBtns) if (b.dataset.go === phase) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  hsbStep(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { hsbGo(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.rpm = Number(range.value); rangeOut.textContent = st.rpm.toLocaleString("en-US") + " rpm"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __hsb.at("out", 0.5) pauses that far into that step
window.__hsb = { at(phase, u = 0) { setPlaying(false); hsbGo(st, phase); const d = M.CYCLE.find(([n]) => n === phase)[1]; for (let t = 0; t < u * d; t += 1 / 60) hsbStep(st, 1 / 60); draw(); return hsbReadout(st); } };
`;
  return k.pageHtml({ title: "HSB05 · hanger shot blast cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "hsb05-live.html"), html);
  console.log(`wrote ${join(OUT, "hsb05-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
