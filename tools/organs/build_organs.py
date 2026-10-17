"""Build the Anatomy screen's internal organs (and torso skeleton) from
BodyParts3D, the Database Center for Life Science's 3D anatomy set
(CC BY 4.0; see assets/models/athlete/LICENSE.md for the credit).

    python -I tools/organs/build_organs.py <partof_BP3D_4.0_obj_99.zip> <partof_element_parts.txt>

Reads only the meshes it needs straight out of the zip (an organ is the
union of its element files, per the element-parts table), welds each into
one mesh, fits the whole set into the athlete (assets/models/athlete),
and writes assets/models/athlete/organs.json + organs.bin: per part, its
vertices (int16, quantised over the part's own box) and triangles.

BodyParts3D is in millimetres with z up, a person standing at the origin.
The fit lines its landmarks up with the athlete's own bones: the top of
the sternum with the base of the neck, the pubic symphysis with the hip
joints, the shoulder joints across; depth follows width. The brain and
skull go with the head, by the head's own size. FIT holds the hand-tuned
corrections found by looking.
"""
import io, json, struct, sys, zipfile, math, os

ZIP, ELEMENTS = sys.argv[1], sys.argv[2]
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'assets', 'models', 'athlete')

# id, BodyParts3D concept ids (unioned), system, colour, attach ('torso' | 'head')
PARTS = [
    ('brain',     ['FMA50801'], 'Nervous',     '#d9a3a0', 'head'),
    ('heart',     ['FMA7088'],  'Circulatory', '#b8322f', 'torso'),
    ('aorta',     ['FMA3734'],  'Circulatory', '#d0423a', 'torso'),
    ('ivc',       ['FMA10951'], 'Circulatory', '#3d5fb0', 'torso'),
    ('trachea',   ['FMA7394'],  'Respiratory', '#e3c6b8', 'torso'),
    ('lung-r',    ['FMA7309'],  'Respiratory', '#e59a9a', 'torso'),
    ('lung-l',    ['FMA7310'],  'Respiratory', '#e59a9a', 'torso'),
    ('diaphragm', ['FMA13295'], 'Respiratory', '#b8574e', 'torso'),
    ('esophagus', ['FMA7131'],  'Digestive',   '#d98a7a', 'torso'),
    ('stomach',   ['FMA7148'],  'Digestive',   '#e0a08c', 'torso'),
    ('liver',     ['FMA7197'],  'Digestive',   '#8e3a2c', 'torso'),
    ('gallbladder', ['FMA7202'], 'Digestive',  '#5f8a3c', 'torso'),
    ('pancreas',  ['FMA7198'],  'Digestive',   '#e8c08a', 'torso'),
    ('small-int', ['FMA7200'],  'Digestive',   '#e8a69a', 'torso'),
    ('large-int', ['FMA7201'],  'Digestive',   '#c9907a', 'torso'),
    ('kidney-r',  ['FMA7204'],  'Urinary',     '#9a3b35', 'torso'),
    ('kidney-l',  ['FMA7205'],  'Urinary',     '#9a3b35', 'torso'),
    ('bladder',   ['FMA15900'], 'Urinary',     '#e6c25e', 'torso'),
    ('skull',     ['FMA46565', 'FMA52748'], 'Skeletal', '#efe6d2', 'head'),
    ('spine',     ['FMA13478'], 'Skeletal',    '#efe6d2', 'torso'),
    ('ribs',      ['FMA7480'],  'Skeletal',    '#efe6d2', 'torso'),
    ('pelvis',    ['FMA16586', 'FMA16587', 'FMA16202'], 'Skeletal', '#efe6d2', 'torso'),
]
# landmark parts, read for the fit only
LAND = {'sternum': ['FMA7485'], 'pubis': ['FMA16586', 'FMA16587'], 'hum-r': ['FMA23130'], 'hum-l': ['FMA23131'], 'skull': ['FMA46565']}

# ── the element table: concept id → element files ──
elem = {}
for line in io.open(ELEMENTS, encoding='utf-8'):
    c = line.rstrip('\n').split('\t')
    if len(c) >= 3 and c[0].startswith('FMA'):
        elem.setdefault(c[0], []).append(c[2])

zf = zipfile.ZipFile(ZIP)
names = {os.path.splitext(os.path.basename(n))[0]: n for n in zf.namelist() if n.lower().endswith('.obj')}

def read_obj(fj):
    n = names.get(fj)
    if not n:
        return [], []
    V, F = [], []
    for line in zf.read(n).decode('utf-8', 'replace').splitlines():
        if line.startswith('v '):
            V.append(tuple(float(x) for x in line.split()[1:4]))
        elif line.startswith('f '):
            idx = [int(p.split('/')[0]) for p in line.split()[1:]]
            for k in range(1, len(idx) - 1):
                F.append((idx[0] - 1, idx[k] - 1, idx[k + 1] - 1))
    return V, F

