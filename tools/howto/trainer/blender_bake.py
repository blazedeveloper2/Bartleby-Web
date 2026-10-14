# blender --background --python blender_bake.py -- <body.json> <full.json> <out_dir> [size]
# Unwraps the reduced body, bakes the full sculpt's surface detail onto it
# as a tangent-space normal map, and writes body_n.png plus body_uv.json
# (three UVs per triangle, in body.json's triangle order).
import bpy, json, sys, os
args = sys.argv[sys.argv.index('--') + 1:]
low_src, high_src, out = args[:3]
size = int(args[3]) if len(args) > 3 else 2048
bpy.ops.wm.read_factory_settings(use_empty=True)

def mesh(name, src):
    d = json.load(open(src))
    P, I = d['pos'], d['idx']
    verts = [(P[i], P[i + 1], P[i + 2]) for i in range(0, len(P), 3)]
    faces = [(I[i], I[i + 1], I[i + 2]) for i in range(0, len(I), 3)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    me.shade_smooth()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob

low = mesh('low', low_src)
high = mesh('high', high_src)
print('meshes', len(low.data.polygons), len(high.data.polygons))

# unwrap
bpy.ops.object.select_all(action='DESELECT')
low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')

# the image to bake into
img = bpy.data.images.new('body_n', size, size, alpha=False, float_buffer=False)
img.colorspace_settings.name = 'Non-Color'
mat = bpy.data.materials.new('bake'); mat.use_nodes = True
tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
mat.node_tree.nodes.active = tex
low.data.materials.append(mat)

sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
bk = sc.render.bake
bk.use_selected_to_active = True; bk.cage_extrusion = 0.6; bk.max_ray_distance = 1.5
bk.normal_space = 'TANGENT'; bk.margin = 6
bpy.ops.object.select_all(action='DESELECT')
high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.bake(type='NORMAL')
img.filepath_raw = os.path.join(out, 'body_n.png'); img.file_format = 'PNG'; img.save()

uv = low.data.uv_layers.active.data
uvs = []
for poly in low.data.polygons:
    for li in poly.loop_indices:
        u, v = uv[li].uv
        uvs += [round(u, 5), round(v, 5)]
json.dump({'size': size, 'uv': uvs}, open(os.path.join(out, 'body_uv.json'), 'w'))
print('BAKE DONE', len(low.data.polygons), 'tris')
