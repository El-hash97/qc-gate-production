// The Product figure's drawing: the cylinder block casting (Block Cy 2TR BAGUS.stl, thinned to about 7,000
// triangles) standing deck up on a turntable, drawn as isometric solids. The build (product.mjs) draws the
// still pictures with these functions and the live page inlines this file after the kit, so the browser redraws
// every frame with the same code. Every function takes the kit `k` as its first argument.
//
// World: millimetres, z up. The casting's bores are vertical; its deck face is up, its crankcase face on the pads.

export const TABLE = { r: 310, base: 14, ring: 10, pad: 10 };
export const BLOCK_Z0 = TABLE.base + TABLE.ring + TABLE.pad; // the lowest point of the casting
const TOP = 335; // a hair over the highest point of the casting, for fitting
const CREASE = Math.cos((62 * Math.PI) / 180); // an edge between faces more bent than this is drawn as a line
const WIDTH = 640;
const HEIGHT = 420;
export const TILT = [12, 62]; // the elevation range the picture can be tilted through, degrees

// mesh: { v: Float32Array of x y z (mm, world), f: Uint16Array of vertex triples } → face normals and edges
export function prepare(mesh) {
  const { v, f } = mesh;
  const n = f.length / 3;
  const nrm = new Float32Array(n * 3);
  const vn = new Float32Array(v.length);
  const edges = [];
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const a = f[i * 3] * 3, b = f[i * 3 + 1] * 3, c = f[i * 3 + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx;
    const len = Math.hypot(x, y, z) || 1;
    nrm[i * 3] = x / len; nrm[i * 3 + 1] = y / len; nrm[i * 3 + 2] = z / len;
    for (const o of [a, b, c]) { vn[o] += x / len; vn[o + 1] += y / len; vn[o + 2] += z / len; }
    for (let e = 0; e < 3; e++) {
      const p = f[i * 3 + e], q = f[i * 3 + ((e + 1) % 3)];
      const key = p < q ? p * 65536 + q : q * 65536 + p;
      const at = seen.get(key);
      if (at === undefined) {
        seen.set(key, edges.length);
        edges.push({ a: p, b: q, f0: i, f1: -1, crease: false });
      } else if (edges[at].f1 < 0) edges[at].f1 = i;
    }
  }
  for (const e of edges) {
    if (e.f1 < 0) { e.crease = true; continue; }
    const d = nrm[e.f0 * 3] * nrm[e.f1 * 3] + nrm[e.f0 * 3 + 1] * nrm[e.f1 * 3 + 1] + nrm[e.f0 * 3 + 2] * nrm[e.f1 * 3 + 2];
    e.crease = d < CREASE;
  }
  // the shading normal of a face is the mean of its corners' normals, so the faces shade as one smooth surface
  const snr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    for (let c = 0; c < 3; c++) { const o = f[i * 3 + c] * 3; const l = Math.hypot(vn[o], vn[o + 1], vn[o + 2]) || 1; x += vn[o] / l; y += vn[o + 1] / l; z += vn[o + 2] / l; }
    const len = Math.hypot(x, y, z) || 1;
    snr[i * 3] = x / len; snr[i * 3 + 1] = y / len; snr[i * 3 + 2] = z / len;
  }
  return { v, f, n, nrm, snr, edges };
}

const fix = (n) => (Math.round(n * 10) / 10).toString();

// the casting as depth-sorted flat faces in five tones, each with the creases and outline edges it owns
export function blockSvg(k, P, prep) {
  const { v, f, n, nrm, snr, edges } = prep;
  const { sinA, cosA, sinE, cosE, k: kk } = k.cameraOf(P);
  const [ox, oy] = P.origin;
  const vx = cosA * cosE, vy = sinA * cosE, vz = sinE;
  // the light rides with the camera: from the upper left, a little toward the viewer
  const lx = -0.5 * sinA + 0.45 * vx, ly = 0.5 * cosA + 0.45 * vy, lz = 0.45 * vz + 0.75;
  const ll = Math.hypot(lx, ly, lz);
  const vertices = v.length / 3;
  const sx = new Float32Array(vertices), sy = new Float32Array(vertices), depth = new Float32Array(vertices);
  for (let i = 0; i < vertices; i++) {
    const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
    sx[i] = ox + (x * sinA - y * cosA) * kk;
    sy[i] = oy + ((x * cosA + y * sinA) * sinE - z * cosE) * kk;
    depth[i] = (x * cosA + y * sinA) * cosE + z * sinE;
  }
  const key = new Float32Array(n);
  const order = [];
  for (let i = 0; i < n; i++) {
    if (nrm[i * 3] * vx + nrm[i * 3 + 1] * vy + nrm[i * 3 + 2] * vz <= 0.001) { key[i] = NaN; continue; }
    key[i] = depth[f[i * 3]] + depth[f[i * 3 + 1]] + depth[f[i * 3 + 2]];
    order.push(i);
  }
  order.sort((a, b) => key[a] - key[b]);
  const hi = new Map(), lo = new Map();
  const own = (map, i, a, b) => map.set(i, (map.get(i) ?? "") + `M${fix(sx[a])} ${fix(sy[a])}L${fix(sx[b])} ${fix(sy[b])}`);
  for (const e of edges) {
    const v0 = !Number.isNaN(key[e.f0]);
    const v1 = e.f1 >= 0 && !Number.isNaN(key[e.f1]);
    if (!v0 && !v1) continue;
    // both faces seen: a crease is a line on the nearer one; one face seen: the outline (or a crease on the open edge)
    if (v0 && v1) { if (e.crease) own(lo, key[e.f0] > key[e.f1] ? e.f0 : e.f1, e.a, e.b); }
    else own(hi, v0 ? e.f0 : e.f1, e.a, e.b);
  }
  let out = "";
  for (const i of order) {
    const a = f[i * 3], b = f[i * 3 + 1], c = f[i * 3 + 2];
    const lam = (snr[i * 3] * lx + snr[i * 3 + 1] * ly + snr[i * 3 + 2] * lz) / ll;
    const tone = lam < -0.15 ? 0 : lam < 0.12 ? 1 : lam < 0.38 ? 2 : lam < 0.62 ? 3 : 4;
    out += `<path class="pm" data-t="${tone}" d="M${fix(sx[a])} ${fix(sy[a])}L${fix(sx[b])} ${fix(sy[b])}L${fix(sx[c])} ${fix(sy[c])}Z"/>`;
    const h = hi.get(i), l = lo.get(i);
    if (l) out += `<path class="iso-line" data-tone="faint" d="${l}"/>`;
    if (h) out += `<path class="iso-line" data-tone="mid" d="${h}"/>`;
  }
  return out;
}

