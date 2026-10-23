// Isometric figure of station Line Repair (rework benches) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a fenced area across the factory road with a wall
// at the back, two workbenches against it with a vise on each, a yellow safety fence in front and
// the pallet of Repair blocks from QC Gate 2; the out pallet back to QC Gate 2 is an interpretation.
// The live page runs the shift of repair-3d.html at 60x (a second is a minute on the floor): Repair blocks arrive
// at lambda = share x 300 blocks/h onto the in pallet, the two benches take them one at a time (rework about
// 8 min, M/M/2: Erlang C gives the chance a block waits), a hand grinder works the block on its bench, and a
// full out pallet goes back to QC Gate 2. "One bench down" leaves a single server.
//   node station-kit/figure/stations/repair.mjs [outDir]
//     →   <outDir>/repair-{light,dark}.svg and <outDir>/repair-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/repair.mjs --check   runs the queue model's self-check only
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";
import { liveHtml } from "../live-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, 50 units a metre like the other stations; the wall at the back, -y)
const PAD = { x: -140, y: -118, w: 280, d: 228, r: 8 };
const WALL = { y: -110, h: 80, t: 6 };          // drawn lower than the real 2.4 m so the benches read
const BENCH = { w: 51, d: 28, h: 37 };
const BENCH_X = [-30, 30], BENCH_Y = -93.5;
const FENCE = { y: 85, x0: -55, x1: 35, h: 140, rails: [18.5, 73, 84.5, 138] };
const PAL = { w: 60, d: 50, top: 7 };
const PAL_IN = [-95, 47.5], PAL_OUT = [95, 47.5];
const BLOCK = { w: 24, d: 19, h: 17 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [PAD.x, WALL.y, WALL.h], [PAD.x + PAD.w, WALL.y, WALL.h], [FENCE.x0, FENCE.y, FENCE.h], [FENCE.x1, FENCE.y, FENCE.h]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const box = (plan, z, h, tone = "mid") => S(slab({ ...plan, r: plan.r ?? 0.4 }, z, h, 2, 0.3), { tone });

// ---- floor and wall ------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function wall() {
  const plan = { x: PAD.x + 4, y: WALL.y - WALL.t, w: PAD.w - 8, d: WALL.t, r: 0.6 };
  return S(slab(plan, 0, WALL.h, 2, 0.4), { tone: "lo", inner: L(k.sideSeam(plan, WALL.h / 2, P, 2), { tone: "faint" }) });
}

// ---- BC block, deck up, long axis along x ---------------------------------------
function block(cx, cy, z, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, cy, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  return out.join("");
}

// ---- a bench: cabinet with two drawers, dark top, vise on the front corner, a block on it ----
function bench(x, { lit = false, grinder = false, live = false } = {}) {
  const { w, d, h } = BENCH;
  const plan = { x: x - w / 2, y: BENCH_Y - d / 2, w, d, r: 0.6 };
  const out = [S(slab(plan, 0, h - 3, 2, 0.4), { tone: "mid" })];
  const fy = plan.y + d;
  for (const z of [12, 22]) out.push(L(k.segment([plan.x + 4, fy, z], [plan.x + w - 4, fy, z], P), { tone: "faint" }));
  out.push(D([at([x, fy, 17]), at([x, fy, 27])], { size: 0.6, tone: "lo" }));
  out.push(S(slab({ ...k.insetPlan(plan, -1), r: 0.4 }, h - 3, 3, 2, 0.3), { tone: "lo" }));
  // vise
  const vx = plan.x + w - 9, vy = fy - 4;
  out.push(box({ x: vx - 3.5, y: vy - 6, w: 7, d: 8 }, h, 3));
  out.push(box({ x: vx - 3.5, y: vy + 2, w: 7, d: 1.5 }, h + 1, 3.5));
  out.push(L(k.segment([vx - 5, vy + 4.5, h + 2.5], [vx + 5, vy + 4.5, h + 2.5], P), { tone: "hi" }));
  // live: the block on the bench and the grinder are moving pieces, drawn in a slot after the bench
  if (live) return out.join("");
  out.push(block(x - 6, BENCH_Y, h, { lit }));
  if (grinder) {
    // a hand grinder working the deck face, sparks off the edge
    const gx = x - 2, edge = BENCH_Y + BLOCK.d / 2, gz = h + BLOCK.h;
    for (let i = 0; i < 6; i++) out.push(k.fadeLineSvg([at([gx, edge + 0.5, gz - 1]), at([gx - 8 + i * 3, edge + 12 + i * 2, gz - 8 - (i % 3) * 3])], { fade: [0, 0.8], tone: "mid" }));
    out.push(S(k.cylinder(gx, edge - 3, 2.6, gz + 1, 3, P, 16, 0.3), { tone: "mid" }));
    out.push(S(slab({ x: gx - 1.5, y: edge - 4.5, w: 14, d: 3, r: 1.5 }, gz + 4, 3, 4), { tone: "hi", crease: "none" }));
  }
  return out.join("");
}

