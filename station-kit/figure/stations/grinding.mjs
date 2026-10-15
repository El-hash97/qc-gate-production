// Isometric figure of station Grinding for the station detail card in /visualisasi.
// Shapes follow the Blender layout: an open-fronted grinding booth with a large
// grinding wheel on each side wall, driven by a motor bolted to the outside of the
// wall, a fixture table between them, a wooden screen door at the front and a mesh
// guard rail. A pillar jib manipulator holds the BC block against the left wheel to
// grind the gate and riser stubs flush.
//   node station-kit/figure/stations/grinding.mjs [outDir]   →   <outDir>/grinding-{light,dark}.svg
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const OUT = resolve(process.argv[2] ?? "public/stations");
mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, about 44 units to the metre; the booth opens towards +y) ---
const PAD = { x: -156, y: -70, w: 300, d: 230, r: 8 };
const BOOTH = { x0: -56, x1: 56, y0: -46, y1: 50, h: 104, t: 4 };
const WHEEL = { x0: -42, x1: -36, y: 12, z: 54, r: 20 }; // left wheel: spindle along x, face towards +x
const BLOCK = { x: -48, y: 33, w: 22, d: 19, h: 17, z: 45 }; // pressed against the wheel's front rim
const POLE = [16, 92]; // off to the right, so the lit block stays in view
const PILLAR = [-128, 128];
const BOOM_Z = 150;
const ARM_Z = BLOCK.z + BLOCK.h + 6;

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [BOOTH.x0, BOOTH.y0, BOOTH.h + 8], [BOOTH.x1 + 30, BOOTH.y0, BOOTH.h + 8], [PILLAR[0], PILLAR[1], BOOM_Z + 20], [POLE[0], POLE[1], BOOM_Z + 20]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const seg = (p, q) => k.segment(p, q, P);
const shape = (points, cls) => `<path class="${cls}" d="${k.pathOf(points.map(at), true)}"/>`;
const byDepth = (list, of = (p) => p) => [...list].sort((a, b) => k.depthOf(of(a), P) - k.depthOf(of(b), P));
// points round a circle in the y-z plane at x (t in degrees, 0 = +y, 90 = up)
const arcX = (x, cy, cz, r, t0, t1, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
  return [x, cy + Math.cos(t) * r, cz + Math.sin(t) * r];
});

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // spark guard mat in front of the wheel
  out.push(L(k.planOutline({ x: BOOTH.x0 + 6, y: 24, w: 60, d: 46, r: 0 }, 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- the booth: back wall, side walls, roof with a lintel over the opening ---
function backWall() {
  const { x0, x1, y0, h, t } = BOOTH;
  const plan = { x: x0, y: y0, w: x1 - x0, d: t, r: 0.4 };
  return S(slab(plan, 0, h, 2, 0.4), { tone: "hi", inner: L(k.sideSeam(plan, 36, P, 2) + k.sideSeam(plan, 70, P, 2), { tone: "faint" }) });
}

function sideWall(x) {
  const { y0, y1, h, t } = BOOTH;
  const plan = { x, y: y0 + t, w: t, d: y1 - y0 - t, r: 0.4 };
  const out = [S(slab(plan, 0, h, 2, 0.4), { tone: "hi", inner: L(k.sideSeam(plan, 36, P, 2) + k.sideSeam(plan, 70, P, 2), { tone: "faint" }) })];
  // front post capping the wall
  out.push(S(slab({ x: x - 2, y: y1 - 4, w: t + 4, d: 8, r: 0.6 }, 0, h, 2, 0.4), { tone: "mid" }));
  out.push(D([16, 40, 64, 88].map((z) => at([x + t / 2, y1 + 4, z])), { size: 0.45 }));
  return out.join("");
}

function roof() {
  const { x0, x1, y0, y1, h } = BOOTH;
  const out = [S(slab({ x: x0 - 3, y: y0 - 3, w: x1 - x0 + 6, d: y1 - y0 + 8, r: 1 }, h, 6, 3, 0.6), { tone: "mid" })];
  out.push(S(slab({ x: x0, y: y1 - 4, w: x1 - x0, d: 8, r: 0.6 }, h - 12, 12, 2, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: x0, y: y1 - 4, w: x1 - x0, d: 8, r: 0.6 }, h - 6, P, 2), { tone: "faint" }) }));
  // extraction hood on the roof, over the wheel
  out.push(S(slab({ x: -46, y: -20, w: 24, d: 24, r: 2 }, h + 6, 10, 3, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(-34, -8, 7, h + 16, 14, P, 32, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(-34, -8, 7, h + 18, h + 28, 20, P), { tone: "faint" }));
  return out.join("");
}

// ---- grinding wheel on the left wall, its guard, flange and spindle ----------
function wheel() {
  const { x0, x1, y, z, r } = WHEEL;
  const out = [];
  // spindle housing on the wall, out to the wheel
  out.push(S(slab({ x: BOOTH.x0 + BOOTH.t, y: y - 6, w: x0 - BOOTH.x0 - BOOTH.t, d: 12, r: 2 }, z - 6, 12, 3, 0.4), { tone: "mid" }));
  // the wheel: back face, then the front face, the rim between them
  out.push(shape(arcX(x0, y, z, r, 0, 360, 72), "grd-wheel"));
  out.push(shape(arcX(x1, y, z, r, 0, 360, 72), "grd-wheel grd-face"));
  out.push(L(k.pathOf(arcX(x1, y, z, r, 0, 360, 72).map(at), true), { tone: "mid" }));
  out.push(L(k.pathOf(arcX(x1, y, z, r - 2.5, 0, 360, 72).map(at), true) + k.pathOf(arcX(x1, y, z, r - 7, 0, 360, 72).map(at), true), { tone: "faint" }));
  // flange and arbor nut
  out.push(L(k.sideRing([x1 + 0.6, y, z], 5, "x", P, 28), { tone: "mid" }));
  out.push(L(k.sideRing([x1 + 1.2, y, z], 2.2, "x", P, 6), { tone: "lo" }));
  out.push(D([at([x1 + 1.2, y, z])], { size: 0.6 }));
  // guard: a hood over the top and back of the wheel, open at the front where the work goes
  const hoodOuter = arcX(x1 + 2, y, z, r + 4, 40, 230, 40);
  const hoodInner = arcX(x1 + 2, y, z, r + 1.5, 230, 40, 40);
  out.push(shape([...hoodOuter, ...hoodInner], "grd-hood"));
  out.push(L(k.pathOf([...hoodOuter, ...hoodInner].map(at), true), { tone: "mid" }));
  out.push(D([60, 120, 180].map((t) => at(arcX(x1 + 2, y, z, r + 2.8, t, t, 1)[0])), { size: 0.4 }));
  // tool rest under the front rim
  out.push(S(slab({ x: x0 - 3, y: y + r + 1, w: 10, d: 4, r: 0.4 }, z - 14, 3, 2), { tone: "mid" }));
  return out.join("");
}

// sparks thrown down and forward off the rim where the block bears on it
function sparks() {
  const c = [WHEEL.x1 - 2, WHEEL.y + WHEEL.r, WHEEL.z - 3];
  const out = [];
  for (let i = 0; i < 9; i++) {
    const a = (-70 - i * 6) * (Math.PI / 180);
    const len = 10 + (i % 3) * 5;
    const from = [c[0] + (i - 4) * 0.6, c[1] + 2, c[2] - 1];
    const to = [from[0] + (i - 4) * 1.2, from[1] + Math.cos(a) * len * 0.6 + 6, from[2] + Math.sin(a) * len];
    out.push(k.fadeLineSvg([at(from), at(to)], { fade: [0, 1], tone: "mid" }));
  }
  return out.join("");
}

// ---- motor on the outside of a side wall: finned body, end cap, terminal box -
function motor(x, side) {
  const y = WHEEL.y;
  const z = WHEEL.z;
  const x0 = side < 0 ? x - 30 : x;
  const body = { x: x0, y: y - 11, w: 30, d: 22, r: 4 };
  const out = [S(slab({ x: x0 + 4, y: y - 14, w: 22, d: 28, r: 1 }, z - 22, 4, 2, 0.4), { tone: "mid" })];
  out.push(S(slab({ x: x0 + 8, y: y - 4, w: 14, d: 8, r: 0.6 }, 0, z - 22, 2, 0.4), { tone: "mid" }));
  const fins = Array.from({ length: 5 }, (_, i) => seg([x0 + 3, y + 11, z - 7 + i * 3.5], [x0 + 27, y + 11, z - 7 + i * 3.5])).join("");
  out.push(S(slab(body, z - 11, 22, 4, 0.6), { tone: "mid", inner: L(fins, { tone: "faint" }) }));
  const ex = side < 0 ? x0 : x0 + 30;
  out.push(L(k.sideRing([ex, y, z], 8, "x", P, 32) + k.sideRing([ex, y, z], 4, "x", P, 24), { tone: "lo" }));
  out.push(S(slab({ x: x0 + 10, y: y - 5, w: 10, d: 10, r: 0.6 }, z + 11, 6, 2), { tone: "mid" }));
  out.push(D(k.corners({ x: x0 + 10, y: y - 5, w: 10, d: 10 }, 1.5).map(([px, py]) => at([px, py, z + 17])), { size: 0.4 }));
  return out.join("");
}

// ---- fixture table at the back: a gauge plate with a datum stop -------------
function table() {
  const plan = { x: -10, y: -36, w: 40, d: 26, r: 1 };
  const out = [];
  for (const [x, y] of byDepth(k.corners(plan, 3), ([x, y]) => [x, y, 0])) out.push(S(slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.4 }, 0, 36, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab(plan, 36, 4, 2, 0.5), { tone: "mid" }));
  out.push(L(k.topTicks(-8, 28, 3, 4, plan.y + plan.d - 3, 40, [1.2, 2.4], P).minor, { tone: "lo" }));
  out.push(S(slab({ x: -8, y: -34, w: 4, d: 22, r: 0.4 }, 40, 6, 2), { tone: "mid" }));
  out.push(S(slab({ x: 4, y: -30, w: 18, d: 14, r: 0.6 }, 40, 2, 2), { tone: "lo", crease: "none" }));
  return out.join("");
}

// ---- BC block held against the wheel ----------------------------------------
function block() {
  const { x, y, w, d, h, z } = BLOCK;
  const plan = { x, y, w, d, r: 1 };
  const top = z + h;
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit: true, inner: L(k.sideSeam(plan, z + 6, P, 2), { tone: "lit" }) })];
  const cy = y + d / 2;
  const bores = [0, 1, 2, 3].map((i) => x + 3.8 + i * 4.8);
  out.push(L(bores.map((bx) => k.ring(bx, cy, 2, top, P, 24)).join(""), { tone: "lit" }));
  // a riser stub still standing proud on the front face
  out.push(L(k.sideRing([x + w - 5, y + d, z + 9], 2.2, "y", P, 20), { tone: "lit" }));
  return out.join("");
}

