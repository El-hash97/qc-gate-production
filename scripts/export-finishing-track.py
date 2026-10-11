# Bakes the BC block's journey from the Blender animation into JSON for
# /visualisasi: world centre + rotation of whichever object carries the block
# at each frame (the animation hands the block between four objects).
# Usage (Blender 5.x):
#   blender -b "animasi/line finishing before improvement.blend" \
#     --python scripts/export-finishing-track.py -- utils/finishingTrack.json
import bpy, sys, json
from mathutils import Vector

out = sys.argv[-1]
START, END, STEP = 1, 1660, 2
SCALE, LIFT = 0.1, 0.56  # must match MODEL_SCALE / MODEL_LIFT in utils/finishingFlow.ts
# carrier object from this frame on
RELAY = [(1, 'Cube.050'), (201, 'Cube.019'), (577, 'Cube.563'), (1402, 'Cube.564')]

def carrier(f):
    name = RELAY[0][1]
    for start, n in RELAY:
        if f >= start: name = n
    return bpy.data.objects[name]

sc = bpy.context.scene
frames = []
for f in range(START, END + 1, STEP):
    sc.frame_set(f)
    o = carrier(f)
    c = o.matrix_world @ (sum((Vector(v) for v in o.bound_box), Vector()) / 8)
    q = o.matrix_world.to_quaternion()
    # Blender Z-up -> glTF Y-up: (x, y, z) -> (x, z, -y)
    frames.append([round(c.x * SCALE, 3), round(c.z * SCALE + LIFT, 3), round(-c.y * SCALE, 3),
                   round(q.x, 4), round(q.z, 4), round(-q.y, 4), round(q.w, 4)])
json.dump({'fps': 24, 'start': START, 'step': STEP, 'frames': frames}, open(out, 'w'), separators=(',', ':'))
print('JSON>>', len(frames))