// ---- pallets with blocks -----------------------------------------------------------
function pallet([cx, cy], n) {
  const { w, d, top } = PAL;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 0.4 };
  const out = [];
  for (const dx of [-25, 0, 25]) for (const dy of [-20, 0, 20]) out.push(box({ x: cx + dx - 2.5, y: cy + dy - 2.5, w: 5, d: 5 }, 0, top - 1.5));
  out.push(S(slab(plan, top - 1.5, 1.5, 2, 0.3), { tone: "mid" }));
  out.push(L([-12, 12].map((dx) => k.lineOnTop([cx + dx, plan.y + 1], [cx + dx, plan.y + d - 1], top, P)).join(""), { tone: "faint" }));
  // blocks: two across, three deep, a second layer on top; drawn back to front, bottom up
  const slots = [];
  for (let i = 0; i < n; i++) {
    const layer = Math.floor(i / 6), j = i % 6;
    slots.push([cx + (j % 2 ? 13.5 : -13.5), cy + (Math.floor(j / 2) - 1) * 21, top + layer * BLOCK.h]);
  }
  slots.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]).forEach(([x, y, z]) => out.push(block(x, y, z)));
  return out.join("");
}

// ---- the safety fence: posts and rails, in front of everything --------------------------
function fence() {
  const { y, x0, x1, h, rails } = FENCE;
  const out = [];
  const posts = [x0, (x0 + x1) / 2, x1];
  for (const x of posts.slice(0, 2)) out.push(box({ x: x - 1.5, y: y - 1.5, w: 3, d: 3 }, 0, h));
  for (const z of rails) out.push(box({ x: x0 - 1.5, y: y - 1.2, w: x1 - x0 + 3, d: 2.4 }, z - 1.5, 3));
  out.push(box({ x: x1 - 1.5, y: y - 1.5, w: 3, d: 3 }, 0, h));
  return out.join("");
}

const body = [
  floor(),
  wall(),
  bench(BENCH_X[0], { lit: true, grinder: true }),
  bench(BENCH_X[1]),
  pallet(PAL_IN, 8),
  pallet(PAL_OUT, 2),
  fence(),
];

const LABEL =
  "Station Line Repair, rework benches: blocks judged Repair at QC Gate 2 arrive on a pallet behind the yellow safety fence. Two workbenches against the back wall, each with a vise, rework them with a hand grinder, and the reworked blocks go onto the out pallet back to QC Gate 2.";

// =============================================================================
// The shift, as in repair-3d.html: an M/M/2 queue at 60x. The model (rpStep, rpGo) and the moving pieces
// (rpScene and the builders it calls) are plain functions over `k`, `P` and `M`; the live page gets their
// source with the kit inlined. The still above is the approved drawing; the live page runs the benches.
// =============================================================================
const M = {
  BLOCK,
  BENCH,
  BENCH_X,
  BENCH_Y,
  PAL,
  PAL_IN,
  PAL_OUT,
  LINE_RATE: 300, // blocks an hour through the line (assumed, about a 12 s takt)
  MEAN_S: 8, // min a bench takes to rework one block (assumed)
  MOVE: 0.9, // s for a block to be carried pallet to bench or back
  OUT_LOT: 6, // blocks on the out pallet that send it back to QC Gate 2
  SEED: 20261015,
  POOL: 26,
};

function rpState() {
  return {
    step: 0, simT: 0, nextArrival: 1.5, seed: M.SEED, share: 4, broken: false, clock: 0,
    pool: Array.from({ length: M.POOL }, (_, i) => ({ id: i, state: "idle", pos: [0, 0, 0], from: [0, 0, 0], to: [0, 0, 0], p: 1, alpha: 0, svc: 0, arrive: 0, bench: -1 })),
    queue: [], benches: [null, null], outStack: [], leaving: 0, back: 0, lastWait: 0,
  };
}