// ---- pillar jib manipulator: pole, steering ring, reach arm, gripper --------
function pillar() {
  const [px, py] = PILLAR;
  const out = [S(slab({ x: px - 10, y: py - 10, w: 20, d: 20, r: 1 }, 0, 3, 2, 0.6), { tone: "mid" })];
  out.push(D(k.corners({ x: px - 10, y: py - 10, w: 20, d: 20 }, 2.5).map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(px, py, 5, 3, BOOM_Z - 3, P, 32, 0.4), { tone: "mid", crease: "lo" }));
  out.push(S(k.cylinder(px, py, 7.5, BOOM_Z - 4, 4, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(px, py, 7.5, BOOM_Z - 3.5, BOOM_Z - 0.5, 28, P), { tone: "faint" }));
  out.push(S(k.cylinder(px, py, 5.5, BOOM_Z + 8, 6, P, 32, 0.6), { tone: "mid" }));
  // boom out past the pole, trolley under it
  const [qx, qy] = POLE;
  const len = Math.hypot(qx - px, qy - py);
  const dir = [(qx - px) / len, (qy - py) / len];
  const tip = [qx + dir[0] * 10, qy + dir[1] * 10];
  const o = [-dir[1] * 3, dir[0] * 3];
  out.push(S(k.extrude([[px + o[0], py + o[1]], [tip[0] + o[0], tip[1] + o[1]], [tip[0] - o[0], tip[1] - o[1]], [px - o[0], py - o[1]]], BOOM_Z, 8, P, { bevel: 0.4 }), { tone: "mid" }));
  out.push(L(seg([px, py, BOOM_Z + 14], [(px + qx) / 2, (py + qy) / 2, BOOM_Z + 8]), { tone: "mid" }));
  out.push(D([at([(px + qx) / 2, (py + qy) / 2, BOOM_Z + 8])], { size: 0.6 }));
  out.push(S(slab({ x: qx - 6, y: qy - 6, w: 12, d: 12, r: 1 }, BOOM_Z - 6, 6, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

function manipulator() {
  const [px, py] = POLE;
  const { x, y, w, d, h, z } = BLOCK;
  const out = [];
  // reach arm: from the pole back towards the booth, then across to the near jaw
  const cy = y + d / 2;
  out.push(S(slab({ x: x + w + 1, y: cy - 2.4, w: px - x - w + 1.4, d: 4.8, r: 0.5 }, ARM_Z, 5, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: px - 2.4, y: cy - 2.4, w: 4.8, d: py - cy + 2.4, r: 0.5 }, ARM_Z, 5, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x + w + 1, y: cy - 3, w: 3, d: 6, r: 0.4 }, z + h + 1, ARM_Z - z - h - 1, 2), { tone: "mid" }));
  out.push(S(slab({ x: x - 4, y: y + d / 2 - 2, w: w + 8, d: 4, r: 0.5 }, z + h + 1, 3, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x + w + 1, y: y + 4, w: 3, d: d - 8, r: 0.4 }, z + 4, h + 1, 2), { tone: "mid" }));
  out.push(D([at([x + w + 4, y + 7, z + 10]), at([x + w + 4, y + d - 7, z + 10])], { size: 0.45 }));
  // pole up to the trolley, steering ring round it
  out.push(S(slab({ x: px - 1.6, y: py - 1.6, w: 3.2, d: 3.2, r: 0.4 }, ARM_Z, 96 - ARM_Z, 2, 0.3), { tone: "hi", crease: "none" }));
  out.push(S(slab({ x: px - 3.4, y: py - 3.4, w: 6.8, d: 6.8, r: 0.8 }, 92, 4, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: px - 2.4, y: py - 2.4, w: 4.8, d: 4.8, r: 0.6 }, 96, BOOM_Z - 102, 2, 0.3), { tone: "mid" }));
  out.push(L(k.ring(px, py, 11, 84, P, 48) + k.ring(px, py, 9.6, 84, P, 48), { tone: "mid" }));
  out.push(L([0, 1, 2].map((i) => {
    const a = (i * 2 * Math.PI) / 3 + 0.4;
    return seg([px + Math.cos(a) * 1.6, py + Math.sin(a) * 1.6, 84], [px + Math.cos(a) * 9.6, py + Math.sin(a) * 9.6, 84]);
  }).join(""), { tone: "lo" }));
  return out.join("");
}

// the far jaw, behind the block
function jawBack() {
  const { x, y, d, h, z } = BLOCK;
  return S(slab({ x: x - 4, y: y + 4, w: 3, d: d - 8, r: 0.4 }, z + 4, h + 1, 2), { tone: "mid" });
}

// ---- wooden screen door swung open at the front left, and the mesh guard ----
function screen() {
  const y = BOOTH.y1 + 4;
  const plan = { x: BOOTH.x0 - 52, y, w: 48, d: 3, r: 0.4 };
  const out = [S(slab(plan, 4, 92, 2, 0.4), { tone: "mid" })];
  const fy = y + 3;
  const panels = [];
  for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) {
    const x0 = plan.x + 5 + c * 20;
    const z0 = 12 + r * 27;
    panels.push(k.pathOf([at([x0, fy, z0]), at([x0 + 17, fy, z0]), at([x0 + 17, fy, z0 + 23]), at([x0, fy, z0 + 23])], true));
  }
  out.push(L(panels.join(""), { tone: "lo" }));
  for (const z of [16, 84]) out.push(S(k.cylinder(BOOTH.x0 - 4, y + 1.5, 1.8, z, 7, P, 12), { tone: "mid" }));
  out.push(S(slab({ x: plan.x + 3, y: fy, w: 3, d: 2.4, r: 0.6 }, 44, 12, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function guardRail() {
  const y = 112;
  const [x0, x1] = [-4, 136];
  const out = [];
  for (const x of [x0, (x0 + x1) / 2, x1]) {
    out.push(S(slab({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.5 }, 0, 1.4, 2), { tone: "mid" }));
    out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.4 }, 1.4, 46.6, 2, 0.3), { tone: "mid" }));
  }
  for (const z of [4, 46]) out.push(S(slab({ x: x0 - 1.6, y: y - 1.6, w: x1 - x0 + 3.2, d: 3.2, r: 0.4 }, z, 3, 2, 0.3), { tone: "mid" }));
  // mesh infill: diagonals from rail to rail, each ending on the rails
  const mesh = [];
  for (let x = x0 + 6; x < x1 - 4; x += 6) mesh.push(seg([x, y + 1.6, 7], [Math.min(x + 6, x1), y + 1.6, 46]), seg([Math.min(x + 6, x1), y + 1.6, 7], [x, y + 1.6, 46]));
  out.push(L(mesh.join(""), { tone: "faint" }));
  return out.join("");
}

