# Reference renders of one station from the Blender layout, plus the meshes around it.
# Read-only: the .blend is never saved. Usage (Blender 5.x):
#   blender -b "animasi/line finishing before improvement.blend" \
#     --python station-kit/blender/render-station-ref.py -- <x> <y> <z> <radius> <outPrefix> [frame]
# x y z: the station centre in Blender units (HSB05: 14 -66 8); radius: how far around it to list
# objects and frame the camera (HSB05: 35). Writes <outPrefix>_0..2.png from three angles and
# prints the object list (name, bounds, materials) as one JSON line after "JSON>>".
import bpy, sys, math, json
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
cx, cy, cz, radius = map(float, args[:4])
out = args[4]
frame = int(args[5]) if len(args) > 5 else 1
sc = bpy.context.scene
target = Vector((cx, cy, cz))

near = []
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    c = sum(pts, Vector()) / 8
    if (c.xy - target.xy).length < radius:
        mn = [round(min(p[i] for p in pts), 1) for i in range(3)]
        mx = [round(max(p[i] for p in pts), 1) for i in range(3)]
        near.append((o.name, mn, mx, [m.name for m in o.data.materials if m][:2]))
print('JSON>>' + json.dumps(near))

for o in list(bpy.data.objects):
    if o.name == 'Plane':
        bpy.data.objects.remove(o, do_unlink=True)
world = sc.world
bg = world.node_tree.nodes.get('Background')
for link in list(world.node_tree.links):
    world.node_tree.links.remove(link)
output = [n for n in world.node_tree.nodes if n.type == 'OUTPUT_WORLD'][0]
world.node_tree.links.new(bg.outputs[0], output.inputs[0])
bg.inputs[0].default_value = (0.9, 0.9, 0.92, 1)
bg.inputs[1].default_value = 1
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3
sun.rotation_euler = (0.8, 0.2, 0.6)
sc.collection.objects.link(sun)
cam = bpy.data.cameras.new('ref')
cam.lens = 35
co = bpy.data.objects.new('ref', cam)
sc.collection.objects.link(co)
sc.camera = co
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 900, 700
sc.render.image_settings.media_type = 'IMAGE'
sc.render.image_settings.file_format = 'PNG'
dist = radius * 2
for i, (az, el) in enumerate([(225, 30), (135, 35), (315, 25)]):
    a, e = math.radians(az), math.radians(el)
    co.location = target + Vector((math.cos(a) * math.cos(e) * dist, math.sin(a) * math.cos(e) * dist, math.sin(e) * dist))
    co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.frame_set(frame)
    sc.render.filepath = f'{out}_{i}.png'
    bpy.ops.render.render(write_still=True)
