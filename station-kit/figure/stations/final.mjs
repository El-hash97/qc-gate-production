// Isometric figure of station Final Proses for the station detail card in /visualisasi.
// Shapes follow the Blender layout: an open booth over the roller line (a back wall and two
// portal frames with a hose rail along their tops), a hand-turned cage of two rings in the
// line that holds the block, a grating over the shot tray under it, a pendant control box
// with an e-stop and the red index lever, and a green rack of air tools. The blow gun on
// the rail's hose blows the last loose shot out of the block's passages onto the grating.
//   node station-kit/figure/stations/final.mjs [outDir]   →   <outDir>/final-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, same scale as HSB05; the line runs along +x, the operator stands at +y)
const PAD = { x: -176, y: -64, w: 352, d: 150, r: 8 };
const WALL_Y = -46;
const PORTAL_X = [-62, 62];
const PORTAL_Y = [WALL_Y + 4, 40];
const TOP_Z = 100;
const RAIL = { y: 6, z: TOP_Z - 6 };
const CONV_Z = 31, CONV_Y = 22;
const IN = [-170, -30], OUTX = [30, 170];
const CAGE = { x0: -17, x1: 17, z: 40, r: 22, t: 3 };
const BLOCK = { w: 24, d: 19, h: 17 };
const GUN = [12, 30, 52]; // blow gun nozzle, in front of the block, aimed at a passage on its front face

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [PAD.x + 30, WALL_Y, TOP_Z + 10], [PAD.x + PAD.w - 30, WALL_Y, TOP_Z + 10], [PORTAL_X[1], PORTAL_Y[1], TOP_Z + 10]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 62 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const seg = (p, q) => k.segment(p, q, P);
const arcX = (x, cy, cz, r, t0 = 0, t1 = 360, n = 72) => Array.from({ length: n + 1 }, (_, i) => {
  const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
  return [x, cy + Math.cos(t) * r, cz + Math.sin(t) * r];
});
const loop = (pts) => k.pathOf(pts.map(at), true);

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // walkway line on the operator side, edge to edge
  out.push(L(k.lineOnTop([PAD.x + 5, 66], [PAD.x + PAD.w - 5, 66], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- booth: back wall with a light panel, two portals, the hose rail ---------
function backWall() {
  const wall = { x: -110, y: WALL_Y, w: 220, d: 4, r: 0.4 };
  const out = [S(slab(wall, 0, TOP_Z + 4, 2, 0.4), { tone: "hi", inner: L(k.sideSeam(wall, 34, P, 2) + k.sideSeam(wall, 68, P, 2), { tone: "faint" }) })];
  // inspection light on the wall behind the cage: a closed panel with its frame screws
  const fy = WALL_Y + 4;
  out.push(S(slab({ x: -30, y: fy, w: 60, d: 2, r: 0.4 }, 70, 14, 2), { tone: "mid", crease: "none" }));
  out.push(L(seg([-26, fy + 2, 77], [26, fy + 2, 77]), { tone: "hi" }));
  out.push(D([[-27, 72], [27, 72], [-27, 82], [27, 82]].map(([x, z]) => at([x, fy + 2, z])), { size: 0.4 }));
  return out.join("");
}

function portal(x, front) {
  const out = [];
  const [y0, y1] = PORTAL_Y;
  const py = front ? y1 : y0;
  out.push(S(slab({ x: x - 5, y: py - 5, w: 10, d: 10, r: 0.6 }, 0, 2, 2), { tone: "mid" }));
  out.push(S(slab({ x: x - 3, y: py - 3, w: 6, d: 6, r: 0.5 }, 2, TOP_Z - 2, 2, 0.4), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 5, y: py - 5, w: 10, d: 10 }, 1.5).map(([a, b]) => at([a, b, 2])), { size: 0.4 }));
  if (front) out.push(S(slab({ x: x - 3, y: y0, w: 6, d: y1 - y0 + 3, r: 0.5 }, TOP_Z, 6, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

function rail() {
  const out = [S(slab({ x: PORTAL_X[0] - 3, y: RAIL.y - 2, w: PORTAL_X[1] - PORTAL_X[0] + 6, d: 4, r: 0.5 }, RAIL.z, 4, 2, 0.4), { tone: "mid" })];
  // hose trolley over the gun, the hose dropping in a coil to it
  const tx = GUN[0] - 2;
  out.push(S(slab({ x: tx - 5, y: RAIL.y - 4, w: 10, d: 8, r: 1 }, RAIL.z - 6, 6, 3, 0.4), { tone: "mid" }));
  out.push(D([at([tx - 3, RAIL.y + 4, RAIL.z - 3]), at([tx + 3, RAIL.y + 4, RAIL.z - 3])], { size: 0.5 }));
  // the kit's coil runs along x or y only, so the hanging coil is a helix round z drawn here
  const helix = Array.from({ length: 7 * 16 + 1 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return at([tx + Math.cos(a) * 3, RAIL.y + 6 + Math.sin(a) * 3, RAIL.z - 10 - (i / (7 * 16)) * (RAIL.z - 76)]);
  });
  out.push(L(k.pathOf(helix), { tone: "lo" }));
  out.push(L(k.pathOf([at([tx, RAIL.y + 6, RAIL.z - 6]), at([tx, RAIL.y + 6, RAIL.z - 10])]) + k.pathOf([at([tx, RAIL.y + 6, 66]), at([GUN[0] + 3, GUN[1] + 6, GUN[2] + 6])]), { tone: "lo" }));
  return out.join("");
}

// ---- roller conveyor ---------------------------------------------------------
function conveyorBack([x0, x1]) {
  const out = [];
  for (const x of [x0 + 8, x1 - 8]) out.push(S(slab({ x: x - 2, y: -CONV_Y - 6, w: 4, d: 4, r: 0.4 }, 0, CONV_Z - 7, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x0, y: -CONV_Y - 4, w: x1 - x0, d: 4, r: 0.5 }, CONV_Z - 8, 9, 2, 0.4), { tone: "mid" }));
  for (let x = x0 + 3; x < x1 - 3; x += 7) out.push(S(slab({ x, y: -CONV_Y, w: 4.6, d: 2 * CONV_Y, r: 2.3 }, CONV_Z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  return out.join("");
}

function conveyorFront([x0, x1]) {
  const out = [];
  for (const x of [x0 + 8, x1 - 8]) {
    out.push(S(slab({ x: x - 4, y: CONV_Y, w: 8, d: 8, r: 0.5 }, 0, 1.4, 2), { tone: "mid" }));
    out.push(S(slab({ x: x - 2, y: CONV_Y + 2, w: 4, d: 4, r: 0.4 }, 1.4, CONV_Z - 8.4, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: x0, y: CONV_Y, w: x1 - x0, d: 4, r: 0.5 }, CONV_Z - 8, 9, 2, 0.4), { tone: "mid" }));
  const n = Math.floor((x1 - x0 - 6) / 7);
  out.push(D(Array.from({ length: n }, (_, i) => at([x0 + 5.3 + i * 7, CONV_Y + 4, CONV_Z - 3])), { size: 0.35, tone: "lo" }));
  return out.join("");
}

// ---- shot tray and grating under the cage ------------------------------------
function tray() {
  const plan = { x: -28, y: -26, w: 56, d: 52, r: 1 };
  const out = [S(slab(plan, 0, 6, 2, 0.5), { tone: "mid" })];
  const grid = [];
  for (let x = plan.x + 5; x < plan.x + plan.w - 2; x += 5) grid.push(k.lineOnTop([x, plan.y + 2], [x, plan.y + plan.d - 2], 6, P));
  grid.push(k.planOutline(k.insetPlan(plan, 2), 6, P));
  out.push(L(grid.join(""), { tone: "faint" }));
  return out.join("");
}

// ---- the hand-turned cage ------------------------------------------------------
function cageStands() {
  const out = [];
  for (const x of [CAGE.x0 - 6, CAGE.x1 + 6]) for (const y of [-14, 14]) {
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.6 }, 6, 6, 2), { tone: "mid" }));
    out.push(`<path class="fnl-ring" d="${loop(arcX(x, y, 14, 4.5))}"/>`);
    out.push(L(loop(arcX(x, y, 14, 4.5)) + loop(arcX(x, y, 14, 1.4, 0, 360, 12)), { tone: "mid" }));
  }
  return out.join("");
}

function ring(x) {
  const { z, r, t } = CAGE;
  const band = (xx, cls) => `<path class="${cls}" fill-rule="evenodd" d="${loop(arcX(xx, 0, z, r + t))}${loop(arcX(xx, 0, z, r))}"/>`;
  const out = [band(x, "fnl-ring fnl-back"), band(x + 3, "fnl-ring")];
  out.push(L(loop(arcX(x + 3, 0, z, r + t)) + loop(arcX(x + 3, 0, z, r)), { tone: "mid" }));
  // index notches every 90°, bolts round the face
  out.push(D([0, 90, 180, 270].map((d) => at(arcX(x + 3, 0, z, r + t + 0.8, d, d, 1)[0])), { size: 0.7, tone: "lo" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at(arcX(x + 3, 0, z, r + t / 2, i * 45 + 22, i * 45 + 22, 1)[0])), { size: 0.45 }));
  return out.join("");
}

function tieBars(front) {
  const { x0, x1, z, r } = CAGE;
  const out = [];
  for (const t of front ? [-45, 225] : [45, 135]) {
    const [, y, zz] = arcX(0, 0, z, r - 1, t, t, 1)[0];
    out.push(S(slab({ x: x0 + 3, y: y - 1.4, w: x1 - x0 - 3, d: 2.8, r: 1.4 }, zz - 1.4, 2.8, 4), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}

function platform() {
  const out = [];
  for (const y of [-12, 8]) out.push(S(slab({ x: CAGE.x0 + 3, y, w: CAGE.x1 - CAGE.x0 - 3, d: 4, r: 0.4 }, CONV_Z - 4, 4, 2), { tone: "mid" }));
  return out.join("");
}

// the index plunger and its red lever on the near ring's bearing stand
function lever() {
  const x = CAGE.x1 + 9;
  const out = [S(slab({ x: x - 2, y: 14, w: 4, d: 6, r: 0.6 }, 12, 10, 2), { tone: "mid" })];
  out.push(L(seg([x, 20, 20], [x + 8, 30, 34]), { tone: "mid" }));
  out.push(S(k.cylinder(x + 8, 30, 2, 33, 5, P, 16, 0.4), { tone: "hi" }));
  return out.join("");
}

// ---- BC block: deck up, four bores, passages on the front face ---------------
function block(cx, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: -d / 2, w, d, r: 1 };
  const z = CONV_Z;
  const top = z + h;
  const ink = lit ? "lit" : "mid";
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, 0, 2.2, top, P, 24)).join(""), { tone: ink }));
  out.push(L(k.sideRing([cx + 6, d / 2, z + 9], 1.6, "y", P, 16) + k.sideRing([cx - 5, d / 2, z + 11], 1.2, "y", P, 14), { tone: ink }));
  return out.join("");
}

// ---- blow gun, its air jet and the shot it chases out -----------------------
function gun() {
  const [x, y, z] = GUN;
  const out = [];
  // the jet: streaks from the nozzle into the passage, fading as they spread
  const target = [6, BLOCK.d / 2, CONV_Z + 9];
  for (let i = -2; i <= 2; i++) out.push(k.fadeLineSvg([at([x - 1, y - 3, z - 2]), at([target[0] + i * 0.8, target[1] + 0.5, target[2] + i * 0.6])], { fade: [0, 0.6], tone: "mid" }));
  // the gun: nozzle, body, grip
  out.push(S(slab({ x: x - 1, y: y - 6, w: 2, d: 6, r: 1 }, z - 3, 2, 3), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x - 2.5, y, w: 5, d: 9, r: 1.5 }, z - 4, 5, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x - 2, y: y + 6, w: 4, d: 4, r: 1 }, z - 12, 9, 3), { tone: "mid" }));
  // loose shot falling out of the block onto the grating
  const drops = [];
  for (let i = 0; i < 9; i++) drops.push(at([-6 + (i % 5) * 4, 4 + (i % 3) * 5, 8 + ((i * 7) % 18)]));
  out.push(D(drops, { size: 0.55, tone: "mid" }));
  return out.join("");
}

