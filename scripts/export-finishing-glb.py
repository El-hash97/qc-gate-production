# Lightweight, animated GLB of the finishing line for /visualisasi.
# Never saves the .blend. Usage (Blender 5.x):
#   blender -b "animasi/line finishing before improvement.blend" \
#     --python scripts/export-finishing-glb.py -- public/models/finishing-line.glb 600
# Last arg = max triangles per object (decimate cap).
#
# Static layout is decimated and joined into one mesh. Moving parts (the 14
# rigged operators, hoists, robot arm, shutters...) stay separate and carry
# the Blender timeline as one "Scene" clip, frames 1..ANIM_END (the last 10 s
# of the reference video are left out). The BC block relay objects are dropped:
# the web simulation draws its own blocks on the same paths.
import bpy, sys, json, re, bmesh
from mathutils import Vector

out = sys.argv[-2]; MAX_TRIS = int(sys.argv[-1])
ANIM_END = 1660  # 69 s at 24 fps
HUMAN_TRIS = 100000  # per operator body part (decimating skinned meshes tears them)
DROP = re.compile(r'^(Low Poly Human|outfit_top|Camera|Plane$|Forklif)')
REPAIR_AREA_LIFT = 9.43  # road z -15.07 -> plant floor z -5.64
BC_BLOCKS = {'Cube.050', 'Cube.019', 'Cube.562', 'Cube.563', 'Cube.564'}

def ctr(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]; return sum(pts, Vector()) / 8

def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)

rigs = {o for o in bpy.data.objects if o.type == 'ARMATURE'}
for o in list(bpy.data.objects):
    if o in rigs or (o.type == 'MESH' and o.parent in rigs):
        continue
    # rig-less "Human 2" copies sit unused at the origin
    if o.type != 'MESH' or DROP.match(o.name) or o.name in BC_BLOCKS or o.name.startswith('Human 2'):
        bpy.data.objects.remove(o, do_unlink=True); continue
    c = ctr(o)
    if not (-160 < c.x < 200 and -420 < c.y < 30):
        bpy.data.objects.remove(o, do_unlink=True); continue
    # The Line Repair area (x > 100) sits on a road 9.43 lower than the plant
    # floor; raise it to floor level so its fence and benches stand on the
    # web floor instead of floating.
    if c.x > 100:
        o.location.z += REPAIR_AREA_LIFT

skinned = {o for o in bpy.data.objects if o.type == 'MESH' and o.parent in rigs}
moving = {o for o in bpy.data.objects if o.type == 'MESH' and o not in skinned
          and ((o.animation_data and o.animation_data.action) or o.constraints)}
static = [o for o in bpy.data.objects if o.type == 'MESH' and o not in skinned and o not in moving]

# Skin and work trousers come from textures that are not exported: flat colours.
FLAT = {'Rex_Skin': (0.72, 0.5, 0.38, 1), 'Rex_Rough': (0.1, 0.12, 0.18, 1), 'Rex_Eyes': (0.05, 0.04, 0.04, 1)}
for name, col in FLAT.items():
    m = bpy.data.materials.get(name)
    if m and m.use_nodes:
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        for l in list(bsdf.inputs['Base Color'].links): m.node_tree.links.remove(l)
        bsdf.inputs['Base Color'].default_value = col

before = sum(tris(o.data) for o in bpy.data.objects if o.type == 'MESH')
# Operators: decimate first in the stack so the rig still deforms the result
# (the exporter applies every modifier except the armature).
for o in skinned:
    n = tris(o.data)
    if n > HUMAN_TRIS:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = HUMAN_TRIS / n
        o.modifiers.move(len(o.modifiers) - 1, 0)
plain = static + list(moving)
for o in plain:
    if o.data.users > 1: o.data = o.data.copy()
    n = tris(o.data)
    if n > MAX_TRIS:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = MAX_TRIS / n

# Perforated fence/grating panels resist decimation: swap them for a
# translucent box of the same footprint and colour.
dg = bpy.context.evaluated_depsgraph_get()
fence_mats = {}
boxed = 0
for o in plain:
    e = o.evaluated_get(dg); me = e.to_mesh(); n = tris(me); e.to_mesh_clear()
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
        fence_mats[key] = m
    new.materials.append(fence_mats[key])
    o.modifiers.clear(); o.data = new; boxed += 1

# Apply decimate etc. on everything that is not skinned (objects and their
# animation survive the conversion), then join only the static layout.
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in plain: o.select_set(True)
bpy.context.view_layer.objects.active = plain[0]
bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for o in static: o.select_set(True)
bpy.context.view_layer.objects.active = static[0]
bpy.ops.object.join()
layout = bpy.context.view_layer.objects.active
layout.name = 'Layout'
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.001); bpy.ops.object.mode_set(mode='OBJECT')

sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, ANIM_END
after = sum(tris(o.data) for o in bpy.data.objects if o.type == 'MESH')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False,
    export_apply=True, export_cameras=False, export_lights=False,
    export_animations=True, export_animation_mode='SCENE', export_frame_range=True,
    export_force_sampling=True, export_frame_step=4, export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=False,
    export_skins=True, export_def_bones=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=10,
    export_image_format='NONE', export_normals=True, export_texcoords=False)
print('JSON>>' + json.dumps({'tris_before': before, 'tris_after': after, 'boxed': boxed,
  'moving': sorted(o.name for o in moving), 'operators': len(rigs)}))