def chunky(v):
    # lung tissue comes as solid lumps; its airways and vessels as tubes
    xs, ys, zs = zip(*v)
    d = sorted([max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)])
    return d[2] >= 35 and d[0] / d[2] >= 0.3

def hull(V):
    """The lungs come in this release as their airway and vessel trees,
    without the tissue round them; the trees reach every part of each
    lung, so the smooth shell round one is close to the lung's own shape
    (convex where the lung is, a little fuller at the heart's notch)."""
    import numpy as np
    from scipy.spatial import ConvexHull
    P = np.array(V)
    h = ConvexHull(P)
    idx = sorted(set(h.vertices.tolist())); m = {o: i for i, o in enumerate(idx)}
    c = P[idx].mean(axis=0)
    F = []
    for a, b, d in h.simplices.tolist():
        n = np.cross(P[b] - P[a], P[d] - P[a])
        F.append((m[a], m[b], m[d]) if np.dot(n, P[a] - c) >= 0 else (m[a], m[d], m[b]))
    return [tuple(P[i]) for i in idx], F

def mesh(concepts, solid=False):
    V, F, seen = [], [], set()
    for c in concepts:
        for fj in elem.get(c, []):
            if fj in seen:
                continue
            seen.add(fj)
            v, f = read_obj(fj)
            if solid and v and not chunky(v):
                continue
            o = len(V)
            V += v
            F += [(a + o, b + o, d + o) for a, b, d in f]
    return V, F

def box(V):
    xs, ys, zs = zip(*V)
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

# ── the athlete's landmarks, from its bones (model units, y up, +z front) ──
A = json.load(io.open(os.path.join(OUT, 'athlete.json'), encoding='utf-8'))
B = {b['name']: b['p'] for b in A['bones']}
neck, hipR, hipL = B['Neck'], B['R_Thigh'], B['L_Thigh']
shR, shL, head = B['R_UpperArm'], B['L_UpperArm'], B['Head']

# ── BodyParts3D's landmarks (mm, z up) ──
ster = box(mesh(LAND['sternum'])[0]); pub = box(mesh(LAND['pubis'])[0])
hR = box(mesh(LAND['hum-r'])[0]); hL = box(mesh(LAND['hum-l'])[0]); sk = box(mesh(LAND['skull'])[0])
bp_top = ster[1][2]                                   # top of the sternum
bp_pub = pub[0][2] + (pub[1][2] - pub[0][2]) * 0.18   # about the symphysis, low in the hip bones
bp_shw = abs(((hR[0][0] + hR[1][0]) / 2) - ((hL[0][0] + hL[1][0]) / 2))
bp_mid = (ster[0][0] + ster[1][0]) / 2

ath_top = neck[1] - 4.0                               # the sternal notch sits a little below the neck joint
ath_pub = (hipR[1] + hipL[1]) / 2
ath_shw = abs(shR[0] - shL[0])

# hand-tuned corrections (found by looking): depth offset of the torso set,
# extra scale, head offsets
FIT = {'depth': 1.0, 'dz': 0.0, 'dy': 0.0, 'head_s': 1.0, 'head_dy': 0.0, 'head_dz': 0.0}
try:
    FIT.update(json.load(io.open(os.path.join(os.path.dirname(__file__), 'fit.json'))))
except FileNotFoundError:
    pass

sy = (ath_top - ath_pub) / (bp_top - bp_pub)
sx = ath_shw / bp_shw
sz = sx * FIT['depth']
# BodyParts3D's front: the sternum is the most anterior of the landmarks, so
# whichever sign of y it sits at is the front
ster_y = (ster[0][1] + ster[1][1]) / 2
spine_v, _ = mesh(['FMA13478'])
spine_y = sum(v[1] for v in spine_v) / len(spine_v)
front = 1 if ster_y > spine_y else -1
# BodyParts3D's x: which side is the body's right? (the right humerus)
right = 1 if (hR[0][0] + hR[1][0]) / 2 > bp_mid else -1

# the athlete's spine depth: between its spine joints and a little behind
ath_spine_z = (B['Spine'][2] + B['Spine1'][2] + B['Spine2'][2]) / 3

def to_torso(v):
    x, y, z = v
    X = (x - bp_mid) * sx * (-1 if right > 0 else 1)   # athlete's right is −x
    Y = ath_pub + (z - bp_pub) * sy + FIT['dy']
    Z = ath_spine_z + (y - spine_y) * front * sz + FIT['dz']
    return (X, Y, Z)

