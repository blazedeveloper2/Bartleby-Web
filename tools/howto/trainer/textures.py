# python -I textures.py <srcDir> <outDir>
# Recolour the Rocketbox m002 body texture into training kit (a plain blue
# tee, grey shorts) keeping the fabric's own shading, and write web-sized
# textures.
import sys, os
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
body = Image.open(os.path.join(src, 'm002_body_color.tga')).convert('RGB')
A = np.asarray(body).astype(np.float32)
H, W, _ = A.shape
mx, mn = A.max(2), A.min(2)
sat = mx - mn
r, g, b = A[..., 0], A[..., 1], A[..., 2]
yy, xx = np.mgrid[0:H, 0:W]

def rect(x0, y0, x1, y1):
    return (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)

# shirt: the centre column, its side panels and the two sleeve caps; cloth
# there is unsaturated (cream and brown stripes), skin is not
shirt_area = rect(655, 0, 1395, 1790) | rect(0, 890, 640, 1270) | rect(1410, 890, 2048, 1270)
shirt = shirt_area & ((sat < 48) | (mx < 90))
# shorts: the two squares at the top, khaki (green close to red) not skin
shorts_area = rect(0, 0, 640, 525) | rect(1410, 0, 2048, 525)
shorts = shorts_area & (g / np.maximum(r, 1) > 0.78)

L = (0.3 * r + 0.59 * g + 0.11 * b)
# wipe the thin stripes: a closing (max then min) on brightness, then soften
Li = Image.fromarray(np.clip(L, 0, 255).astype(np.uint8))
Lc = Li.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(11)).filter(ImageFilter.GaussianBlur(1.5))
Lc = np.asarray(Lc).astype(np.float32)

def tint(mask, lum, col, lo=0.55, hi=1.25):
    ref = np.median(lum[mask])
    sh = np.clip(lum / ref, lo, hi)[..., None]
    return np.clip(np.array(col, np.float32) * sh, 0, 255)

O = A.copy()
O[shirt] = tint(shirt, Lc, (47, 109, 181))[shirt]
O[shorts] = tint(shorts, L, (92, 99, 114))[shorts]
# soften the mask edges by one pixel so seams don't show a halo
img = Image.fromarray(O.astype(np.uint8))
img.resize((1024, 1024), Image.LANCZOS).save(os.path.join(out, 'body.jpg'), quality=86, optimize=True)
Image.open(os.path.join(src, 'm002_head_color.tga')).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(os.path.join(out, 'head.jpg'), quality=86, optimize=True)
for n, o in [('m002_body_normal', 'body_n.jpg'), ('m002_head_normal', 'head_n.jpg')]:
    Image.open(os.path.join(src, n + '.tga')).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(os.path.join(out, o), quality=82, optimize=True)
Image.open(os.path.join(src, 'm002_opacity_color.tga')).convert('RGBA').resize((512, 512), Image.LANCZOS).save(os.path.join(out, 'hair.png'), optimize=True)
img.resize((768, 768)).save(os.path.join(out, '_preview_body.png'))
for f in sorted(os.listdir(out)):
    print(f, os.path.getsize(os.path.join(out, f)))
