# blender --background --python blender_weights.py -- <for_blender.json> <heat_weights.json>
# Builds the body and its bones in Blender, parents them with Automatic
# Weights (bone heat), and writes each vertex's bone weights back out.
import bpy, json, sys
src, dst = sys.argv[sys.argv.index('--') + 1:][:2]
d = json.load(open(src))
bpy.ops.wm.read_factory_settings(use_empty=True)

# the body (its own units, y up: Blender doesn't mind)
used = sorted({i for t in d['tris'] for i in t})
remap = {v: k for k, v in enumerate(used)}
verts = [tuple(d['verts'][i]) for i in used]
faces = [tuple(remap[i] for i in t) for t in d['tris']]
me = bpy.data.meshes.new('body'); me.from_pydata(verts, [], faces); me.update()
body = bpy.data.objects.new('body', me); bpy.context.collection.objects.link(body)

# the bones
arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for b in d['bones']:
    eb = arm.edit_bones.new(b['name']); eb.head = b['head']; eb.tail = b['tail']
bpy.ops.object.mode_set(mode='OBJECT')

# parent with automatic weights
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

names = [b['name'] for b in d['bones']]
gi = {g.index: names.index(g.name) for g in body.vertex_groups if g.name in names}
w = [[] for _ in d['verts']]
for v in me.vertices:
    w[used[v.index]] = [[gi[g.group], round(g.weight, 4)] for g in v.groups if g.group in gi and g.weight > 0.003]
missing = sum(1 for v in me.vertices if not w[used[v.index]])
json.dump({'bones': names, 'w': w}, open(dst, 'w'))
print('HEAT DONE', len(me.vertices), 'verts,', missing, 'without weights')