const body = [
  floor(),
  motor(BOOTH.x0, -1),
  backWall(),
  sideWall(BOOTH.x0),
  table(),
  roof(),
  wheel(),
  jawBack(),
  block(),
  sparks(),
  manipulator(),
  sideWall(BOOTH.x1 - BOOTH.t),
  motor(BOOTH.x1, 1),
  screen(),
  pillar(),
  guardRail(),
];

const STYLE = `<style>
.iso[data-theme="light"] .grd-wheel{fill:#d6d4cf}.iso[data-theme="light"] .grd-face{fill:#c9c6bf}.iso[data-theme="light"] .grd-hood{fill:#ecebe7}
.iso[data-theme="dark"] .grd-wheel{fill:#1d1d1d}.iso[data-theme="dark"] .grd-face{fill:#262626}.iso[data-theme="dark"] .grd-hood{fill:#141414}
.grd-wheel,.grd-hood{stroke:none}
</style>`;

const LABEL =
  "Station Grinding: an open-fronted booth with a large grinding wheel on each side wall, each driven by a motor bolted outside the wall, and a fixture table at the back. A pillar jib manipulator holds the BC block against the left wheel's rim to grind the gate and riser stubs flush, throwing sparks onto the guard mat.";

for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
  writeFileSync(join(OUT, `grinding-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `grinding-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