// ---- pendant control box on the near portal post, tool rack beside it -------
function controls() {
  const x = PORTAL_X[1];
  const y = PORTAL_Y[1] + 3;
  const out = [S(slab({ x: x - 9, y, w: 18, d: 8, r: 1 }, 52, 22, 3, 0.6), { tone: "mid" })];
  const fy = y + 8;
  out.push(S(k.cylinder(x + 4, y + 4, 3, 74, 3, P, 20, 0.4), { tone: "hi" }));
  out.push(L(k.sideRing([x - 4, fy, 66], 1.8, "y", P) + k.sideRing([x - 4, fy, 59], 1.8, "y", P) + k.sideRing([x + 3, fy, 62], 2.4, "y", P), { tone: "lo" }));
  out.push(D([at([x - 4, fy, 66]), at([x - 4, fy, 59])], { size: 0.7, tone: "mid" }));
  return out.join("");
}

function toolRack() {
  const [x, y] = [-44, 54];
  const out = [S(slab({ x: x - 6, y: y - 6, w: 12, d: 12, r: 0.8 }, 0, 2, 2), { tone: "mid" })];
  out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 2, 46, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: x - 12, y: y - 4, w: 24, d: 8, r: 0.6 }, 48, 3, 2), { tone: "mid" }));
  // three holsters, each with its tool standing in it
  for (const dx of [-8, 0, 8]) {
    out.push(S(k.cylinder(x + dx, y, 2.6, 36, 12, P, 16, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(x + dx, y, 1.4, 51, dx === 0 ? 9 : 6, P, 12, 0.3), { tone: "hi", crease: "none" }));
  }
  return out.join("");
}

