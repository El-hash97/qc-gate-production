// Isometric figure of the Product: the BC cylinder block casting (Block Cy 2TR BAGUS.stl) deck up on a
// turntable, for the Product panel and card in /overview. The still pictures and the live pages draw the same
// scene (product-core.mjs): the card's page redraws it as you turn it by hand (drag), tilt it (drag up and down)
// and zoom (wheel), and the panel's page turns it slowly by itself.
//   node station-kit/figure/stations/product.mjs [outDir]
//     →   <outDir>/product-{light,dark}.svg, <outDir>/product-live.html (the card) and
//         <outDir>/product-panel.html (the panel), both ?theme=dark|light
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/product.mjs --check   mesh and frame-cost self-check only
//
// The meshes are the 140,740-triangle scan thinned in Blender: Laplacian smooth (volume kept), planar dissolve
// (flat faces become single faces), then collapse to the target.
// Both: 3 smoothing passes and a 3° planar angle.
//   bc-2tr-hi.stl    32,000 triangles: the card whenever the block is still, and the stills
//   bc-2tr-lite.stl  11,000 triangles: the card while it moves, so dragging stays smooth, and the panel, which
//                    paints it on a canvas (no page to rebuild each frame) at about 30 pictures a second
// The 3D page loads public/models/bc-2tr-detail.stl (21 k triangles, plain collapse).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../iso-kit.mjs";
import * as C from "./product-core.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });

// ---- the meshes: STL (metres, bores along y, deck at -y) → world mm, bores along z, deck up ------------------
function meshOf(name) {
  const buf = readFileSync(fileURLToPath(new URL(`../mesh/${name}`, import.meta.url)));
  const tris = buf.readUInt32LE(80);
  const index = new Map();
  const raw = [];
  const f = [];
  for (let t = 0; t < tris; t++) {
    const at = 84 + t * 50 + 12;
    for (let c = 0; c < 3; c++) {
      const x = buf.readFloatLE(at + c * 12) * 1000, y = buf.readFloatLE(at + c * 12 + 4) * 1000, z = buf.readFloatLE(at + c * 12 + 8) * 1000;
      const key = `${Math.round(x * 10)},${Math.round(y * 10)},${Math.round(z * 10)}`;
      let i = index.get(key);
      if (i === undefined) { i = raw.length; index.set(key, i); raw.push([x, y, z]); }
      f.push(i);
    }
  }
  const lo = [0, 1, 2].map((a) => raw.reduce((m, p) => Math.min(m, p[a]), Infinity));
  const hi = [0, 1, 2].map((a) => raw.reduce((m, p) => Math.max(m, p[a]), -Infinity));
  // world x along the block, y across it, z up with the deck on top: (x, y, z) → (x, z, -y)
  const p = new Int16Array(raw.length * 3);
  raw.forEach(([x, y, z], i) => {
    p[i * 3] = Math.round((x - (lo[0] + hi[0]) / 2) * 10);
    p[i * 3 + 1] = Math.round((z - (lo[2] + hi[2]) / 2) * 10);
    p[i * 3 + 2] = Math.round((hi[1] - y + C.BLOCK_Z0) * 10);
  });
  return { p, f: Uint16Array.from(f), size: hi.map((h, a) => h - lo[a]) };
}
const MESH = { hi: meshOf("bc-2tr-hi.stl"), fine: meshOf("bc-2tr-lite.stl") };
const prepOf = (m) => C.prepare({ v: Float32Array.from(m.p, (n) => n / 10), f: m.f });
const b64 = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

// ---- what the figure says -----------------------------------------------------------------------------------
// measured on the full scan (Blender: 452 × 296 × 368 mm, volume 7.0 L); the thinned copies match within a few mm
const NUMBERS = `452 × 296 × 368 mm · 7.0 L of metal · about 50 kg in cast iron`;
const LABEL =
  "The BC cylinder block casting, deck up on a turntable: four bores in a row, the head-bolt bosses round the deck, the long gallery along the side and the main-bearing saddles under it. Drag to turn it, wheel to zoom.";
const HOME = { az: 32, el: 30 };