// the shift plays out the same way every time: a seeded generator for arrivals and rework times
function rpRnd(st) {
  st.seed = (st.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(st.seed ^ (st.seed >>> 15), 1 | st.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const rpExpo = (st, mean) => -Math.log(1 - rpRnd(st)) * mean;

// blocks a minute
const rpLam = (st) => ((st.share / 100) * M.LINE_RATE) / 60;

// a spot on a pallet: two across, three deep, a second layer on top
function rpSlot([cx, cy], i) {
  const layer = Math.min(1, Math.floor(i / 6));
  const j = i % 6;
  return [cx + (j % 2 ? 13.5 : -13.5), cy + (Math.floor(j / 2) - 1) * 21, M.PAL.top + layer * M.BLOCK.h];
}

const rpBenchSpot = (i) => [M.BENCH_X[i] - 6, M.BENCH_Y, M.BENCH.h];

function rpMove(b, to) {
  b.from = [...b.pos];
  b.to = [...to];
  b.p = 0;
}

// Erlang C for c benches
function rpErlang(lam, mu, c) {
  const a = lam / mu, rho = a / c;
  if (rho >= 1) return { rho, Pw: 1, Wq: Infinity, W: Infinity };
  let sum = 0, term = 1;
  for (let i = 0; i < c; i++) { sum += term; term *= a / (i + 1); }
  const tail = term / (1 - rho);
  const Pw = tail / (sum + tail);
  const Wq = Pw / (c * mu - lam);
  return { rho, Pw, Wq, W: Wq + 1 / mu };
}

function rpStep(st, dt) {
  st.clock += dt;
  st.simT += dt; // minutes
  const c = st.broken ? 1 : 2;
  // arrivals from QC Gate 2
  while (st.simT >= st.nextArrival) {
    const b = st.pool.find((q) => q.state === "idle");
    if (b) {
      b.state = "queue"; b.arrive = st.nextArrival; b.alpha = 0; b.p = 1;
      b.pos = rpSlot(M.PAL_IN, Math.min(st.queue.length, 11));
      st.queue.push(b);
    }
    st.nextArrival += rpExpo(st, 1 / rpLam(st));
  }
  // a free bench takes the next block in the queue
  for (let i = 0; i < 2; i++) {
    if (i >= c || st.benches[i] || !st.queue.length) continue;
    const b = st.queue.shift();
    b.state = "toBench"; b.bench = i; b.svc = rpExpo(st, M.MEAN_S); b.alpha = 1; st.lastWait = st.simT - b.arrive;
    st.benches[i] = b;
    rpMove(b, rpBenchSpot(i));
  }
  // rework, then out to the pallet that goes back to QC Gate 2
  for (const b of st.pool) {
    if (b.state === "toBench" && b.p >= 1) b.state = "work";
    if (b.state === "work") {
      b.svc -= dt;
      if (b.svc <= 0) {
        st.benches[b.bench] = null;
        b.state = "toOut";
        st.outStack.push(b);
        rpMove(b, rpSlot(M.PAL_OUT, st.outStack.length - 1));
      }
    }
    if (b.state === "toOut" && b.p >= 1) b.state = "out";
  }
  // a full out pallet goes back to QC Gate 2
  if (!st.leaving && st.outStack.length >= M.OUT_LOT && st.outStack.every((b) => b.state === "out")) st.leaving = 1.5;
  if (st.leaving) {
    st.leaving = Math.max(0, st.leaving - dt);
    for (const b of st.outStack) b.alpha = st.leaving / 1.5;
    if (!st.leaving) {
      for (const b of st.outStack) b.state = "idle";
      st.back += st.outStack.length;
      st.outStack.length = 0;
    }
  }
  // the queue closes up and fades in on arrival, carried blocks swing over in an arc
  st.queue.forEach((b, i) => {
    const s = rpSlot(M.PAL_IN, Math.min(i, 11));
    const f = 1 - Math.exp(-dt / 0.15);
    b.pos = b.pos.map((v, j) => v + (s[j] - v) * f);
    b.alpha = Math.min(1, b.alpha + dt * 2);
  });
  for (const b of st.pool) {
    if (b.state === "idle" || b.p >= 1) continue;
    b.p = Math.min(1, b.p + dt / M.MOVE);
    const e = b.p * b.p * (3 - 2 * b.p);
    b.pos = b.from.map((v, j) => v + (b.to[j] - v) * e);
    b.pos[2] += Math.sin(b.p * Math.PI) * 15;
  }
}

// a fresh shift (the sliders stay where they are)
function rpGo(st) {
  const fresh = rpState();
  fresh.share = st.share;
  fresh.broken = st.broken;
  Object.assign(st, fresh);
}

const rpDur = () => 40;

// a BC block, deck up, long axis along x; lit = the one on a bench
function rpBlock(x, y, z, lit, alpha) {
  if (alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const plan = { x: x - w / 2, y: y - d / 2, w, d, r: 1 };
  let out = k.solidSvg(k.slabOf(plan, z, h, P, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: k.lineSvg(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) });
  out += k.lineSvg([0, 1, 2, 3].map((i) => k.ring(plan.x + 4 + i * 5.33, y, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" });
  return alpha >= 0.999 ? out : `<g opacity="${alpha.toFixed(3)}">${out}</g>`;
}

// the hand grinder: parked at the bench end, or working the front edge of the block with sparks off it
function rpGrinder(bx, i, working, t) {
  const { BLOCK: B, BENCH: bn, BENCH_Y: by } = M;
  const at = (p) => k.iso(p, P);
  const gx = working ? bx - 6 + Math.sin(t * 1.7 + i) * 8 : bx - bn.w / 2 + 6;
  const edge = working ? by + B.d / 2 + Math.sin(t * 0.9 + i * 2) * 1.5 : by + bn.d / 2 - 6;
  const gz = working ? bn.h + B.h : bn.h + 3;
  const out = [];
  if (working) {
    const items = [];
    for (let j = 0; j < 6; j++) {
      const flick = 0.55 + 0.45 * Math.sin(t * 17 + j * 2.1 + i);
      const p0 = at([gx, edge + 0.5, gz - 1]);
      const p1 = at([gx - 8 + j * 3, edge + 12 + j * 2, gz - 8 - (j % 3) * 3]);
      items.push([k.pathOf([p0, p1]), flick]);
    }
    out.push(k.fadedSvg(items, { tone: "mid" }));
  }
  out.push(k.solidSvg(k.cylinder(gx, edge - 3, 2.6, gz + 1, 3, P, 16, 0.3), { tone: "mid" }));
  out.push(k.solidSvg(k.slabOf({ x: gx - 1.5, y: edge - 4.5, w: 14, d: 3, r: 1.5 }, gz + 4, 3, P, 4, 0), { tone: "hi", crease: "none" }));
  return out.join("");
}

// a cross over a bench that is down
function rpDown(bx) {
  const z = M.BENCH.h + 3.5;
  const { w, d } = M.BENCH;
  const a = [bx - w / 2 + 6, M.BENCH_Y - d / 2 + 4, z], b = [bx + w / 2 - 6, M.BENCH_Y + d / 2 - 4, z];
  const c = [bx - w / 2 + 6, M.BENCH_Y + d / 2 - 4, z], e = [bx + w / 2 - 6, M.BENCH_Y - d / 2 + 4, z];
  return k.lineSvg(k.segment(a, b, P) + k.segment(c, e, P), { tone: "hi" });
}

// everything that moves, for a state
function rpScene(st) {
  const sorted = (list) => [...list].sort((a, b) => a.pos[2] - b.pos[2] || a.pos[1] - b.pos[1] || a.pos[0] - b.pos[0]);
  const draw = (b, lit) => rpBlock(b.pos[0], b.pos[1], b.pos[2], lit, b.alpha);
  const bench = (i) => {
    const b = st.benches[i];
    const working = !!b && b.state === "work";
    return (working ? draw(b, true) : "") + rpGrinder(M.BENCH_X[i], i, working, st.clock) + (st.broken && i === 1 ? rpDown(M.BENCH_X[i]) : "");
  };
  return {
    name: "",
    palIn: sorted(st.queue.slice(0, 12)).map((b) => draw(b, false)).join(""),
    work0: bench(0),
    work1: bench(1),
    palOut: sorted(st.outStack.filter((b) => b.state === "out")).map((b) => draw(b, false)).join(""),
    flight: sorted(st.pool.filter((b) => b.state === "toBench" || b.state === "toOut")).map((b) => draw(b, true)).join(""),
  };
}

function rpReadout(st) {
  const c = st.broken ? 1 : 2;
  const busy = st.benches.filter((b) => b).length;
  return `${busy} of ${c} benches busy · ${st.queue.length} waiting${st.broken ? " · one bench down" : ""}`;
}

function rpNumbers(st) {
  const c = st.broken ? 1 : 2;
  const mu = 1 / M.MEAN_S;
  const lam = rpLam(st);
  const q = rpErlang(lam, mu, c);
  const f = (x, n = 1) => x.toFixed(n);
  if (q.rho >= 1) return `${f(lam * 60)} blocks/h in, ${f(c * mu * 60)} blocks/h out · the queue grows by ${f((lam - c * mu) * 60)} an hour · ${st.back} sent back to QC Gate 2`;
  return `${f(lam * 60)} blocks/h in · benches ${Math.round(q.rho * 100)} % busy · ${Math.round(q.Pw * 100)} % wait, ${f(q.Wq)} min on average · ${M.MEAN_S} min rework · back to QC Gate 2 in ${Math.round(q.W)} min · ${st.back} sent back`;
}

// ---- self-check: at 4 % two benches keep up and send lots back; at 8 % with one bench down the queue grows past the pallet
{
  const run = (share, broken, seconds) => {
    const st = rpState();
    st.share = share;
    st.broken = broken;
    let sum = 0;
    for (let i = 0; i < 60 * seconds; i++) {
      rpStep(st, 1 / 60);
      sum += st.queue.length;
    }
    st.meanQueue = sum / (60 * seconds);
    return st;
  };
  const ok = run(4, false, 400);
  if (!(ok.back >= 6 && ok.meanQueue < 6)) throw new Error(`4 %: ${ok.back} sent back, ${ok.meanQueue.toFixed(1)} waiting on average`);
  const bad = run(8, true, 400);
  if (!(bad.queue.length >= 12 && bad.meanQueue > 2 * ok.meanQueue)) throw new Error(`8 %, one bench down: ${bad.queue.length} waiting, ${bad.meanQueue.toFixed(1)} on average`);
  if (!(rpErlang(rpLam({ share: 4 }), 1 / M.MEAN_S, 2).rho < 1 && rpErlang(rpLam({ share: 8 }), 1 / M.MEAN_S, 1).rho >= 1)) throw new Error("erlang stability");
  console.log(`queue check passed (4 %: ${ok.back} sent back in 400 s, ${ok.meanQueue.toFixed(1)} waiting on average; 8 % one bench down: ${bad.queue.length} waiting, ${bad.meanQueue.toFixed(1)} on average)`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  const slot = (name, inner = "") => `<g data-slot="${name}">${inner}</g>`;
  return [
    floor(),
    wall(),
    bench(BENCH_X[0], { live: true }),
    slot("work0", f.work0),
    bench(BENCH_X[1], { live: true }),
    slot("work1", f.work1),
    pallet(PAL_IN, 0),
    slot("palIn", f.palIn),
    pallet(PAL_OUT, 0),
    slot("palOut", f.palOut),
    slot("flight", f.flight),
    fence(),
  ];
}

function livePage() {
  const st = rpState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: liveBody(rpScene(st)) });
  return liveHtml({
    k,
    title: "Line Repair · rework queue",
    fig: "Line Repair",
    figTitle: "Rework queue, 1 s = 1 min",
    key: "repair",
    svg,
    slots: ["work0", "palIn", "work1", "palOut", "flight"],
    steps: [["run", "Restart shift"]],
    controls: [
      { kind: "range", key: "share", label: "Repair share", min: 1, max: 8, step: 0.5, value: 4, unit: "%", digits: 1 },
      { kind: "toggle", key: "broken", label: "One bench down" },
    ],
    header: `const P = ${JSON.stringify(P)};\nconst M = ${JSON.stringify(M)};`,
    fns: [rpState, rpRnd, rpExpo, rpLam, rpSlot, rpBenchSpot, rpMove, rpErlang, rpStep, rpGo, rpDur, rpBlock, rpGrinder, rpDown, rpScene, rpReadout, rpNumbers],
    model: { state: "rpState", step: "rpStep", go: "rpGo", dur: "rpDur", scene: "rpScene", readout: "rpReadout", numbers: "rpNumbers" },
    still: ["run", 0.6],
  });
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
    writeFileSync(join(OUT, `repair-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `repair-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
  const html = livePage();
  writeFileSync(join(OUT, "repair-live.html"), html);
  console.log(`wrote ${join(OUT, "repair-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