const body = [
  floor(),
  backWall(),
  portal(PORTAL_X[0], false),
  portal(PORTAL_X[1], false),
  conveyorBack(IN),
  conveyorFront(IN),
  tray(),
  cageStands(),
  ring(CAGE.x0),
  tieBars(false),
  platform(),
  block(0, { lit: true }),
  tieBars(true),
  ring(CAGE.x1),
  lever(),
  conveyorBack(OUTX),
  block(120),
  conveyorFront(OUTX),
  gun(),
  portal(PORTAL_X[0], true),
  rail(),
  toolRack(),
  portal(PORTAL_X[1], true),
  controls(),
];

const STYLE = `<style>
.iso[data-theme="light"] .fnl-ring{fill:#e9e8e4}.iso[data-theme="light"] .fnl-back{fill:#d4d2cc}
.iso[data-theme="dark"] .fnl-ring{fill:#202020}.iso[data-theme="dark"] .fnl-back{fill:#141414}
.fnl-ring{stroke:none}
</style>`;

const LABEL =
  "Station Final Proses: an open booth over the roller line with a back wall, two portal frames and a hose rail. The block sits in a hand-turned cage over a shot grating; the operator indexes it with a red lever and blows the last loose shot out of its passages with an air gun from the rail, picking finishing tools from the green rack.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `final-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `final-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
