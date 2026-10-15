# blender --background --factory-startup --python blender_ao.py -- <athlete.json> <ao.json> [distance] [samples]
# Bakes ambient occlusion into every point of the built athlete (its rest
# pose, as athlete.bin holds it) and writes ao.json, one byte per point
# (255 open, 0 fully shut in), for build_athlete.mjs (AO=ao.json).
# The distance (sculpt units, about 1 cm) keeps it to the body's own
# creases and muscle separations: limbs move, so how close an arm hangs to
# the torso in the A-pose is left out. The skin is baked without the
# shorts, since the anatomy bench takes them off (their hems would leave a
# dark band round each thigh); the shorts and the skin hidden under them
# (underskin) are baked with them.
import bpy, json, sys, os, array
args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[:2]
dist = float(args[2]) if len(args) > 2 else 4.0
samples = int(args[3]) if len(args) > 3 else 256
bpy.ops.wm.read_factory_settings(use_empty=True)

meta = json.load(open(src))
raw = open(os.path.join(os.path.dirname(src), os.path.basename(src)[:-5] + '.bin'), 'rb').read()
def arr(name, code):
    L = meta['layout'][name]; a = array.array(code); size = a.itemsize
    a.frombytes(raw[L['offset']:L['offset'] + L['length'] * size]); return a
pos, nor = arr('position', 'h'), arr('normal', 'b')
idx = arr('index', 'I' if meta['layout']['index']['type'] == 'Uint32Array' else 'H')
ps, V = meta['posScale'], meta['vertices']
verts = [(pos[i] * ps, pos[i + 1] * ps, pos[i + 2] * ps) for i in range(0, V * 3, 3)]
normals = []
for i in range(0, V * 3, 3):
    n = (nor[i] / 127, nor[i + 1] / 127, nor[i + 2] / 127); l = sum(x * x for x in n) ** 0.5 or 1
    normals.append(tuple(x / l for x in n))

def tris_of(mats):
    t = []
    for r in meta['ranges']:
        if r['mat'] in mats: t += [(idx[k], idx[k + 1], idx[k + 2]) for k in range(r['start'], r['start'] + r['count'], 3)]
    return t

sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
sc.world = bpy.data.worlds.new('w'); sc.world.light_settings.distance = dist
bk = sc.render.bake; bk.target = 'VERTEX_COLORS'; bk.use_selected_to_active = False

def bake(name, mats):
    faces = tris_of(mats)
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    me.shade_smooth(); me.normals_split_custom_set_from_vertices(normals)
    me.uv_layers.new()   # the bake wants one, though it writes to the points
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    ca = me.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT'); me.color_attributes.active_color = ca
    me.materials.append(bpy.data.materials.new(name))
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='AO')
    used = set(v for f in faces for v in f)
    vals = [ca.data[i].color[0] for i in range(V)]
    bpy.data.objects.remove(ob)
    print(name, len(faces), 'tris baked')
    return vals, used

# The head is grafted on with the body's neck running on under its skin,
# so the body is baked without it (it would shade a line round the neck
# where the body comes out from under the head's edge), and the head with
# everything but, toward its lower edge (skinBlend, the build's fade at the
# join), without the body it overlaps there.
all_mats = set(r['mat'] for r in meta['ranges'])
head, _ = bake('head', all_mats - {'bareskin'})
head_alone, _ = bake('head_alone', all_mats - {'bareskin', 'skin', 'underskin'})
dressed, _ = bake('dressed', all_mats - {'bareskin', 'head'})
bare, _ = bake('bare', all_mats - {'shorts', 'underskin', 'head'})
in_head = set(i for t in tris_of({'head'}) for i in t)
in_shorts = set(i for t in tris_of({'shorts', 'underskin'}) for i in t)
blend = arr('skinBlend', 'B') if 'skinBlend' in meta['layout'] else [0] * V
def pick(i):
    if i in in_head: b = blend[i] / 255; return head[i] * (1 - b) + head_alone[i] * b
    return dressed[i] if i in in_shorts else bare[i]
ao = [max(0.0, min(1.0, pick(i))) for i in range(V)]

# A point here and there comes out much darker than all round it (a ray
# that starts just under a neighbouring facet of the reduced surface): it
# takes its neighbours' median. Then one light smoothing pass.
nbr = [set() for _ in range(V)]
for r in meta['ranges']:
    for k in range(r['start'], r['start'] + r['count'], 3):
        a, b, c = idx[k], idx[k + 1], idx[k + 2]
        nbr[a].update((b, c)); nbr[b].update((a, c)); nbr[c].update((a, b))
fixed = 0
for _ in range(2):
    nxt = ao[:]
    for i in range(V):
        if len(nbr[i]) < 3: continue
        ns = sorted(ao[j] for j in nbr[i]); med = ns[len(ns) // 2]
        if ao[i] < med - 0.12: nxt[i] = med; fixed += 1
    ao = nxt
ao = [0.5 * ao[i] + 0.5 * sum(ao[j] for j in nbr[i]) / len(nbr[i]) if nbr[i] else ao[i] for i in range(V)]
print('outliers fixed', fixed)
ao = [round(x * 255) for x in ao]
json.dump({'vertices': V, 'distance': dist, 'ao': ao}, open(out, 'w'))
print('AO DONE', V, 'points, mean', sum(ao) / V / 255)
