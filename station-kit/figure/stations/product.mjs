// Isometric figure of the Product: the BC cylinder block casting (Block Cy 2TR BAGUS.stl) deck up on a
// turntable, for the Product panel and card in /overview. The still pictures and the live page draw the same
// scene (product-core.mjs): the page redraws it every frame, so the block can be turned by hand (drag), tilted
// (drag up and down) and zoomed (wheel), and turns by itself when nobody touches it.
//   node station-kit/figure/stations/product.mjs [outDir]
//     →   <outDir>/product-{light,dark}.svg and <outDir>/product-live.html (?theme=dark|light, ?mini for the panel)
//   (outDir defaults to public/stations, relative to where you run it)
//   node station-kit/figure/stations/product.mjs --check   mesh and frame-cost self-check only
//
// The mesh is station-kit/figure/mesh/bc-2tr-lite.stl: the 140,740-triangle scan thinned to 7,037 triangles in
// Blender (Decimate, collapse, ratio 0.05). The 3D page loads public/models/bc-2tr-detail.stl (21 k triangles).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../iso-kit.mjs";
import * as C from "./product-core.mjs";

const CHECK = process.argv.includes("--check");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/stations");
if (!CHECK) mkdirSync(OUT, { recursive: true });

// ---- the mesh: STL (metres, bores along y, deck at -y) → world mm, bores along z, deck up --------------------
function meshOf(path) {
  const buf = readFileSync(path);
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
  const lo = [0, 1, 2].map((a) => Math.min(...raw.map((p) => p[a])));
  const hi = [0, 1, 2].map((a) => Math.max(...raw.map((p) => p[a])));
  // world x along the block, y across it, z up with the deck on top: (x, y, z) → (x, z, -y)
  const p = new Int16Array(raw.length * 3);
  raw.forEach(([x, y, z], i) => {
    p[i * 3] = Math.round((x - (lo[0] + hi[0]) / 2) * 10);
    p[i * 3 + 1] = Math.round((z - (lo[2] + hi[2]) / 2) * 10);
    p[i * 3 + 2] = Math.round((hi[1] - y + C.BLOCK_Z0) * 10);
  });
  return { p, f: Uint16Array.from(f), size: hi.map((h, a) => h - lo[a]) };
}
const SRC = meshOf(fileURLToPath(new URL("../mesh/bc-2tr-lite.stl", import.meta.url)));
const mesh = { v: Float32Array.from(SRC.p, (n) => n / 10), f: SRC.f };
const prep = C.prepare(mesh);
const b64 = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

// ---- what the figure says -----------------------------------------------------------------------------------
// measured on the full scan (Blender: 452 × 296 × 368 mm, volume 7.0 L); the thinned copy only has to match within a few mm
const NUMBERS = `452 × 296 × 368 mm · 7.0 L of metal · about 50 kg in cast iron`;
const LABEL =
  "The BC cylinder block casting, deck up on a turntable: four bores in a row, the head-bolt bosses round the deck, the long gallery along the side and the main-bearing saddles under it. Drag to turn it, wheel to zoom.";

const STYLE = `<style>${C.BLOCK_CSS}</style>`;
const still = (theme) => k.figureSvg({
  width: C.VIEW.width, height: C.VIEW.height, label: LABEL, standalone: theme,
  body: [STYLE, C.sceneSvg(k, C.viewOf(k, { az: 32, el: 30 }), prep)],
});

