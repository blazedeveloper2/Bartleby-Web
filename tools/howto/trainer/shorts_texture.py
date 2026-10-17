# python -I shorts_texture.py <outDir> [preview]
# Draws the athlete's shorts (assets/models/athlete/shorts.jpg and
# shorts_n.jpg) from scratch: black knit training shorts with a ribbed
# waistband, a mesh side panel edged in grey piping, a diagonal accent and
# a small // mark on the panel, and double-needle stitching at the hem and
# under the waistband. It redraws, cleanly and at twice the size, the hand
# edit the shorts first had.
#
# The layout matches the UVs avatar.js fits to the shorts on load (`fit:
# 'legs'` in athlete.json):
#   u  round each leg: 0.5 the outside of the thigh, 0.5 → 1 the front,
#      0.5 → 0 the back, 0 = 1 the inside seam. The texture repeats across
#      that seam, so everything here tiles left to right.
#   v  0 at the hem, 1 at the top of the waistband, over SPAN cm; near each
#      edge v is true centimetres, so stitching sits a fixed distance in.
# One unit of u is about UCM cm of cloth (more at the flared hem, less at
# the waist), so a 2:1 image keeps its texels about square on the cloth.
#
# Everything is drawn at twice the size and averaged down, so edges are
# smooth; every repeating pattern divides the width exactly, so the seam
# does not show; the knit repeats every 6 pixels or so, well above what
# mipmapping and anisotropic filtering need to keep it from shimmering.
import sys, os
import numpy as np
from PIL import Image

out = sys.argv[1]
preview = len(sys.argv) > 2
os.makedirs(out, exist_ok=True)

W, H, SS = 2048, 1024, 2
w, h = W * SS, H * SS
SPAN, UCM = 37.0, 68.0          # cm of cloth per unit of v, and (about) of u
WAIST, HEM = 4.0, 2.3           # waistband depth, hem fold depth (cm)
PANEL, PIPE = 0.052 * UCM, 0.2  # side panel half width, piping width (cm)
rng = np.random.default_rng(7)

u = (np.arange(w) + 0.5) / w
v = 1 - (np.arange(h) + 0.5) / h
U, V = np.meshgrid(u, v)
X = (U - 0.5) * UCM              # cm from the outside line, + toward the front
Xi = ((U + 0.5) % 1 - 0.5) * UCM  # cm from the inside seam
Yh = V * SPAN                    # cm up from the hem
Yt = (1 - V) * SPAN              # cm down from the top of the waistband

def per(n):                      # a period that divides the width exactly
    return UCM / n
def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
def band(x, a, b, soft):         # 1 between a and b, soft edges (cm)
    return ss(a - soft, a + soft, x) * (1 - ss(b - soft, b + soft, x))
def noise(scale_px, amp=1.0):
    """Smooth random field that tiles in both directions (FFT filtered)."""
    f = rng.standard_normal((h, w)).astype(np.float32)
    F = np.fft.rfft2(f)
    ky = np.fft.fftfreq(h)[:, None]; kx = np.fft.rfftfreq(w)[None, :]
    F *= np.exp(-((kx ** 2 + ky ** 2) * (scale_px ** 2) * 2 * np.pi ** 2))
    n = np.fft.irfft2(F, s=(h, w)).astype(np.float32)
    return n / (n.std() + 1e-9) * amp

# ── where each part is ──
body = ss(WAIST - 0.03, WAIST + 0.03, Yt)                      # below the waistband
wb = 1 - body                                                   # the waistband
panel = band(X, -PANEL, PANEL, 0.025) * body
pipe = (band(X, -PANEL - PIPE, -PANEL, 0.02) + band(X, PANEL, PANEL + PIPE, 0.02)) * body
hemfold = 1 - ss(HEM - 0.05, HEM + 0.05, Yh)

