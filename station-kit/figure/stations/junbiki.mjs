// Isometric figure of station Junbiki (sequenced staging) for the station detail card in
// /visualisasi. Shapes follow the Blender layout: a three-level gravity flow rack with lanes running
// away from the line, the infeed from the Spray Booth alongside it, and a traversing lift on a floor
// track along the rack front that takes each block to the lane of its delivery lot, raises it to the
// top level and runs it in. The blocks roll down the lane to queue at the far end for the truck.
// The live page runs the cycle of junbiki-3d.html: the lift takes a block off the infeed, travels to the lane of its
// lot, raises it and pushes it in; the block then rolls down the sloped lane (a = g (sin t - C_rr cos t), braked
// towards 0.3 m/s by the speed-controller rollers) and queues at the far end. A lot of 6 goes out to the truck.
//   node station-kit/figure/stations/junbiki.mjs [outDir]
//     →   <outDir>/junbiki-{light,dark}.svg and <outDir>/junbiki-live.html (?theme=dark|light)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/junbiki.mjs --check   runs the cycle model's self-check only
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as k from "../iso-kit.mjs";
import { liveHtml } from "../live-kit.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });
const WIDTH = 600;
const HEIGHT = 420;

// ---- world (z up, 50 units a metre like the other stations; lanes run along +y, towards the viewer)
const LX = [50, 25, 0, -25, -50, -75];          // lane centres
const RAILS = [...LX.map((x) => x + 12.5), LX[LX.length - 1] - 12.5];
const Y0 = 27, Y1 = 320;                        // lane entry (lift side) and far end (pick face)
const LEVELS = [99, 78, 57];                    // roller tops; the 2 % fall is too small to draw
const POST_Y = [Y0 + 3, Y0 + 72, Y0 + 145, Y0 + 218, Y1 - 3];
const CONV_Z = 23.5;
const BLOCK = { w: 19, d: 24, h: 17 };          // long axis along the lane
const HOME = 85, INFEED = [170, 16];
const LIFT = { x: LX[0], top: 145 };
const PAD = { x: -112, y: -48, w: 240, d: 382, r: 8 };