if (CHECK) {
  const t0 = performance.now();
  let chars = 0;
  for (let i = 0; i < 20; i++) chars = C.sceneSvg(k, C.viewOf(k, { az: i * 18, el: 30 }), prep).length;
  const ms = (performance.now() - t0) / 20;
  console.log(`mesh ${mesh.v.length / 3} vertices, ${prep.n} faces, ${prep.edges.length} edges; ${ms.toFixed(1)} ms and ${(chars / 1024).toFixed(0)} KB a frame`);
  const bad = [];
  if (prep.n < 5000 || prep.n > 12000) bad.push(`expected about 7,000 faces, got ${prep.n}`);
  const [length, depth, across] = SRC.size;
  if (Math.abs(length - 452) > 6 || Math.abs(depth - 296) > 6 || Math.abs(across - 368) > 8) bad.push(`size ${length.toFixed(0)} × ${depth.toFixed(0)} × ${across.toFixed(0)}`);
  let minZ = Infinity;
  for (let i = 2; i < mesh.v.length; i += 3) minZ = Math.min(minZ, mesh.v[i]);
  if (Math.abs(minZ - C.BLOCK_Z0) > 0.2) bad.push(`block rests at z ${minZ}, not ${C.BLOCK_Z0}`);
  if (ms > 60) bad.push(`frame takes ${ms.toFixed(0)} ms`);
  if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
  console.log("product check passed");
  process.exit(0);
}

for (const theme of ["light", "dark"]) {
  const svg = still(theme);
  writeFileSync(join(OUT, `product-${theme}.svg`), svg);
  console.log(`wrote ${join(OUT, `product-${theme}.svg`)} (${(svg.length / 1024).toFixed(0)} KB)`);
}

// ---- live page ----------------------------------------------------------------------------------------------
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
.mini .iso-stage{cursor:pointer;pointer-events:none}
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

const VIEWS = [["iso", "Iso", { az: 32, el: 30 }], ["deck", "Deck", { az: 0, el: 62 }], ["front", "Front", { az: 0, el: 12 }], ["end", "End", { az: 90, el: 12 }]];