# ── relief, in millimetres ──
# knit: columns of small V-shaped loops (jersey), each loop its own height
pu, pv = per(340), 0.2                                          # 0.2 cm columns and rows
a = np.mod(X / pu, 1) - 0.5
col = np.floor(X / pu); row = np.floor(Yh / pv + 0.6 * np.abs(a))
b = np.mod(Yh / pv + 0.6 * np.abs(a), 1) - 0.5
loop = (np.cos(np.pi * a) ** 2) * (np.cos(np.pi * b) ** 2)
jit = np.asarray(Image.fromarray((rng.random((64, 340)) * 255).astype(np.uint8)).resize((340, 64), Image.NEAREST)).astype(np.float32) / 255
lj = jit[(row.astype(int) % 64), (col.astype(int) % 340)]
knit = loop * (0.75 + 0.5 * lj) * 0.06
# the waistband: a ribbed elastic knit, rounded over its top edge
rib = 0.5 + 0.5 * np.cos(2 * np.pi * X / per(228))
rib = rib ** 0.6 * 0.22 + loop * 0.03
top_round = -0.9 * (1 - ss(0, 0.45, Yt)) ** 2
# the panel: a breathable mesh, holes on a diamond lattice
mp = per(300) * 1.2                                             # hole spacing (cm)
mx = np.mod(X / mp, 1) - 0.5; my = np.mod(Yh / mp, 1) - 0.5
mx2 = np.mod(X / mp + 0.5, 1) - 0.5; my2 = np.mod(Yh / mp + 0.5, 1) - 0.5
r1 = np.hypot(mx, my) * mp; r2 = np.hypot(mx2, my2) * mp
holes = np.maximum(1 - ss(0.035, 0.06, r1), 1 - ss(0.035, 0.06, r2))
mesh = -holes * 0.12 + loop * 0.02
# piping: a rounded cord standing a little proud, with a groove each side
def cord(c):
    d = np.abs(X - c) / (PIPE / 2)
    return np.sqrt(np.clip(1 - d ** 2, 0, 1))
piping = (cord(PANEL + PIPE / 2) + cord(-PANEL - PIPE / 2)) * 0.28 * body
groove = lambda d, wd, dep: -dep * np.exp(-(d / wd) ** 2)
seams = (groove(X - PANEL, 0.03, 0.12) + groove(X - PANEL - PIPE, 0.03, 0.12) +
         groove(X + PANEL, 0.03, 0.12) + groove(X + PANEL + PIPE, 0.03, 0.12)) * body
# coverstitch: two rows of raised dashes
def stitches(dist, rows, along, n, dash=0.72, wd=0.035, height=0.16):
    s = np.zeros_like(dist)
    period = per(n)
    ph = np.mod(along / period, 1)
    on = band(ph, (1 - dash) / 2, (1 + dash) / 2, 0.06)
    for r in rows:
        s += np.exp(-((dist - r) / wd) ** 2) * on
    return np.clip(s, 0, 1) * height
st_wb = stitches(Yt, [WAIST + 0.32, WAIST + 0.68], X, 240) * body
st_hem = stitches(Yh, [HEM - 0.55, HEM - 0.2], X, 240)
# the inside seam: a flat-locked seam, a soft ridge with a groove down its middle
inseam = (np.exp(-(Xi / 0.25) ** 2) * 0.12 + groove(Xi, 0.03, 0.1)) * body
# hem: the turned-up fold is a layer thicker, its bottom edge rounded
hem_relief = 0.12 * hemfold - 0.8 * (1 - ss(0, 0.4, Yh)) ** 2 + groove(Yh - HEM, 0.04, 0.12)
wb_join = groove(Yt - WAIST, 0.04, 0.2)

# the diagonal accent across the panel and the // mark under it
def line_dist(x, y, x0, y0, dx, dy):          # signed distance from a line (cm)
    l = np.hypot(dx, dy)
    return ((x - x0) * dy - (y - y0) * dx) / l
dg = line_dist(X, Yh, 0, 9.2, 1.0, 0.55)
diag = band(dg, -0.55, 0.55, 0.02) * panel
diag_edge = (np.exp(-((dg - 0.62) / 0.03) ** 2) + np.exp(-((dg + 0.62) / 0.03) ** 2)) * panel
def slash(cx, cy, hgt, wd, lean):
    yy = (Yh - cy) / hgt
    xx = X - cx - lean * (Yh - cy)
    return band(yy, -0.5, 0.5, 0.02 / hgt) * band(xx, -wd / 2, wd / 2, 0.015)
mark = np.clip(slash(-0.28, 5.0, 1.15, 0.2, 0.42) + slash(0.28, 5.0, 1.15, 0.2, 0.42), 0, 1)