// the projection for a view: the table always fills the picture, whatever the turn and tilt
export function viewOf(k, { az = 45, el = 30, zoom = 1 } = {}) {
  const ring = (z) => Array.from({ length: 36 }, (_, i) => [Math.cos((i / 36) * Math.PI * 2) * TABLE.r, Math.sin((i / 36) * Math.PI * 2) * TABLE.r, z]);
  const fit = k.fitProjection([...ring(0), ...ring(TOP)], WIDTH, HEIGHT, { pad: 30, azimuth: 45, elevation: el });
  const cx = WIDTH / 2, cy = HEIGHT / 2;
  return { ...fit, azimuth: az, scale: fit.scale * zoom, origin: [cx + (fit.origin[0] - cx) * zoom, cy + (fit.origin[1] - cy) * zoom] };
}

// the whole picture: turntable, pads and casting, back to front
export function sceneSvg(k, P, prep) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const ringTop = TABLE.base + TABLE.ring;
  const ticks = k.radialTicks(0, 0, TABLE.r - 18, 72, 6, ringTop, [4, 9], P);
  const zero = k.radialTicks(0, 0, TABLE.r - 18, 1, 1, ringTop, [14, 14], P);
  const screws = Array.from({ length: 8 }, (_, i) => {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    return k.iso([Math.cos(a) * (TABLE.r - 8), Math.sin(a) * (TABLE.r - 8), TABLE.base], P);
  });
  const pads = [[-150, -118], [90, -118], [-150, 78], [90, 78]]
    .map(([x, y]) => ({ x, y, w: 60, d: 40, r: 3 }))
    .sort((a, b) => k.depthOf([a.x + 30, a.y + 20, 0], P) - k.depthOf([b.x + 30, b.y + 20, 0], P));
  return [
    S(k.cylinder(0, 0, TABLE.r, 0, TABLE.base, P, 56, 1.2), { tone: "lo", halo: true }),
    k.dotsSvg(screws, { size: 0.55, tone: "mid" }),
    S(k.cylinder(0, 0, TABLE.r - 12, TABLE.base, TABLE.ring, P, 56, 0.8), { tone: "mid" }),
    k.lineSvg(ticks.minor, { tone: "lo" }),
    k.lineSvg(ticks.major, { tone: "mid" }),
    k.lineSvg(zero.major, { tone: "hi" }),
    ...pads.map((plan) => S(k.slabOf(plan, ringTop, TABLE.pad, P, 3, 0.5), { tone: "mid" })),
    blockSvg(k, P, prep),
  ].join("");
}

// the stylesheet the casting's faces need on top of the kit's: its own five-tone ramp, a little deeper than the kit's
// shade tokens so the form reads, light and dark
export const BLOCK_CSS = `
.iso{--pm-0:#0a0a0a;--pm-1:#131313;--pm-2:#1e1e1e;--pm-3:#2c2c2c;--pm-4:#404040}
.iso[data-theme="light"]{--pm-0:#8c8c89;--pm-1:#a2a29f;--pm-2:#b9b9b6;--pm-3:#d0d0cd;--pm-4:#e8e8e5}
.pm{stroke-width:.5;stroke-linejoin:round}
.pm[data-t="0"]{fill:var(--pm-0);stroke:var(--pm-0)}
.pm[data-t="1"]{fill:var(--pm-1);stroke:var(--pm-1)}
.pm[data-t="2"]{fill:var(--pm-2);stroke:var(--pm-2)}
.pm[data-t="3"]{fill:var(--pm-3);stroke:var(--pm-3)}
.pm[data-t="4"]{fill:var(--pm-4);stroke:var(--pm-4)}
`;

export const VIEW = { width: WIDTH, height: HEIGHT };