if (CHECK) {
  const bad = [];
  const faces = { hi: 32000, fine: 11000 };
  for (const [name, m] of Object.entries(MESH)) {
    const prep = prepOf(m);
    const t0 = performance.now();
    let chars = 0;
    for (let i = 0; i < 6; i++) chars = C.sceneSvg(k, C.viewOf(k, { az: i * 60, el: 30 }), prep).length;
    const ms = (performance.now() - t0) / 6;
    console.log(`${name}: ${m.p.length / 3} vertices, ${prep.n} faces; ${ms.toFixed(1)} ms and ${(chars / 1024).toFixed(0)} KB a frame`);
    if (prep.n !== faces[name]) bad.push(`${name}: expected ${faces[name]} faces, got ${prep.n}`);
    const [length, depth, across] = m.size;
    if (Math.abs(length - 452) > 6 || Math.abs(depth - 296) > 6 || Math.abs(across - 368) > 8) bad.push(`${name}: size ${length.toFixed(0)} × ${depth.toFixed(0)} × ${across.toFixed(0)}`);
    let minZ = Infinity;
    for (let i = 2; i < m.p.length; i += 3) minZ = Math.min(minZ, m.p[i] / 10);
    if (Math.abs(minZ - C.BLOCK_Z0) > 0.2) bad.push(`${name}: block rests at z ${minZ}, not ${C.BLOCK_Z0}`);
    // what moves must keep up: the card's moving copy, also the panel's
    if (name !== "hi" && ms > 40) bad.push(`${name}: a frame takes ${ms.toFixed(0)} ms`);
  }
  if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
  console.log("product check passed");
  process.exit(0);
}