function livePage() {
  const svg = k.figureSvg({
    width: C.VIEW.width, height: C.VIEW.height, label: LABEL,
    body: [`<g data-slot="scene">${C.sceneSvg(k, C.viewOf(k, { az: 32, el: 30 }), prep)}</g>`],
  });
  const views = VIEWS.map(([id, label]) => `<button type="button" data-view="${id}">${label}</button>`).join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a view">${views}</div>
<label class="bari-p">Zoom <input type="range" data-zoom min="0.6" max="2.5" step="0.05" value="1" aria-label="Zoom"><output>1.0×</output></label>
<div class="bari-num">${NUMBERS}</div>
</div>`;
  const plate = k.plateHtml({
    fig: "BC 2TR",
    title: "Cylinder block casting",
    hint: "Drag to turn · wheel to zoom",
    readout: "",
    body: `<div class="iso-stage" tabindex="0" aria-label="BC cylinder block, drag to turn it, wheel to zoom, double-click to reset">${svg}</div>`,
  });
  const live = `
const k = { ${Object.keys(k).join(", ")} };
const MESH = { p: "${b64(SRC.p)}", f: "${b64(SRC.f)}" };
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
const mesh = { v: Float32Array.from(new Int16Array(bytes(MESH.p)), (n) => n / 10), f: new Uint16Array(bytes(MESH.f)) };
const prep = prepare(mesh);
const VIEWS = ${JSON.stringify(Object.fromEntries(VIEWS.map(([id, , v]) => [id, v])))};
const q = new URLSearchParams(location.search);
if (q.get("theme") === "light" || q.get("theme") === "dark") { document.body.dataset.theme = q.get("theme"); document.documentElement.style.colorScheme = q.get("theme"); }
const mini = q.has("mini");
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
let goal = null, turning = !still.matches, resumeAt = 0, dirty = true, visible = true, frame = 0, last = 0, drag = null;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
function draw() {
  const P = viewOf(k, view);
  slot.innerHTML = sceneSvg(k, P, prep);
  readout.textContent = "turn " + String(Math.round(((view.az % 360) + 360) % 360)).padStart(3, "0") + "° · tilt " + Math.round(view.el) + "° · " + view.zoom.toFixed(2) + "×";
  zoomInput.value = view.zoom;
  zoomOut.textContent = view.zoom.toFixed(1) + "×";
  const name = goal ? goal.id : viewBtns.find((b) => { const v = VIEWS[b.dataset.view]; return Math.abs(wrap(view.az - v.az)) < 1 && Math.abs(view.el - v.el) < 1; })?.dataset.view;
  for (const b of viewBtns) if (b.dataset.view === name) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
function tick(now) {
  // the panel in the overview shares the page with the 3D line: it turns at about 20 pictures a second
  if (mini && last && now - last < 48) { frame = visible ? requestAnimationFrame(tick) : 0; return; }
  const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 1 / 60;
  last = now;
  if (goal) {
    const f = 1 - Math.exp(-dt / 0.16);
    view.az += wrap(goal.az - view.az) * f;
    view.el += (goal.el - view.el) * f;
    view.zoom += (goal.zoom - view.zoom) * f;
    if (Math.abs(wrap(goal.az - view.az)) < 0.2 && Math.abs(goal.el - view.el) < 0.2 && Math.abs(goal.zoom - view.zoom) < 0.005) { Object.assign(view, goal); goal = null; }
    dirty = true;
  } else if (turning && !drag && now > resumeAt) {
    view.az = (view.az + 8 * dt) % 360;
    dirty = true;
  }
  if (dirty) { dirty = false; draw(); }
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const setTurning = (on) => {
  turning = on;
  playBtn.textContent = on ? "❚❚" : "▶";
  playBtn.setAttribute("aria-label", on ? "Pause" : "Turn");
};
const touch = () => { resumeAt = performance.now() + 2500; };
playBtn.addEventListener("click", () => { setTurning(!turning); resumeAt = 0; });
for (const b of viewBtns) b.addEventListener("click", () => { goal = { id: b.dataset.view, ...VIEWS[b.dataset.view], zoom: view.zoom }; run(); });
zoomInput.addEventListener("input", () => { goal = null; view.zoom = Number(zoomInput.value); dirty = true; touch(); run(); });
if (!mini) {
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; goal = null; stage.setPointerCapture(e.pointerId); stage.dataset.drag = ""; });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    view.az = (view.az - (e.clientX - drag.x) * 0.45 + 360) % 360;
    view.el = clamp(view.el + (e.clientY - drag.y) * 0.3, TILT[0], TILT[1]);
    drag = { x: e.clientX, y: e.clientY };
    dirty = true; run();
  });
  const end = () => { drag = null; delete stage.dataset.drag; touch(); };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("wheel", (e) => { e.preventDefault(); goal = null; view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * 0.0015), 0.6, 2.5); dirty = true; touch(); run(); }, { passive: false });
  stage.addEventListener("dblclick", () => { goal = { id: "iso", ...HOME, zoom: 1 }; run(); });
  stage.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
    if (step) { e.preventDefault(); goal = null; view.az = (view.az + step[0] + 360) % 360; view.el = clamp(view.el + step[1], TILT[0], TILT[1]); dirty = true; touch(); run(); }
    else if (e.key === " ") { e.preventDefault(); setTurning(!turning); resumeAt = 0; }
    else if (e.key === "+" || e.key === "-") { view.zoom = clamp(view.zoom * (e.key === "+" ? 1.1 : 1 / 1.1), 0.6, 2.5); dirty = true; run(); }
  });
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
setTurning(turning);
draw();
run();
window.__product = { view, draw: (v) => { Object.assign(view, v); goal = null; draw(); }, setTurning };
`;
  return k.pageHtml({ title: "BC cylinder block · interactive", theme: "light", body: CSS + plate + controls, script: kitScript() + coreScript() + live, width: 640 });
}

const html = livePage();
writeFileSync(join(OUT, "product-live.html"), html);
console.log(`wrote ${join(OUT, "product-live.html")} (${(html.length / 1024).toFixed(0)} KB)`);
