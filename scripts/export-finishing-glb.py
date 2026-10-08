# Lightweight GLB of the finishing-line layout for /visualisasi.
# Never saves the .blend. Usage (Blender 5.x):
#   blender -b "animasi/line finishing before improvement.blend" #     --python scripts/export-finishing-glb.py -- public/models/finishing-line.glb 600
# Last arg = max triangles per object (decimate cap). People, cameras, the
# huge ground plane and the forklift (animated in the web scene) are dropped.
import bpy, sys, json, re
from mathutils import Vector
out = sys.argv[-2]; MAX_TRIS = int(sys.argv[-1])
DROP = re.compile(r'^(Human 2|Low Poly Human|metarig|outfit_top|Camera|Plane$|Forklif)')
for o in list(bpy.data.objects):
    if o.type != 'MESH' or DROP.match(o.name) or any(m.type == 'ARMATURE' for m in o.modifiers):
        bpy.data.objects.remove(o, do_unlink=True)
# drop far-away outliers (the stray square seen in the top view)
def ctr(o):
    pts=[o.matrix_world @ Vector(c) for c in o.bound_box]; return sum(pts, Vector())/8
for o in list(bpy.data.objects):
    c = ctr(o)
    if not (-160 < c.x < 200 and -420 < c.y < 30): bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.data.objects: o.animation_data_clear()
before = 0
for o in bpy.data.objects:
    n = sum(len(p.vertices) - 2 for p in o.data.polygons); before += n
    if o.data.users > 1: o.data = o.data.copy()
    if n > MAX_TRIS:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = MAX_TRIS / n
# Perforated fence/grating panels resist decimation: swap them for a
# translucent box of the same footprint and colour.
import bmesh
dg = bpy.context.evaluated_depsgraph_get()
fence_mats = {}
boxed = 0
for o in list(bpy.data.objects):
    e = o.evaluated_get(dg); me = e.to_mesh(); n = sum(len(p.vertices) - 2 for p in me.polygons); e.to_mesh_clear()
    if n <= 15000: continue
    bb = [Vector(c) for c in o.bound_box]
    mn = Vector([min(v[i] for v in bb) for i in range(3)]); mx = Vector([max(v[i] for v in bb) for i in range(3)])
    src = o.data.materials[0] if o.data.materials else None
    new = bpy.data.meshes.new(o.name + '_box'); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector([mn[i] + (v.co[i] + 0.5) * (mx[i] - mn[i]) for i in range(3)])
    bm.to_mesh(new); bm.free()
    key = src.name if src else '_none'
    if key not in fence_mats:
        m = bpy.data.materials.new('fence_' + key); m.use_nodes = True
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        col = src.diffuse_color if src else (0.8, 0.8, 0.2, 1)
        if src and src.use_nodes and src.node_tree.nodes.get('Principled BSDF'):
            col = src.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
        bsdf.inputs['Base Color'].default_value = col; bsdf.inputs['Alpha'].default_value = 0.35
        m.surface_render_method = 'BLENDED' if hasattr(m, 'surface_render_method') else m.surface_render_method
        fence_mats[key] = m
    new.materials.append(fence_mats[key])
    o.modifiers.clear(); o.data = new; boxed += 1
print('BOXED', boxed)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects: o.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects[0]
bpy.ops.object.convert(target='MESH')  # applies decimate/bevel/hook
# join everything; glTF exporter splits by material into primitives
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = bpy.data.objects[0]
bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.001); bpy.ops.object.mode_set(mode='OBJECT')
after = sum(len(p.vertices) - 2 for p in o.data.polygons)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False,
    export_apply=True, export_animations=False, export_cameras=False, export_lights=False,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=10,
    export_image_format='NONE', export_normals=True, export_texcoords=False)
print('JSON>>' + json.dumps({'tris_before': before, 'tris_after': after, 'materials': len(o.data.materials),
  'bbox': [list(o.matrix_world @ Vector(c)) for c in (o.bound_box[0], o.bound_box[6])]}))
