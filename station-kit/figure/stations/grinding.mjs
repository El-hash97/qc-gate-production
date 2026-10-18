// Isometric figure of station Grinding for the station detail card in /visualisasi.
// Shapes follow the Blender layout: an open-fronted grinding booth with a large
// grinding wheel on each side wall, driven by a motor bolted to the outside of the
// wall, a fixture table between them, a wooden screen door at the front and a mesh
// guard rail. A pillar jib manipulator holds the BC block against the left wheel to
// grind the gate and riser stubs flush.
// The live page runs the cycle of grinding-3d.html: lift the block off the stand from HSB06, grind the
// right end on the right wheel, then the left end on the left wheel, and set it on the stand to Hanten.
//   node station-kit/figure/stations/grinding.mjs [outDir]
//     →   <outDir>/grinding-{light,dark}.svg and <outDir>/grinding-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/grinding.mjs --check   runs the cycle model's self-check only
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, about 44 units to the metre; the booth opens towards +y) ---
const PAD = { x: -156, y: -70, w: 300, d: 230, r: 8 };
const BOOTH = { x0: -56, x1: 56, y0: -46, y1: 50, h: 104, t: 4 };
const WHEEL = { x0: -42, x1: -36, y: 12, z: 54, r: 20 }; // left wheel: spindle along x, face towards +x
const BLOCK = { x: -48, y: 33, w: 22, d: 19, h: 17, z: 45 }; // pressed against the wheel's front rim
const POLE = [16, 92]; // off to the right, so the lit block stays in view
const PILLAR = [-128, 128];
const BOOM_Z = 180; // well clear of the roof (110), so the boom reads as passing over it
const STAND_Z = 35;

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