relief = (body * (1 - panel) * knit + panel * mesh * (1 - diag) + diag * 0.04 +
          wb * (rib + top_round) + piping + seams + st_wb + st_hem + hem_relief + wb_join + inseam +
          diag_edge * 0.05 + mark * 0.05)

# ── colour (sRGB, 0–255) ──
cloth = np.array([40, 42, 46], np.float32)
col_wb = np.array([33, 34, 38], np.float32)
col_mesh = np.array([54, 56, 61], np.float32)
col_hole = np.array([20, 21, 23], np.float32)
col_pipe = np.array([178, 182, 188], np.float32)
col_diag = np.array([24, 25, 28], np.float32)
col_line = np.array([150, 154, 160], np.float32)
col_thread = np.array([70, 72, 78], np.float32)

heather = noise(18, 0.9) + noise(3, 0.6)
shade = 1 + 0.04 * (knit / 0.06 - 0.5) + 0.012 * heather   # the knit's own light and dark
C = np.broadcast_to(cloth, (h, w, 3)).copy()
def over(C, m, c):
    m = np.clip(m, 0, 1)[..., None]
    return C * (1 - m) + c * m
C = over(C, wb, col_wb * (1 + 0.05 * (rib[..., None] / 0.22 - 0.5)))
C = over(C, panel, col_mesh)
C = over(C, panel * holes, col_hole)
C = over(C, diag, col_diag)
C = over(C, diag_edge, col_line)
C = over(C, mark * panel, col_line * 1.06)
C = C * shade[..., None]
pipe_shade = 0.9 + 0.1 * (cord(PANEL + PIPE / 2) + cord(-PANEL - PIPE / 2))   # the cord rounds away at its edges
C = over(C, pipe, col_pipe * pipe_shade[..., None])
C = over(C, (st_wb + st_hem) / 0.16 * 0.85, col_thread)
C = C * (1 - 0.35 * (np.exp(-((Yt - WAIST) / 0.05) ** 2) * body)[..., None])   # shadow in the waistband join
C = np.clip(C, 0, 255)

def down(a):                       # average SS×SS blocks
    return a.reshape(H, SS, W, SS, *a.shape[2:]).mean(axis=(1, 3))

img = Image.fromarray(np.round(down(C)).astype(np.uint8))
img.save(os.path.join(out, 'shorts.jpg'), quality=88, optimize=True, progressive=True, subsampling=0)

# ── normals from the relief, in the tangent frame three.js builds from
# the UVs: x along +u, y along +v (up the image) ──
mm_u = 10 * UCM / w; mm_v = 10 * SPAN / h      # millimetres per (supersampled) pixel
gx = (np.roll(relief, -1, 1) - np.roll(relief, 1, 1)) / (2 * mm_u)
gy = np.zeros_like(relief)
gy[1:-1] = (relief[:-2] - relief[2:]) / (2 * mm_v)   # rows run down the image, v up it
gy[0] = gy[1]; gy[-1] = gy[-2]
N = np.stack([-gx, -gy, np.ones_like(gx)], -1)
N /= np.linalg.norm(N, axis=-1, keepdims=True)
N = down(N); N /= np.linalg.norm(N, axis=-1, keepdims=True)
nimg = Image.fromarray(np.round((N * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8))
nimg.save(os.path.join(out, 'shorts_n.jpg'), quality=92, optimize=True, progressive=True, subsampling=0)

if preview:
    img.crop((900, 0, 1250, 350)).resize((700, 700), Image.NEAREST).save(os.path.join(out, '_crop_top.png'))
    img.crop((900, 700, 1250, 1024)).resize((700, 648), Image.NEAREST).save(os.path.join(out, '_crop_bottom.png'))
    nimg.crop((900, 0, 1250, 350)).resize((700, 700), Image.NEAREST).save(os.path.join(out, '_crop_n_top.png'))
    nimg.crop((900, 700, 1250, 1024)).resize((700, 648), Image.NEAREST).save(os.path.join(out, '_crop_n_bottom.png'))
for f in ('shorts.jpg', 'shorts_n.jpg'):
    print(f, os.path.getsize(os.path.join(out, f)))
