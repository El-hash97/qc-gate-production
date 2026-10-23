// The live (moving) drawing page shared by the stations that do not carry their own copy of it
// (Spray Booth, Junbiki, Line Repair). A station script gives it: the drawing with a slot for each moving
// piece, a cycle model (state / step / go / dur) and a scene function (state → slot contents), plus the
// readout and numbers text. The page runs the same functions the build uses, with the kit inlined.
//
//   liveHtml({ k, title, fig, figTitle, hint, key, svg, slots, steps, controls, header, fns,
//              model: { state, step, go, dur, scene, readout, numbers }, still: [phase, u] })
import { readFileSync } from "node:fs";

// the kit as plain script: the page draws with the same functions as the build
export function kitScript() {
  return readFileSync(new URL("./iso-kit.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
}

// a function's source as it must read inside the page
export const fnSource = (fn) => (fn.toString().startsWith("function") ? `${fn}` : `const ${fn.name} = ${fn}`);

const CSS = `<style>
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
.bari-ctl button[aria-current="step"],.bari-ctl button[aria-pressed="true"]{color:var(--anatomy-card);background:var(--anatomy-strong);border-color:var(--anatomy-strong)}
.bari-play{width:30px;padding:4px 0!important}
.bari-steps{display:flex;flex-wrap:wrap;gap:4px}
.bari-p{display:flex;align-items:center;gap:6px}
.bari-p:first-of-type{margin-left:auto}
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

export function liveHtml(c) {
  const { k, model: m } = c;
  const steps = c.steps.map(([ph, label]) => `<button type="button" data-go="${ph}">${label}</button>`).join("");
  const ctl = (c.controls ?? [])
    .map((x) =>
      x.kind === "toggle"
        ? `<button type="button" data-toggle="${x.key}" aria-pressed="false">${x.label}</button>`
        : `<label class="bari-p">${x.label} <input type="range" data-range="${x.key}" data-digits="${x.digits ?? 1}" data-unit="${x.unit ?? ""}" min="${x.min}" max="${x.max}" step="${x.step}" value="${x.value}" aria-label="${x.label}${x.unit ? `, ${x.unit}` : ""}"><output>${Number(x.value).toFixed(x.digits ?? 1)}${x.unit ? ` ${x.unit}` : ""}</output></label>`,
    )
    .join("");
  const controls = `<div class="bari-ctl">
<button type="button" class="bari-play" data-act="play" aria-label="Pause">❚❚</button>
<div class="bari-steps" role="group" aria-label="Jump to a step">${steps}</div>
${ctl}
<div class="bari-num" data-numbers></div>
</div>`;
  const plate = k.plateHtml({
    fig: c.fig,
    title: c.figTitle,
    hint: c.hint ?? "Click to pause",
    readout: "",
    body: `<div class="iso-stage" tabindex="0" aria-label="${c.fig} cycle, click or press space to pause">${c.svg}</div>`,
  });
  const live = `
const k = { ${Object.keys(k).join(", ")} };
${c.header}
${c.fns.map(fnSource).join("\n")}
const theme = new URLSearchParams(location.search).get("theme");
if (theme === "light" || theme === "dark") { document.body.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slots = ${JSON.stringify(c.slots)}.reduce((o, n) => ((o[n] = svg.querySelector('[data-slot="' + n + '"]')), o), {});
const readout = document.querySelector("[data-readout]");
const numbers = document.querySelector("[data-numbers]");
const playBtn = document.querySelector('[data-act="play"]');
const stepBtns = [...document.querySelectorAll("[data-go]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const st = ${m.state}();
const html = (el, value) => { if (el.__v !== value) { el.__v = value; el.innerHTML = value; } };
function draw() {
  const f = ${m.scene}(st);
  for (const n in slots) html(slots[n], f[n]);
  const text = ${m.readout}(st);
  if (readout.textContent !== text) readout.textContent = text;
  const nums = ${m.numbers}(st);
  if (numbers.textContent !== nums) numbers.textContent = nums;
  for (const b of stepBtns) if (b.dataset.go === f.name) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
}
// review shots and the still picture: jump into a step and run it this far
function at(phase, u = 0) {
  ${m.go}(st, phase);
  const d = ${m.dur}(st);
  for (let t = 0; t < u * d - 1e-9; t += 1 / 60) ${m.step}(st, 1 / 60);
  draw();
  return ${m.readout}(st);
}
let playing = !still.matches, visible = true, frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  ${m.step}(st, dt);
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
for (const b of stepBtns) b.addEventListener("click", () => { ${m.go}(st, b.dataset.go); draw(); });
for (const input of document.querySelectorAll("[data-range]")) {
  const out = input.nextElementSibling;
  const show = () => { out.textContent = Number(input.value).toFixed(Number(input.dataset.digits)) + (input.dataset.unit ? " " + input.dataset.unit : ""); };
  input.addEventListener("input", () => { st[input.dataset.range] = Number(input.value); show(); draw(); });
}
for (const b of document.querySelectorAll("[data-toggle]")) b.addEventListener("click", () => {
  st[b.dataset.toggle] = !st[b.dataset.toggle];
  b.setAttribute("aria-pressed", String(st[b.dataset.toggle]));
  draw();
});
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
if (still.matches) at(${JSON.stringify(c.still[0])}, ${c.still[1]}); else draw();
setPlaying(playing);
window.__${c.key} = { at, st, setPlaying };
`;
  return k.pageHtml({ title: c.title, theme: "light", body: CSS + plate + controls, script: kitScript() + live, width: 640 });
}