const STYLE = `<style>${C.BLOCK_CSS}</style>`;
const PREP_HI = prepOf(MESH.hi);
for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({
    width: C.VIEW.width, height: C.VIEW.height, label: LABEL, standalone: theme,
    body: [STYLE, C.sceneSvg(k, C.viewOf(k, HOME), PREP_HI)],
  });
  writeFileSync(join(OUT, `product-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `product-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}

// ---- live pages ---------------------------------------------------------------------------------------------
const kitScript = () => readFileSync(new URL("../iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
const coreScript = () => readFileSync(new URL("./product-core.mjs", import.meta.url), "utf8").replace(/^export /gm, "");

const CSS = `<style>
html,body{height:100%}
body{background:var(--anatomy-card);display:flex;flex-direction:column}
.iso-page{flex:1;min-height:0;width:100%;margin:0;padding:0;display:flex;flex-direction:column}
.iso-figure{flex:1;min-height:0;margin:0;display:flex;flex-direction:column}
.iso-plate{flex:1;min-height:0;display:flex;padding:28px 10px 24px;box-shadow:none}
.iso-plate-corners{inset:10px 12px}
.iso-stage{flex:1;min-height:0;display:flex;outline:none;cursor:grab;touch-action:none;user-select:none}
.iso-stage[data-drag]{cursor:grabbing}
.iso-stage .iso-svg{display:block;width:100%;height:100%}
.bari-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 12px 12px;font:12px/1.3 ui-sans-serif,system-ui,sans-serif;color:var(--anatomy-text)}
.bari-ctl button{font:inherit;color:inherit;background:transparent;border:1px solid var(--anatomy-mid);border-radius:999px;padding:4px 10px;cursor:pointer}
.bari-ctl button:hover{color:var(--anatomy-strong);border-color:var(--anatomy-text)}
.bari-ctl button[aria-pressed="true"],.bari-ctl button[aria-current="step"]{color:var(--anatomy-card);background:var(--anatomy-strong);border-color:var(--anatomy-strong)}
.bari-play{width:30px;padding:4px 0!important}
.bari-steps{display:flex;flex-wrap:wrap;gap:4px}
.bari-p{display:flex;align-items:center;gap:6px;margin-left:auto}
.bari-p input{width:110px;accent-color:var(--anatomy-strong)}
.bari-p output{min-width:40px;font-variant-numeric:tabular-nums}
.bari-num{flex-basis:100%;color:var(--anatomy-muted);font:11px/1.3 var(--anatomy-mono);font-variant-numeric:tabular-nums}
/* the panel in the overview: the picture alone on a clear ground, turning by itself */
body.mini{background:transparent}
.mini .iso-plate{padding:0;background:transparent}
.mini .iso-plate-corners,.mini .bari-ctl{display:none}
.mini .iso-stage{cursor:pointer;pointer-events:none;position:relative}
/* the casting is painted on a canvas over the turntable, so the panel can turn smoothly */
.mini .iso-stage canvas{position:absolute;inset:0;width:100%;height:100%}
@media (max-width:480px){
.iso-plate{padding:24px 4px 20px}
.iso-plate-corner[data-corner="hint"],.bari-num{display:none}
.bari-ctl{gap:4px 6px;padding:6px 8px 8px;font-size:11px}
.bari-ctl button{padding:3px 7px}
.bari-p{margin-left:0}
.bari-p input{width:84px}
}
${C.BLOCK_CSS}
</style>`;

const VIEWS = [["iso", "Iso", HOME], ["deck", "Deck", { az: 0, el: 62 }], ["front", "Front", { az: 0, el: 12 }], ["end", "End", { az: 90, el: 12 }]];

// the card's page: still by default, drawn from the 32 k mesh; while it moves it draws the 11 k copy and goes back
// to the fine picture a moment after it stops. The panel's page: the 11 k copy on a canvas, turning by itself.
function livePage(panel) {
  const meshes = panel ? { move: MESH.fine } : { move: MESH.fine, still: MESH.hi };
  // the scene is drawn on load from the meshes below, so the page carries no prebuilt picture
  const svg = k.figureSvg({ width: C.VIEW.width, height: C.VIEW.height, label: LABEL, body: [`<g data-slot="scene"></g>`] });
  const views = VIEWS.map(([id, label]) => `<button type="button" data-view="${id}">${label}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Turn">▶</button>
<div class="bari-steps" role="group" aria-label="Jump to a view">${views}</div>
<label class="bari-p">Zoom <input type="range" data-zoom min="0.6" max="2.5" step="0.05" value="1" aria-label="Zoom"><output>1.0×</output></label>
<div class="bari-num">${NUMBERS}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "BC 2TR",
    title: "Cylinder block casting",
    hint: "Drag to turn · wheel to zoom",
    readout: "",
    body: `<div class="iso-stage" tabindex="0" aria-label="BC cylinder block, drag to turn it, wheel to zoom, double-click to reset">${svg}${panel ? `<canvas aria-hidden="true"></canvas>` : ""}</div>`,
  });
  const live = `
const k = { ${Object.keys(k).join(", ")} };
const MESHES = { ${Object.entries(meshes).map(([id, m]) => `${id}: { p: "${b64(m.p)}", f: "${b64(m.f)}" }`).join(", ")} };
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
const unpack = (m) => ({ v: Float32Array.from(new Int16Array(bytes(m.p)), (n) => n / 10), f: new Uint16Array(bytes(m.f)) });
const preps = {};
const prepOf = (id) => preps[id] ?? (preps[id] = prepare(unpack(MESHES[id])));
const mini = ${panel};
const VIEWS = ${JSON.stringify(Object.fromEntries(VIEWS.map(([id, , v]) => [id, v])))};
const q = new URLSearchParams(location.search);
if (q.get("theme") === "light" || q.get("theme") === "dark") { document.body.dataset.theme = q.get("theme"); document.documentElement.style.colorScheme = q.get("theme"); }
// transparent only when the frame's colour scheme is the host page's (the app's is the default one)
if (mini) { document.body.classList.add("mini"); document.documentElement.style.colorScheme = "normal"; }
const stage = document.querySelector(".iso-stage");
const slot = stage.querySelector('[data-slot="scene"]');
const readout = document.querySelector("[data-readout]");
const playBtn = document.querySelector('[data-act="play"]');
const zoomInput = document.querySelector("[data-zoom]");
const zoomOut = zoomInput.nextElementSibling;
const viewBtns = [...document.querySelectorAll("[data-view]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const HOME = VIEWS.iso;
const view = { az: HOME.az, el: HOME.el, zoom: 1 };
let goal = null, turning = mini && !still.matches, dirty = false, visible = true, frame = 0, last = 0, drag = null;
// what the picture on screen was drawn from, and the timer that swaps in the fine one once the block is still
let shown = MESHES.still ? "still" : "move", settle = 0;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
// the panel: the turntable stays SVG, the casting is painted on the canvas over it with the same faces and tones
const canvas = stage.querySelector("canvas");
const ctx = canvas && canvas.getContext("2d");
const colors = rampOf(document.body.dataset.theme === "dark" ? "dark" : "light");
const lineColor = getComputedStyle(document.body).getPropertyValue("--anatomy-mid").trim();
function paint(P) {
  slot.innerHTML = sceneSvg(k, P, null, { block: false });
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  // the SVG's own fit (viewBox, centred, whole picture shown), so canvas and SVG line up exactly
  const s = Math.min(r.width / VIEW.width, r.height / VIEW.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, (dpr * (r.width - VIEW.width * s)) / 2, (dpr * (r.height - VIEW.height * s)) / 2);
  blockCanvas(ctx, k, P, prepOf("move"), colors, lineColor, 1 / s);
}
function draw(id) {
  shown = id;
  if (ctx) paint(viewOf(k, view)); else slot.innerHTML = sceneSvg(k, viewOf(k, view), prepOf(id));
  readout.textContent = "turn " + String(Math.round(((view.az % 360) + 360) % 360)).padStart(3, "0") + "° · tilt " + Math.round(view.el) + "° · " + view.zoom.toFixed(2) + "×";
  zoomInput.value = view.zoom;
  zoomOut.textContent = view.zoom.toFixed(1) + "×";
  const name = goal ? goal.id : viewBtns.find((b) => { const v = VIEWS[b.dataset.view]; return Math.abs(wrap(view.az - v.az)) < 1 && Math.abs(view.el - v.el) < 1; })?.dataset.view;
  for (const b of viewBtns) if (b.dataset.view === name) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
const moving = () => !!(goal || drag || turning);
function tick(now) {
  if (mini && last && now - last < 32) { frame = visible ? requestAnimationFrame(tick) : 0; return; }
  const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 1 / 60;
  last = now;
  if (goal) {
    const f = 1 - Math.exp(-dt / 0.16);
    view.az += wrap(goal.az - view.az) * f;
    view.el += (goal.el - view.el) * f;
    view.zoom += (goal.zoom - view.zoom) * f;
    if (Math.abs(wrap(goal.az - view.az)) < 0.2 && Math.abs(goal.el - view.el) < 0.2 && Math.abs(goal.zoom - view.zoom) < 0.005) { Object.assign(view, goal); goal = null; }
    dirty = true;
  } else if (turning && !drag) {
    view.az = (view.az + 8 * dt) % 360;
    dirty = true;
  }
  if (dirty) { dirty = false; draw("move"); }
  // still again: the fine picture, a moment later so a pause in a drag doesn't stall it
  clearTimeout(settle);
  if (MESHES.still && !moving() && shown !== "still") settle = setTimeout(() => { if (!moving()) draw("still"); }, 140);
  frame = visible && moving() ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const nudge = () => { dirty = true; run(); };
const showTurning = () => { playBtn.textContent = turning ? "❚❚" : "▶"; playBtn.setAttribute("aria-label", turning ? "Pause" : "Turn"); };
const setTurning = (on) => { turning = on; showTurning(); if (on) run(); else nudge(); };
playBtn.addEventListener("click", () => setTurning(!turning));
for (const b of viewBtns) b.addEventListener("click", () => { goal = { id: b.dataset.view, ...VIEWS[b.dataset.view], zoom: view.zoom }; run(); });
zoomInput.addEventListener("input", () => { goal = null; view.zoom = Number(zoomInput.value); nudge(); });
if (!mini) {
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; goal = null; stage.setPointerCapture(e.pointerId); stage.dataset.drag = ""; });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    view.az = (view.az - (e.clientX - drag.x) * 0.45 + 360) % 360;
    view.el = clamp(view.el + (e.clientY - drag.y) * 0.3, TILT[0], TILT[1]);
    drag = { x: e.clientX, y: e.clientY };
    nudge();
  });
  const end = () => { drag = null; delete stage.dataset.drag; nudge(); };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("wheel", (e) => { e.preventDefault(); goal = null; view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * 0.0015), 0.6, 2.5); nudge(); }, { passive: false });
  stage.addEventListener("dblclick", () => { goal = { id: "iso", ...HOME, zoom: 1 }; run(); });
  stage.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
    if (step) { e.preventDefault(); goal = null; view.az = (view.az + step[0] + 360) % 360; view.el = clamp(view.el + step[1], TILT[0], TILT[1]); nudge(); }
    else if (e.key === " ") { e.preventDefault(); setTurning(!turning); }
    else if (e.key === "+" || e.key === "-") { view.zoom = clamp(view.zoom * (e.key === "+" ? 1.1 : 1 / 1.1), 0.6, 2.5); nudge(); }
  });
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible && moving()) run(); else if (!visible) { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible && moving()) run(); });
showTurning();
draw(shown);
if (turning) run();
window.__product = { view, draw: (v, id = MESHES.still ? "still" : "move") => { Object.assign(view, v); goal = null; draw(id); }, setTurning };
`;
  return k.pageHtml({ title: panel ? "BC cylinder block" : "BC cylinder block · interactive", theme: "light", body: CSS + plate + controls, script: kitScript() + coreScript() + live, width: 640 });
}

for (const [file, panel] of [["product-live.html", false], ["product-panel.html", true]]) {
  const html = livePage(panel);
  writeFileSync(join(OUT, file), html);
  console.log(`wrote ${join(OUT, file)} (${(html.length / 1024).toFixed(0)} KB)`);
}