const P = k.fitProjection(
  [...k.boxCorners(PAD, -8, 0), [LIFT.x, -21, LIFT.top + 10], [RAILS[RAILS.length - 1], Y1, LEVELS[0] + 20], [RAILS[0], -30, LIFT.top]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const seg = (p, q) => k.segment(p, q, P);
const box = (plan, z, h, tone = "mid") => S(slab({ ...plan, r: plan.r ?? 0.4 }, z, h, 2, 0.3), { tone });

// ---- floor -------------------------------------------------------------------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -8, 8, P)}"/>`];
  out.push(S(slab(PAD, -8, 8, 8, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 5), 0, P), { tone: "faint" }));
  // the pick face at the far end of the lanes, where lots go out to the truck
  out.push(L(k.lineOnTop([RAILS[RAILS.length - 1], Y1 + 14], [RAILS[0], Y1 + 14], 0, P), { tone: "faint" }));
  const bolts = k.corners(PAD, 12);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---- BC block, deck up, long axis along y ---------------------------------------
function block(cx, cy, z, { lit = false } = {}) {
  const { w, d, h } = BLOCK;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const out = [S(slab(plan, z, h, 2, 0.6), { tone: "hi", crease: "lo", lit, inner: L(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) })];
  out.push(L([0, 1, 2, 3].map((i) => k.ring(cx, plan.y + 4 + i * 5.33, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" }));
  return out.join("");
}

// ---- the traversing lift, behind the rack front ------------------------------------
function lift() {
  const { x, top } = LIFT;
  const out = [];
  for (const y of [-27, -15]) out.push(box({ x: RAILS[RAILS.length - 1] - 10, y, w: HOME + 20 - RAILS[RAILS.length - 1], d: 2.5 }, 0, 1.5, "lo"));
  out.push(box({ x: x - 22, y: -32, w: 44, d: 22, r: 1 }, 1.5, 6));
  out.push(S(k.cylinder(x - 15, -36, 3.5, 3, 7, P, 20, 0.3), { tone: "hi" }));
  for (const dx of [-17, 13]) out.push(box({ x: x + dx, y: -24, w: 4, d: 5 }, 7.5, top - 7.5));
  out.push(box({ x: x - 20, y: -25, w: 40, d: 8, r: 0.6 }, top, 6));
  out.push(S(k.cylinder(x + 6, -21, 4.5, top + 6, 12, P, 24, 0.4), { tone: "hi" }));
  out.push(box({ x: x - 13, y: -25, w: 9, d: 8 }, top + 6, 6));
  // the carriage at the top level with the block on it, about to run it into lane 1
  const cz = LEVELS[0];
  out.push(box({ x: x - 15.5, y: -16, w: 31, d: 32, r: 0.6 }, cz - 4, 3));
  out.push(L(Array.from({ length: 7 }, (_, i) => seg([x - 14, -13 + i * 4.5, cz - 0.5], [x + 14, -13 + i * 4.5, cz - 0.5])).join(""), { tone: "lo" }));
  for (const dx of [-17, 15]) out.push(box({ x: x + dx, y: -18, w: 2, d: 35 }, cz - 6, 7));
  out.push(block(x, 0, cz - 1, { lit: true }));
  return out.join("");
}

// ---- infeed from the Spray Booth, alongside the rack --------------------------------
function infeed(f) {
  const [y1, y0] = INFEED;
  const out = [];
  for (const y of [y0 + 10, y1 - 10]) for (const dx of [-16, 16]) out.push(box({ x: HOME + dx - 2, y: y - 2, w: 4, d: 4 }, 0, CONV_Z - 7));
  out.push(box({ x: HOME - 18, y: y0, w: 4, d: y1 - y0, r: 0.5 }, CONV_Z - 8, 9));
  for (let y = y0 + 3; y < y1 - 3; y += 7) out.push(S(slab({ x: HOME - 14, y, w: 28, d: 4.6, r: 2.3 }, CONV_Z - 4.6, 4.6, 6), { tone: "mid", crease: "none" }));
  if (!f) out.push(block(HOME, 120, CONV_Z));
  out.push(box({ x: HOME + 14, y: y0, w: 4, d: y1 - y0, r: 0.5 }, CONV_Z - 8, 9));
  // live: the block riding the infeed (and onto the lift carriage) goes in front of the whole conveyor
  if (f) out.push(`<g data-slot="feed">${f.feed}</g>`);
  return out.join("");
}

// ---- the flow rack ---------------------------------------------------------------
const post = (x, y) => box({ x: x - 1.5, y: y - 1.5, w: 3, d: 3 }, 0, LEVELS[0] + 3);
const STAGED = [[0, 4], [1, 2], [2, 5], [3, 1], [4, 3], [5, 2]];   // lane, blocks queued
const LOWER = [[0, 1], [1, 3], [2, 0], [3, 2], [4, 0], [5, 3]];
function level(z, staged, { brakes = false } = {}) {
  const out = [];
  // cross beams under each post row, then the rails (farthest first), the rollers, the speed controllers
  for (const y of POST_Y) out.push(box({ x: RAILS[RAILS.length - 1] - 1.5, y: y - 1.5, w: RAILS[0] - RAILS[RAILS.length - 1] + 3, d: 3 }, z - 6, 2.5));
  const rollers = [], brakeLines = [];
  for (const x of LX) for (let y = Y0 + 4; y < Y1 - 2; y += 6) rollers.push(seg([x - 11, y, z - 0.6], [x + 11, y, z - 0.6]));
  if (brakes) for (const x of LX) for (const y of [Y0 + 75, Y0 + 150, Y0 + 225]) brakeLines.push(seg([x - 11, y, z - 0.4], [x + 11, y, z - 0.4]));
  for (const x of [...RAILS].reverse()) out.push(box({ x: x - 1, y: Y0, w: 2, d: Y1 - Y0 }, z - 3.5, 4.5));
  out.push(L(rollers.join(""), { tone: "faint" }));
  if (brakes) out.push(L(brakeLines.join(""), { tone: "mid" }));
  out.push(box({ x: RAILS[RAILS.length - 1], y: Y1, w: RAILS[0] - RAILS[RAILS.length - 1], d: 2 }, z - 2, 6));
  // the queues at the far end, drawn back to front
  const blocks = [];
  for (const [lane, n] of staged) for (let i = 0; i < n; i++) blocks.push([LX[lane], Y1 - 13 - i * 25]);
  blocks.sort((a, b) => a[1] - b[1] || a[0] - b[0]).forEach(([x, y]) => out.push(block(x, y, z)));
  return out.join("");
}

function rack(f) {
  const out = [];
  for (const y of POST_Y.slice(0, -1)) for (const x of [...RAILS].reverse()) out.push(post(x, y));
  out.push(level(LEVELS[2], LOWER.map(([l, n]) => [l, Math.max(0, n - 1)])));
  out.push(level(LEVELS[1], LOWER));
  // live: the top level's queues and the block rolling down a lane are drawn in one slot, back to front
  out.push(level(LEVELS[0], f ? [] : STAGED, { brakes: true }));
  if (f) out.push(`<g data-slot="queue">${f.queue}</g>`);
  for (const x of [...RAILS].reverse()) out.push(post(x, POST_Y[POST_Y.length - 1]));
  return out.join("");
}

const body = [floor(), lift(), rack(), infeed()];

const LABEL =
  "Station Junbiki, sequenced staging: a traversing lift on a floor track along the front of a three-level gravity flow rack takes each oiled block off the infeed from the Spray Booth, travels to the lane of its delivery lot, raises it to the top level and runs it in. The lanes fall gently away from the lift, so the blocks roll down past braking rollers to queue at the far end, where complete lots go out to the truck.";

// =============================================================================
// The cycle, as in junbiki-3d.html. The model (jbStep, jbGo) and the moving pieces (jbScene and the builders it
// calls) are plain functions over `k`, `P` and `M`; the live page gets their source with the kit inlined.
// The still above is the approved drawing; the live page runs the lift and the lanes.
// =============================================================================
const M = {
  LX,
  RAILS,
  Y0,
  LEVELS,
  CONV_Z,
  BLOCK,
  HOME,
  INFEED,
  LIFT,
  // lift steps (s); travel and back depend on the distance to the lane
  FEED: 2.6,
  RAISE: 2.4,
  PUSH: 1.4,
  NEXT: 0.3,
  TRAVEL_SPEED: 40, // units a second (0.8 m/s)
  SEQ: [2, 0, 4, 1, 3, 5, 2, 1, 4, 0, 3, 5],
  STEPS: ["feed", "travel", "raise", "push", "back", "next"],
  CAP: 6, // blocks in a delivery lot
  LOT_OUT_S: 2.5,
  // lane physics, SI: the 3D page's numbers
  LANE_M: 5.85,
  S0: 0.24,
  QPITCH: 0.5,
  G: 9.81,
  C_RR: 0.01,
  C_START: 0.015,
  V_C: 0.3,
  K_B: 4,
  V0: 0.25,
  MASS: 36,
  V_SAFE: 0.5,
};

function jbState() {
  return { step: 0, pt: 0, slope: 2, broken: false, seqI: 0, lane: M.SEQ[0], n: [3, 1, 4, 2, 0, 3], loading: [0, 0, 0, 0, 0, 0], roll: M.LX.map(() => ({ active: false, s: 0, v: 0, stuck: 0, pushed: false })), locked: false, wait: false, vHit: 0, E: 0, stalls: 0, staged: 0, clock: 0 };
}

const jbTravelT = (st) => 0.6 + Math.abs(M.LX[st.lane] - M.HOME) / M.TRAVEL_SPEED;

function jbDur(st) {
  const name = M.STEPS[st.step];
  if (name === "travel") return jbTravelT(st);
  if (name === "back") return Math.max(jbTravelT(st), 2);
  return { feed: M.FEED, raise: M.RAISE, push: M.PUSH, next: M.NEXT }[name];
}

// a block rolling down a lane of slope t: g (sin t - C_rr cos t), the speed controllers brake it towards V_C
function jbAccel(st, v) {
  const t = Math.atan(st.slope / 100);
  return M.G * (Math.sin(t) - M.C_RR * Math.cos(t)) - (!st.broken && v > M.V_C ? M.K_B * (v - M.V_C) : 0);
}

// the whole run on an empty lane, for the readout before any block has arrived
function jbRunTo(st, run) {
  let s = M.S0, v = M.V0;
  for (let i = 0; i < 20000 && s < run; i++) {
    v = Math.max(0, v + jbAccel(st, v) / 240);
    s += v / 240;
    if (v === 0) return { v: 0, stalled: s };
  }
  return { v };
}

const jbQueueS = (i) => M.LANE_M - M.S0 - i * M.QPITCH;

function jbStep(st, dt) {
  st.clock += dt;
  st.pt += dt;
  const name = M.STEPS[st.step];
  const dur = jbDur(st);
  // push: wait while the lane is busy (a block rolling, its lot leaving, or a full lot)
  if (name === "push" && !st.locked) {
    const busy = st.roll[st.lane].active || st.loading[st.lane] > 0 || st.n[st.lane] >= M.CAP;
    if (busy) { st.pt = 0; st.wait = true; } else { st.locked = true; st.wait = false; }
  }
  if (st.pt >= dur && !(name === "push" && st.wait)) {
    if (name === "push") {
      const r = st.roll[st.lane];
      r.active = true; r.s = M.S0; r.v = M.V0; r.stuck = 0; r.pushed = false;
    }
    st.step = (st.step + 1) % M.STEPS.length;
    st.pt = 0;
    st.locked = false;
    if (M.STEPS[st.step] === "feed") { st.seqI = (st.seqI + 1) % M.SEQ.length; st.lane = M.SEQ[st.seqI]; }
  }
  // the lanes: each rolling block integrated in small steps
  const h = 1 / 240, steps = Math.max(1, Math.round(dt / h));
  const t = Math.atan(st.slope / 100);
  st.roll.forEach((r, i) => {
    if (st.loading[i] > 0) {
      st.loading[i] -= dt;
      if (st.loading[i] <= 0) { st.loading[i] = 0; st.n[i] = 0; }
    }
    if (!r.active) return;
    const tail = jbQueueS(st.n[i]);
    for (let j = 0; j < steps; j++) {
      if (r.pushed) { r.v = M.V_C; r.s += r.v * h; }
      else if (r.v > 0 || Math.sin(t) > M.C_START * Math.cos(t)) { r.v = Math.max(0, r.v + jbAccel(st, r.v) * h); r.s += r.v * h; r.stuck = 0; }
      else { r.stuck += h; if (r.stuck > 3) { r.pushed = true; st.stalls++; } }
      if (r.s >= tail) {
        st.vHit = r.pushed ? 0 : r.v;
        st.E = 0.5 * M.MASS * st.vHit * st.vHit;
        r.active = false;
        st.n[i]++;
        st.staged++;
        if (st.n[i] >= M.CAP) st.loading[i] = M.LOT_OUT_S; // the lot is complete: it goes out to the truck
        break;
      }
    }
  });
}

function jbGo(st, name) {
  st.step = M.STEPS.indexOf(name);
  st.pt = 0;
  st.locked = false;
  st.wait = false;
}

// where the lift and its block are for a state: lift x, carriage height, and the block (null when none)
function jbPose(st) {
  const name = M.STEPS[st.step];
  const u = Math.min(1, st.pt / jbDur(st));
  const e = u * u * (3 - 2 * u);
  const target = M.LX[st.lane];
  const top = M.LEVELS[0];
  const low = M.CONV_Z + 1;
  const rise = (f) => low + (top - low) * f;
  const pose = { lx: M.HOME, cz: low, block: null };
  if (name === "feed") pose.block = { x: M.HOME, y: M.INFEED[0] - 15 + (15 - M.INFEED[0]) * e, z: M.CONV_Z, alpha: Math.min(1, u / 0.2), on: "infeed" };
  else if (name === "travel") { pose.lx = M.HOME + (target - M.HOME) * e; pose.block = { x: pose.lx, y: 0, z: pose.cz - 1, alpha: 1, on: "lift" }; }
  else if (name === "raise") { pose.lx = target; pose.cz = rise(e); pose.block = { x: target, y: 0, z: pose.cz - 1, alpha: 1, on: "lift" }; }
  else if (name === "push") {
    pose.lx = target;
    pose.cz = top;
    const y = (M.Y0 + M.S0 * 50) * e;
    pose.block = { x: target, y, z: top - 1, alpha: 1, on: y > 14 ? "queue" : "lift" };
  } else if (name === "back") { pose.lx = target + (M.HOME - target) * e; pose.cz = rise(1 - e); }
  return pose;
}

// a BC block, deck up, long axis along y; lit = the one being handled
function jbBlock(cx, cy, z, lit, alpha) {
  if (alpha <= 0.001) return "";
  const { w, d, h } = M.BLOCK;
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 1 };
  const slab = k.slabOf(plan, z, h, P, 2, 0.6);
  let out = k.solidSvg(slab, { tone: "hi", crease: "lo", lit, inner: k.lineSvg(k.sideSeam(plan, z + 5, P, 2), { tone: lit ? "lit" : "faint" }) });
  out += k.lineSvg([0, 1, 2, 3].map((i) => k.ring(cx, plan.y + 4 + i * 5.33, 2.2, z + h, P, 24)).join(""), { tone: lit ? "lit" : "mid" });
  return alpha >= 0.999 ? out : `<g opacity="${alpha.toFixed(3)}">${out}</g>`;
}

// the traversing lift: floor track, base, masts, top beam, hoist and the carriage at height cz, at x
function jbLift(x, cz) {
  const { top } = M.LIFT;
  const RL = M.RAILS[M.RAILS.length - 1];
  const S = (paths, style) => k.solidSvg(paths, style);
  const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
  const box = (plan, z, h, tone = "mid") => S(slab({ ...plan, r: plan.r ?? 0.4 }, z, h, 2, 0.3), { tone });
  const out = [];
  for (const y of [-27, -15]) out.push(box({ x: RL - 10, y, w: M.HOME + 20 - RL, d: 2.5 }, 0, 1.5, "lo"));
  out.push(box({ x: x - 22, y: -32, w: 44, d: 22, r: 1 }, 1.5, 6));
  out.push(S(k.cylinder(x - 15, -36, 3.5, 3, 7, P, 20, 0.3), { tone: "hi" }));
  for (const dx of [-17, 13]) out.push(box({ x: x + dx, y: -24, w: 4, d: 5 }, 7.5, top - 7.5));
  out.push(box({ x: x - 20, y: -25, w: 40, d: 8, r: 0.6 }, top, 6));
  out.push(S(k.cylinder(x + 6, -21, 4.5, top + 6, 12, P, 24, 0.4), { tone: "hi" }));
  out.push(box({ x: x - 13, y: -25, w: 9, d: 8 }, top + 6, 6));
  out.push(box({ x: x - 15.5, y: -16, w: 31, d: 32, r: 0.6 }, cz - 4, 3));
  out.push(k.lineSvg(Array.from({ length: 7 }, (_, i) => k.segment([x - 14, -13 + i * 4.5, cz - 0.5], [x + 14, -13 + i * 4.5, cz - 0.5], P)).join(""), { tone: "lo" }));
  for (const dx of [-17, 15]) out.push(box({ x: x + dx, y: -18, w: 2, d: 35 }, cz - 6, 7));
  return out.join("");
}

// everything that moves, for a state
function jbScene(st) {
  const name = M.STEPS[st.step];
  const pose = jbPose(st);
  const b = pose.block;
  const top = M.LEVELS[0];
  // the top level's queues and the rolling block, back to front
  const list = [];
  st.n.forEach((n, lane) => {
    const alpha = st.loading[lane] > 0 ? st.loading[lane] / M.LOT_OUT_S : 1;
    for (let i = 0; i < n; i++) list.push({ x: M.LX[lane], y: M.Y0 + jbQueueS(i) * 50, lit: false, alpha });
  });
  st.roll.forEach((r, lane) => { if (r.active) list.push({ x: M.LX[lane], y: M.Y0 + r.s * 50, lit: true, alpha: 1 }); });
  if (b && b.on === "queue") list.push({ x: b.x, y: b.y, lit: true, alpha: 1 });
  list.sort((p, q) => p.y - q.y || p.x - q.x);
  return {
    name,
    lift: jbLift(pose.lx, pose.cz) + (b && b.on === "lift" ? jbBlock(b.x, b.y, b.z, true, b.alpha) : ""),
    queue: list.map((o) => jbBlock(o.x, o.y, top, o.lit, o.alpha)).join(""),
    feed: b && b.on === "infeed" ? jbBlock(b.x, b.y, b.z, true, b.alpha) : "",
  };
}

function jbReadout(st) {
  const name = M.STEPS[st.step];
  const lane = st.lane + 1;
  const stuck = st.roll.some((r) => r.active && !r.pushed && r.v === 0);
  const say = name === "feed" ? "taking a block from the infeed" : name === "travel" ? `to lane ${lane}` : name === "raise" ? "raising to the top level" : name === "push" ? (st.wait ? `waiting: lane ${lane} busy` : `into lane ${lane}`) : "back for the next one";
  const rolling = st.roll.find((r) => r.active);
  const speed = rolling ? `${rolling.v.toFixed(2)} m/s down the lane` : st.staged ? `last block hit the queue at ${st.vHit.toFixed(2)} m/s` : "no block in a lane yet";
  return `${stuck ? "a block has stopped in its lane" : say} · ${speed}`;
}

function jbNumbers(st) {
  const empty = jbRunTo(st, M.LANE_M - M.S0);
  const run = empty.stalled !== undefined ? `stalls after ${empty.stalled.toFixed(1)} m` : `${empty.v.toFixed(2)} m/s`;
  return `${st.slope.toFixed(1)} % slope${st.broken ? " · speed controllers worn" : ""} · ${st.E.toFixed(1)} J into the queue · empty lane ${run} · safe below ${M.V_SAFE} m/s${st.stalls ? ` · ${st.stalls} pushed by hand` : ""}`;
}

// ---- self-check: the lift visits every step in order; at 2 % the controllers keep the hit speed below the limit, worn controllers do not, and 0.5 % stalls
{
  const run = (slope, broken, seconds) => {
    const st = jbState();
    st.slope = slope;
    st.broken = broken;
    const seen = [];
    for (let i = 0; i < 60 * seconds; i++) {
      jbStep(st, 1 / 60);
      const ph = M.STEPS[st.step];
      if (seen.at(-1) !== ph) seen.push(ph);
    }
    return { st, seen };
  };
  const ok = run(2, false, 120);
  const order = M.STEPS;
  if (JSON.stringify(ok.seen.slice(0, order.length)) !== JSON.stringify(order)) throw new Error(`lift order ${ok.seen.join(" → ")}`);
  if (!(ok.st.staged >= 3 && ok.st.vHit > 0 && ok.st.vHit <= M.V_SAFE)) throw new Error(`2 %: staged ${ok.st.staged}, hit ${ok.st.vHit.toFixed(2)} m/s`);
  const worn = run(2, true, 120);
  if (!(worn.st.vHit > M.V_SAFE)) throw new Error(`worn controllers: hit ${worn.st.vHit.toFixed(2)} m/s should be over ${M.V_SAFE}`);
  const flat = run(0.5, false, 120);
  if (!(flat.st.stalls > 0)) throw new Error("0.5 % should stall a block");
  console.log(`cycle check passed (${ok.st.staged} blocks staged in 2 min, ${ok.st.vHit.toFixed(2)} m/s at 2 %, ${worn.st.vHit.toFixed(2)} m/s with worn controllers, ${flat.st.stalls} pushed by hand at 0.5 %)`);
}

// ---- the live drawing, with slots for the moving pieces --------------------------------
function liveBody(f) {
  return [floor(), `<g data-slot="lift">${f.lift}</g>`, rack(f), infeed(f)];
}

function livePage() {
  const st = jbState();
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: liveBody(jbScene(st)) });
  const label = (ph) => ph[0].toUpperCase() + ph.slice(1);
  return liveHtml({
    k,
    title: "Junbiki · sequenced staging cycle",
    fig: "Junbiki",
    figTitle: "Sequenced staging cycle",
    key: "junbiki",
    svg,
    slots: ["lift", "queue", "feed"],
    steps: M.STEPS.filter((ph) => ph !== "next").map((ph) => [ph, label(ph)]),
    controls: [
      { kind: "range", key: "slope", label: "Lane slope", min: 0.5, max: 4, step: 0.5, value: 2, unit: "%", digits: 1 },
      { kind: "toggle", key: "broken", label: "Speed controllers worn" },
    ],
    header: `const P = ${JSON.stringify(P)};\nconst M = ${JSON.stringify(M)};`,
    fns: [jbState, jbTravelT, jbDur, jbAccel, jbRunTo, jbQueueS, jbStep, jbGo, jbPose, jbBlock, jbLift, jbScene, jbReadout, jbNumbers],
    model: { state: "jbState", step: "jbStep", go: "jbGo", dur: "jbDur", scene: "jbScene", readout: "jbReadout", numbers: "jbNumbers" },
    still: ["push", 0.5],
  });
}

if (!CHECK) {
  for (const theme of ["light", "dark"]) {
    const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body, standalone: theme });
    writeFileSync(join(OUT, `junbiki-${theme}.svg`), svg);
    console.log(`wrote ${join(OUT, `junbiki-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
  const html = livePage();
  writeFileSync(join(OUT, "junbiki-live.html"), html);
  console.log(`wrote ${join(OUT, "junbiki-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
}