// ---- pillar jib manipulator: pole, steering ring, reach arm, gripper --------
function pillar() {
  const [px, py] = PILLAR;
  const out = [S(slab({ x: px - 10, y: py - 10, w: 20, d: 20, r: 1 }, 0, 3, 2, 0.6), { tone: "mid" })];
  out.push(D(k.corners({ x: px - 10, y: py - 10, w: 20, d: 20 }, 2.5).map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  out.push(S(k.cylinder(px, py, 5, 3, BOOM_Z - 3, P, 32, 0.4), { tone: "mid", crease: "lo" }));
  out.push(S(k.cylinder(px, py, 7.5, BOOM_Z - 4, 4, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(px, py, 7.5, BOOM_Z - 3.5, BOOM_Z - 0.5, 28, P), { tone: "faint" }));
  out.push(S(k.cylinder(px, py, 5.5, BOOM_Z + 8, 6, P, 32, 0.6), { tone: "mid" }));
  // the boom, trolley and everything hanging from them move with the manipulator: grBoom and grHead draw them
  return out.join("");
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

// ---- stands: from HSB06 on the right, to Hanten on the left (0.80 m) -------
function stand([cx, cy]) {
  const plan = { x: cx - 11, y: cy - 11, w: 22, d: 22, r: 1 };
  const out = [];
  for (const [px, py] of byDepth(k.corners(plan, 2), ([px, py]) => [px, py, 0])) out.push(S(slab({ x: px - 1.4, y: py - 1.4, w: 2.8, d: 2.8, r: 0.3 }, 0, STAND_Z - 3, 2), { tone: "mid", crease: "none" }));
  for (const z of [4, STAND_Z - 6]) out.push(L(k.planOutline({ x: plan.x + 2, y: plan.y + 2, w: 18, d: 18, r: 0 }, z, P), { tone: "lo" }));
  out.push(S(slab(plan, STAND_Z - 3, 3, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 10, STAND_Z, 2, P, 40, 0.4), { tone: "mid" }));
  return out.join("");
}

// =============================================================================
// The cycle, as in grinding-3d.html. The model (grStep, grGo) and the moving pieces (grScene and the
// builders it calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the
// kit inlined. The gripper never turns: the block stays square to the booth, and the pole hangs off the
// gripper's right, closer in towards the right wall so the arm clears it.
// =============================================================================
const STAND_IN = [88, 70];
const STAND_OUT = [-88, 70];
const C0 = [BLOCK.x + BLOCK.w / 2, BLOCK.y + BLOCK.d / 2]; // the block centre in the drawing, on the left wheel
const FRONT = 62; // block centre in front of a wheel, clear of the front posts
const M = {
  BLOCK: { w: BLOCK.w, d: BLOCK.d, h: BLOCK.h },
  WHEEL,
  PILLAR,
  BOOM_Z,
  POLE_Y: POLE[1] - C0[1],
  // [x, y, block base] for each waypoint
  AT: {
    in: [STAND_IN[0], STAND_IN[1], STAND_Z + 2],
    inUp: [STAND_IN[0], STAND_IN[1], BLOCK.z],
    frontR: [-C0[0], FRONT, BLOCK.z],
    pressR: [-C0[0], C0[1], BLOCK.z],
    frontL: [C0[0], FRONT, BLOCK.z],
    pressL: [C0[0], C0[1], BLOCK.z],
    outUp: [STAND_OUT[0], STAND_OUT[1], BLOCK.z],
    out: [STAND_OUT[0], STAND_OUT[1], STAND_Z + 2],
  },
  // one cycle as the 3D page: [phase, seconds (0 = until the stubs are gone), from, to]
  CYCLE: [
    ["pick", 1.2, "in", "inUp"],
    ["to right wheel", 2.0, "inUp", "frontR"],
    ["press right", 0.6, "frontR", "pressR"],
    ["grind right", 0, "pressR", "pressR"],
    ["back off", 0.6, "pressR", "frontR"],
    ["to left wheel", 1.4, "frontR", "frontL"],
    ["press left", 0.6, "frontL", "pressL"],
    ["grind left", 0, "pressL", "pressL"],
    ["clear", 0.6, "pressL", "frontL"],
    ["to Hanten", 2.0, "frontL", "outUp"],
    ["set down", 1.0, "outUp", "out"],
    ["return", 2.4, "out", "in"],
  ],
  INSIDE: 63.5, // a block centre further back than this is drawn inside the booth, before the right wall
  // physics (SI), as the 3D page
  D_WHEEL: 0.66,
  N_WHEEL: 1500,
  U_SPEC: 40e9, // J/m3, specific grinding energy of grey iron
  V_END: 2 * Math.PI * 0.015 ** 2 * 0.008, // two 30 mm x 8 mm riser stubs per end
  TIME_K: 15, // grinding shown 15x fast
};

const approach = (a, b, tau, dt) => b + (a - b) * Math.exp(-dt / tau);
const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function grSolve(Fn, mu, n) {
  const v = (Math.PI * M.D_WHEEL * n) / 60;
  const Ft = mu * Fn;
  const Pw = Ft * v;
  return { v, Ft, P: Pw, Q: Pw / M.U_SPEC };
}

function grState() {
  return { step: 0, pt: 0, n: 0, mu: 0.4, push: 250, removed: 0, v: 0, P: 0, Q: 0 };
}

// jump to the start of a step, with this share of the stubs already gone
function grGo(st, name, removed) {
  st.step = M.CYCLE.findIndex((c) => c[0] === name);
  st.pt = 0;
  st.removed = removed ?? (["back off", "to left wheel", "press left", "grind left"].includes(name) ? 0.5 : ["clear", "to Hanten", "set down", "return"].includes(name) ? 1 : 0);
}

function grStep(st, dt) {
  const [phase, dur] = M.CYCLE[st.step];
  st.pt += dt;
  st.n = approach(st.n, M.N_WHEEL, 0.8, dt);
  const grinding = phase === "grind right" || phase === "grind left";
  const sol = grSolve(grinding ? st.push : 0, st.mu, st.n);
  st.v = sol.v;
  st.P = sol.P;
  st.Q = sol.Q;
  if (grinding) {
    const goal = phase === "grind right" ? 0.5 : 1;
    st.removed = Math.min(goal, st.removed + (st.Q * M.TIME_K * dt) / (2 * M.V_END));
    if (st.removed >= goal - 1e-6) {
      st.step++;
      st.pt = 0;
    }
  } else if (st.pt >= dur) {
    st.step = (st.step + 1) % M.CYCLE.length;
    st.pt = 0;
    if (st.step === 0) st.removed = 0;
  }
}

// where the gripper is: block centre, block base, and how far into the step
function grPose(st) {
  const [phase, dur, from, to] = M.CYCLE[st.step];
  const u = dur ? Math.min(1, st.pt / dur) : 0;
  const e = u * u * (3 - 2 * u);
  const a = M.AT[from];
  const b = M.AT[to];
  return { phase, u, c: [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e], z: a[2] + (b[2] - a[2]) * e, removed: st.removed };
}

// the BC block: c its centre, z its base; the riser stub on the front face goes as the left end is ground
function grBlock(c, z, stub) {
  const { w, d, h } = M.BLOCK;
  const x = c[0] - w / 2;
  const y = c[1] - d / 2;
  const plan = { x, y, w, d, r: 1 };
  const top = z + h;
  const out = [k.solidSvg(k.slabOf(plan, z, h, P, 2, 0.6), { tone: "hi", crease: "lo", lit: true, inner: k.lineSvg(k.sideSeam(plan, z + 6, P, 2), { tone: "lit" }) })];
  out.push(k.lineSvg([0, 1, 2, 3].map((i) => k.ring(x + 3.8 + i * 4.8, c[1], 2, top, P, 24)).join(""), { tone: "lit" }));
  const ring = k.lineSvg(k.sideRing([x + w - 5, y + d, z + 9], 2.2, "y", P, 20), { tone: "lit" });
  out.push(stub >= 0.999 ? ring : stub > 0.001 ? `<g opacity="${stub.toFixed(3)}">${ring}</g>` : "");
  return out.join("");
}

// the far jaw, behind the block
function grJawBack(c, z) {
  const { w, d, h } = M.BLOCK;
  const x = c[0] - w / 2;
  const y = c[1] - d / 2;
  return k.solidSvg(k.slabOf({ x: x - 4, y: y + 4, w: 3, d: d - 8, r: 0.4 }, z + 4, h + 1, P, 2, 0.5), { tone: "mid" });
}

// where the pole hangs: off the gripper's right, less far as it nears the right wall
function grPole(c) {
  return [c[0] + Math.min(53, Math.max(12, 32.5 - (c[0] * 20.5) / 37)), c[1] + M.POLE_Y];
}

// reach arm, near jaw, head bar, the pole up to the trolley and the steering ring round it
function grHead(c, z) {
  const { w, d, h } = M.BLOCK;
  const x = c[0] - w / 2;
  const y = c[1] - d / 2;
  const cy = c[1];
  const armZ = z + h + 6;
  const [px, py] = grPole(c);
  const sl = (plan, z0, hh, bevel = 0.5) => k.slabOf(plan, z0, hh, P, 2, bevel);
  const out = [];
  out.push(k.solidSvg(sl({ x: x + w + 1, y: cy - 2.4, w: px - x - w + 1.4, d: 4.8, r: 0.5 }, armZ, 5, 0.4), { tone: "mid" }));
  out.push(k.solidSvg(sl({ x: px - 2.4, y: cy - 2.4, w: 4.8, d: py - cy + 2.4, r: 0.5 }, armZ, 5, 0.4), { tone: "mid" }));
  out.push(k.solidSvg(sl({ x: x + w + 1, y: cy - 3, w: 3, d: 6, r: 0.4 }, z + h + 1, armZ - z - h - 1), { tone: "mid" }));
  out.push(k.solidSvg(sl({ x: x - 4, y: y + d / 2 - 2, w: w + 8, d: 4, r: 0.5 }, z + h + 1, 3, 0.4), { tone: "mid" }));
  out.push(k.solidSvg(sl({ x: x + w + 1, y: y + 4, w: 3, d: d - 8, r: 0.4 }, z + 4, h + 1), { tone: "mid" }));
  out.push(k.dotsSvg([k.iso([x + w + 4, y + 7, z + 10], P), k.iso([x + w + 4, y + d - 7, z + 10], P)], { size: 0.45 }));
  out.push(k.solidSvg(sl({ x: px - 1.6, y: py - 1.6, w: 3.2, d: 3.2, r: 0.4 }, armZ, 28, 0.3), { tone: "hi", crease: "none" }));
  out.push(k.solidSvg(sl({ x: px - 3.4, y: py - 3.4, w: 6.8, d: 6.8, r: 0.8 }, armZ + 24, 4, 0.4), { tone: "mid" }));
  out.push(k.solidSvg(sl({ x: px - 2.4, y: py - 2.4, w: 4.8, d: 4.8, r: 0.6 }, armZ + 28, M.BOOM_Z - 6 - armZ - 28, 0.3), { tone: "mid" }));
  out.push(k.lineSvg(k.ring(px, py, 11, armZ + 16, P, 48) + k.ring(px, py, 9.6, armZ + 16, P, 48), { tone: "mid" }));
  out.push(k.lineSvg([0, 1, 2].map((i) => {
    const a = (i * 2 * Math.PI) / 3 + 0.4;
    return k.segment([px + Math.cos(a) * 1.6, py + Math.sin(a) * 1.6, armZ + 16], [px + Math.cos(a) * 9.6, py + Math.sin(a) * 9.6, armZ + 16], P);
  }).join(""), { tone: "lo" }));
  return out.join("");
}

// boom from the pillar out past the pole, its tie, the trolley under it
function grBoom(c) {
  const [px, py] = M.PILLAR;
  const [qx, qy] = grPole(c);
  const len = Math.hypot(qx - px, qy - py);
  const dir = [(qx - px) / len, (qy - py) / len];
  const tip = [qx + dir[0] * 10, qy + dir[1] * 10];
  const o = [-dir[1] * 3, dir[0] * 3];
  const out = [k.solidSvg(k.extrude([[px + o[0], py + o[1]], [tip[0] + o[0], tip[1] + o[1]], [tip[0] - o[0], tip[1] - o[1]], [px - o[0], py - o[1]]], M.BOOM_Z, 8, P, { bevel: 0.4 }), { tone: "mid" })];
  out.push(k.lineSvg(k.segment([px, py, M.BOOM_Z + 14], [(px + qx) / 2, (py + qy) / 2, M.BOOM_Z + 8], P), { tone: "mid" }));
  out.push(k.dotsSvg([k.iso([(px + qx) / 2, (py + qy) / 2, M.BOOM_Z + 8], P)], { size: 0.6 }));
  out.push(k.solidSvg(k.slabOf({ x: qx - 6, y: qy - 6, w: 12, d: 12, r: 1 }, M.BOOM_Z - 6, 6, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

// sparks thrown down and forward off the left wheel's rim where the block bears on it (the right
// wheel's are behind the right wall)
function grSparks() {
  const c = [M.WHEEL.x1 - 2, M.WHEEL.y + M.WHEEL.r, M.WHEEL.z - 3];
  const out = [];
  for (let i = 0; i < 9; i++) {
    const a = (-70 - i * 6) * (Math.PI / 180);
    const len = 10 + (i % 3) * 5;
    const from = [c[0] + (i - 4) * 0.6, c[1] + 2, c[2] - 1];
    const to = [from[0] + (i - 4) * 1.2, from[1] + Math.cos(a) * len * 0.6 + 6, from[2] + Math.sin(a) * len];
    out.push(k.fadeLineSvg([k.iso(from, P), k.iso(to, P)], { fade: [0, 1], tone: "mid" }));
  }
  return out.join("");
}

// everything that moves, for a pose
function grScene(pose) {
  const { phase, u, c, z, removed } = pose;
  const stub = Math.min(1, Math.max(0, (1 - removed) * 2));
  const fade = (alpha, svg) => (alpha <= 0.001 ? "" : alpha >= 0.999 ? svg : `<g opacity="${alpha.toFixed(3)}">${svg}</g>`);
  // the block rides in the gripper; it stays on the Hanten stand at the end and a new one comes from HSB06
  const block = phase === "return" ? "" : fade(phase === "pick" ? smooth01(0, 0.4, u) : 1, grBlock(c, z, stub));
  const left = fade(phase === "return" ? 1 - smooth01(0.3, 0.8, u) : 0, grBlock(M.AT.out, M.AT.out[2], stub));
  const work = grJawBack(c, z) + block + (phase === "grind left" ? grSparks() : "") + grHead(c, z);
  const inside = c[1] < M.INSIDE;
  return { phase, inside: inside ? work : "", outside: inside ? "" : work, left, boom: grBoom(c) };
}

const SAY = { pick: "lifting from the HSB06 stand", "to right wheel": "to the right wheel", "press right": "pressing in", "grind right": "grinding the right stubs", "back off": "backing off", "to left wheel": "across to the left wheel", "press left": "pressing in", "grind left": "grinding the left stubs", clear: "clearing the wheel", "to Hanten": "on to Hanten", "set down": "setting down", return: "back for the next block" };
const STEPS = { pick: "Pick", "to right wheel": "To right", "press right": "Press", "grind right": "Grind R", "back off": "Back off", "to left wheel": "To left", "press left": "Press", "grind left": "Grind L", clear: "Clear", "to Hanten": "To Hanten", "set down": "Set down", return: "Return" };

function grReadout(st) {
  return `${SAY[M.CYCLE[st.step][0]]} · stubs removed ${Math.round(st.removed * 100)}%`;
}

function grNumbers(st) {
  const f = (x) => Math.round(x).toLocaleString("en-US");
  return `push ${f(st.push)} N · wheel ${f(st.n)} rpm, ${f(st.v)} m/s · ${(st.P / 1000).toFixed(1)} kW into the cut · ${f(st.Q * 1e9)} mm³/s`;
}

// ---- self-check: a cycle visits every step in order and grinds both ends flush
{
  const st = grState();
  const seen = [];
  let flush = false;
  for (let i = 0; i < 60 * 120 && !(seen.length > 1 && st.step === 0); i++) {
    grStep(st, 1 / 60);
    const ph = M.CYCLE[st.step][0];
    if (seen.at(-1) !== ph) seen.push(ph);
    if (st.removed >= 1 - 1e-6) flush = true;
  }
  const want = M.CYCLE.map((c) => c[0]);
  if (JSON.stringify(seen.slice(0, want.length)) !== JSON.stringify(want)) throw new Error(`cycle order ${seen.join(" → ")}`);
  if (!flush) throw new Error("the stubs were never ground flush");
  console.log(`cycle check passed (${want.join(" → ")})`);
}

// ---- the drawing, with slots for the moving pieces --------------------------------
function sceneBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    motor(BOOTH.x0, -1),
    backWall(),
    sideWall(BOOTH.x0),
    table(),
    roof(),
    wheel(),
    slot("inside", f.inside),
    sideWall(BOOTH.x1 - BOOTH.t),
    motor(BOOTH.x1, 1),
    screen(),
    stand(STAND_OUT),
    stand(STAND_IN),
    slot("left", f.left),
    slot("outside", f.outside),
    pillar(),
    slot("boom", f.boom),
    guardRail(),
  ];
}

// the still image is the approved drawing: the block held against the left wheel, half its stubs gone
const STILL = { phase: "grind left", u: 0, c: C0, z: BLOCK.z, removed: 0.5 };
const body = sceneBody(grScene(STILL));

const STYLE = `<style>
.iso[data-theme="light"] .grd-wheel{fill:#d6d4cf}.iso[data-theme="light"] .grd-face{fill:#c9c6bf}.iso[data-theme="light"] .grd-hood{fill:#ecebe7}
.iso[data-theme="dark"] .grd-wheel{fill:#1d1d1d}.iso[data-theme="dark"] .grd-face{fill:#262626}.iso[data-theme="dark"] .grd-hood{fill:#141414}
.grd-wheel,.grd-hood{stroke:none}
</style>`;

const LABEL =
  "Station Grinding: an open-fronted booth with a large grinding wheel on each side wall, each driven by a motor bolted outside the wall, and a fixture table at the back. A pillar jib manipulator holds the BC block against the left wheel's rim to grind the gate and riser stubs flush, throwing sparks onto the guard mat.";

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...body], standalone: theme });
    writeFileSync(join(OUT, `grinding-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `grinding-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

// ---- live page ------------------------------------------------------------------------
function livePage() {
  const st = grState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [STYLE, ...sceneBody(grScene(grPose(st)))] });
  const steps = M.CYCLE.map(([ph]) => `<button type="button" data-go="${ph}">${STEPS[ph]}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
<label class="bari-p">Push force <input type="range" min="100" max="400" step="10" value="250" aria-label="Push force, N"><output>250 N</output></label>
<div class="bari-num" data-numbers>${grNumbers(st)}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "Grinding",
    title: "Stub grinding cycle",
    hint: "Click to pause",
    readout: grReadout(st),
    body: `<div class="iso-stage" tabindex="0" aria-label="Grinding cycle, click or press space to pause">${svg}</div>`,
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
.bari-p output{min-width:48px;font-variant-numeric:tabular-nums}
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
  const fns = [approach, smooth01, grSolve, grState, grGo, grStep, grPose, grBlock, grJawBack, grPole, grHead, grBoom, grSparks, grScene, grReadout, grNumbers].map((fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`));
  const live = `
const k = { iso, segment, ring, sideRing, sideSeam, extrude, slabOf, solidSvg, lineSvg, dotsSvg, fadeLineSvg };
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(M)};
const SAY = ${JSON.stringify(SAY)};
${fns.join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slots = ["inside", "left", "outside", "boom"].reduce((o, n) => ((o[n] = svg.querySelector('[data-slot="' + n + '"]')), o), {});
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const range = document.querySelector(".bari-p input");
const rangeOut = document.querySelector(".bari-p output");
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = grState();
if (still.matches) grGo(st, "grind left", 0.5);
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = grScene(grPose(st));
  for (const n in slots) html(slots[n], f[n]);
  const text = grReadout(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = grNumbers(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of stepBtns) if (b.dataset.go === f.phase) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  grStep(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { grGo(st, b.dataset.go); draw(); });
range.addEventListener("input", () => { st.push = Number(range.value); rangeOut.textContent = st.push + " N"; draw(); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setPlaying(playing);
draw();
// review shots: __grind.at("to right wheel", 0.5) pauses that far into that step (grinding steps: share of the stubs gone)
window.__grind = { at(phase, u = 0) { setPlaying(false); st.n = M.N_WHEEL; grGo(st, phase); const c = M.CYCLE[st.step]; if (c[1]) st.pt = u * c[1]; else st.removed += u * 0.5; draw(); return grReadout(st); } };
`;
  return k.pageHtml({ title: "Grinding · stub grinding cycle", theme: "light", body: css + plate + controls, script: kitScript() + live, width: 640 });
}

// the kit as plain script: the page draws with the same functions as the build
function kitScript() {
  return readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

if (!CHECK) {
  const html = livePage();
  writeFileSync(join(OUT, "grinding-live.html"), html);
  console.log(`wrote ${join(OUT, "grinding-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