sk_c = [(sk[0][i] + sk[1][i]) / 2 for i in range(3)]
sk_h = sk[1][2] - sk[0][2]
def to_head(v):
    x, y, z = v
    s = sx * FIT['head_s']
    X = (x - sk_c[0]) * s * (-1 if right > 0 else 1)
    Y = head[1] + (z - sk_c[2]) * s + FIT['head_dy']
    Z = head[2] + (y - sk_c[1]) * front * s + FIT['head_dz']
    return (X, Y, Z)

# ── weld, write ──
def weld(V, F, eps=0.05):
    key, out, remap = {}, [], []
    for v in V:
        k = (round(v[0] / eps), round(v[1] / eps), round(v[2] / eps))
        if k not in key:
            key[k] = len(out); out.append(v)
        remap.append(key[k])
    F2 = [(remap[a], remap[b], remap[c]) for a, b, c in F]
    return out, [f for f in F2 if f[0] != f[1] and f[1] != f[2] and f[0] != f[2]]

"""Simplify by vertex clustering: points that fall in one cell of a grid
become one (their average), and triangles that collapse go. The cell is
grown until the part is within its triangle budget — enough for a phone,
and on a smooth organ hard to tell from the full mesh at this size. Thin
bone (skull, ribs, spine) gets a bigger budget so it stays whole."""
BUDGET = {'brain': 7000, 'heart': 6000, 'liver': 5000, 'lung-r': 5000, 'lung-l': 4500, 'diaphragm': 3500,
          'large-int': 6000, 'small-int': 6000, 'skull': 14000, 'ribs': 14000, 'spine': 10000, 'pelvis': 7000}
def cluster(V, F, cell):
    key, sums, remap = {}, [], []
    for v in V:
        k = (math.floor(v[0] / cell), math.floor(v[1] / cell), math.floor(v[2] / cell))
        i = key.get(k)
        if i is None:
            i = key[k] = len(sums); sums.append([0.0, 0.0, 0.0, 0])
        s = sums[i]; s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; s[3] += 1
        remap.append(i)
    out = [(s[0] / s[3], s[1] / s[3], s[2] / s[3]) for s in sums]
    seen, F2 = set(), []
    for a, b, c in F:
        t = (remap[a], remap[b], remap[c])
        if t[0] == t[1] or t[1] == t[2] or t[0] == t[2]: continue
        k = tuple(sorted(t))
        if k in seen: continue
        seen.add(k); F2.append(t)
    return out, F2
def simplify(pid, V, F):
    budget = BUDGET.get(pid, 3000)
    if len(F) <= budget: return V, F
    (x0, y0, z0), (x1, y1, z1) = box(V)
    diag = math.dist((x0, y0, z0), (x1, y1, z1))
    cell = diag / 120
    for _ in range(12):
        V2, F2 = cluster(V, F, cell)
        if len(F2) <= budget: return V2, F2
        cell *= max(1.08, math.sqrt(len(F2) / budget))
    return V2, F2

meta, blob = {'source': 'BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution 4.0 International. Fitted to the athlete by tools/organs/build_organs.py.', 'parts': []}, bytearray()
for pid, concepts, system, colour, attach in PARTS:
    V, F = mesh(concepts)
    if pid.startswith('lung') and V:
        V, F = hull(V)
    if not V:
        print('missing', pid); continue
    f = to_head if attach == 'head' else to_torso
    V = [f(v) for v in V]
    V, F = weld(V, F)
    V, F = simplify(pid, V, F)
    (x0, y0, z0), (x1, y1, z1) = box(V)
    lo, span = (x0, y0, z0), (max(x1 - x0, 1e-6), max(y1 - y0, 1e-6), max(z1 - z0, 1e-6))
    off = len(blob)
    for v in V:
        blob += struct.pack('<3h', *[int(round((v[i] - lo[i]) / span[i] * 65535 - 32768)) for i in range(3)])
    while len(blob) % 4: blob += b'\0'
    ioff = len(blob)
    big = len(V) > 65535
    for t in F:
        blob += struct.pack('<3I' if big else '<3H', *t)
    while len(blob) % 4: blob += b'\0'
    meta['parts'].append({'id': pid, 'system': system, 'colour': colour, 'attach': attach,
                          'v': [off, len(V)], 'i': [ioff, len(F) * 3, 32 if big else 16], 'lo': lo, 'span': span})
    print(f'{pid:12s} {len(V):6d} verts {len(F):6d} tris')
io.open(os.path.join(OUT, 'organs.bin'), 'wb').write(bytes(blob))
json.dump(meta, io.open(os.path.join(OUT, 'organs.json'), 'w', encoding='utf-8'), indent=1)
print('wrote', len(blob), 'bytes; front', front, 'right', right, 'sy %.3f sx %.3f' % (sy, sx))
