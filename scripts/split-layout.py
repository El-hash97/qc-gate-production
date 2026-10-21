"""Split the static `Layout` mesh of public/models/finishing-line.glb per station.

Run from the repo root:
  blender -b --python scripts/split-layout.py

Writes public/models/finishing-line-split.glb with one node `Layout` (everything
that belongs to no station) plus one node `MC_<station>` per station, so the app
can tint a single machine. The original GLB is untouched; the app hides its own
`Layout` node and shows these instead.
"""
import bpy, bmesh, numpy as np

SRC = "public/models/finishing-line.glb"
OUT = "public/models/finishing-line-split.glb"
# Blender top-view (x, y) of each machine — keep in sync with STATIONS in utils/finishingFlow.ts
STATIONS = {
    'baritori': (20, -15), 'hsb05': (18, -68), 'hsb06': (18, -118), 'grinding': (-31, -120),
    'hanten': (6.5, -175), 'final': (6.5, -202), 'qc1': (6.5, -232), 'qc2': (6.5, -263),
    'spray': (-5, -295), 'junbiki': (-89, -295), 'lineRepair': (164, -391),
}
RADIUS = 22     # a piece belongs to the nearest station within this distance (Blender units)
MAX_SIZE = 65   # larger pieces (floor, fences, walls, long conveyors) stay in Layout

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
layout = bpy.data.objects['Layout']
me = layout.data

# world-space vertex positions
n = len(me.vertices)
co = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
M = np.array(layout.matrix_world); co = co @ M[:3, :3].T + M[:3, 3]

# glTF stores one vertex per (position, normal, uv): merge by position, then union-find over triangles
_, uniq = np.unique(np.round(co / 1e-3).astype(np.int64), axis=0, return_inverse=True)
uniq = uniq.ravel()
me.calc_loop_triangles()
tri = np.empty(len(me.loop_triangles) * 3, dtype=np.int32); me.loop_triangles.foreach_get('vertices', tri)
tri = uniq[tri.reshape(-1, 3)]
parent = np.arange(uniq.max() + 1)
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]; x = parent[x]
    return x
for a, b, c in tri.tolist():
    ra = find(a)
    for v in (b, c):
        rv = find(v)
        if rv != ra: parent[rv] = ra
root = np.array([find(i) for i in range(len(parent))])[uniq]
ids, cid = np.unique(root, return_inverse=True)
lo = np.full((len(ids), 3), 1e9); hi = np.full((len(ids), 3), -1e9)
np.minimum.at(lo, cid, co); np.maximum.at(hi, cid, co)
ctr = (lo + hi) / 2; size = np.maximum(hi[:, 0] - lo[:, 0], hi[:, 1] - lo[:, 1])

names = list(STATIONS)
pos = np.array([STATIONS[k] for k in names], dtype=float)
dist = np.hypot(ctr[:, None, 0] - pos[None, :, 0], ctr[:, None, 1] - pos[None, :, 1])
near = dist.argmin(axis=1)
label = np.where((dist.min(axis=1) <= RADIUS) & (size <= MAX_SIZE), near, -1)

# label per polygon from its first vertex
ps = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('loop_start', ps)
lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
poly_label = label[cid[lv[ps]]]
print("faces per station:", {(names[i] if i >= 0 else 'Layout'): int((poly_label == i).sum()) for i in range(-1, len(names))})

def piece(name, keep):
    obj = layout.copy(); obj.data = layout.data.copy(); obj.name = name
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if poly_label[f.index] != keep], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(obj.data); bm.free()
    return obj

pieces = [piece('MC_' + k, i) for i, k in enumerate(names)] + [piece('Layout_rest', -1)]
bpy.data.objects.remove(layout)
pieces[-1].name = 'Layout'
bpy.ops.object.select_all(action='DESELECT')
for o in pieces: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_draco_mesh_compression_enable=True, export_animations=False)
print("wrote", OUT)
