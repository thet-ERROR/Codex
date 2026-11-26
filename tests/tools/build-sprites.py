"""RAM RUSH: cut the hero and the drone out of the 2048px renders and pack them into one sprite sheet
(game/assets/sprites.webp + sprites.json). The renders (20 JPGs, 2048px, 27 MB) are kept outside the repo,
in the local _minigame-plan/images folder. The run is 8 drawn frames (images/hero-run/run-1..8.png, 141x159, already
transparent), kept on their shared canvas so his feet do not dance from frame to frame: the canvas bottom is the
road (in frames 4-5 his feet leave it: the stride's flight).

    pip install pillow numpy scipy
    python tests/tools/build-sprites.py _minigame-plan/images game/assets

The dark background is keyed out with a soft edge (the glow outline stays), the drone is the part with the
cyan eye, everything else stays with the hero (the boost flames). One scale for every frame, so the hero keeps
his size from pose to pose; the anchor is the feet (bottom centre).
"""
import json, sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
FILE = lambda n: SRC / f'{n + 13}.jpg'          # brief image n -> file n+13
FRAMES = {'run0': 8, 'run1': 17, 'jump': 6, 'boost': 9, 'slide': 1, 'land': 4}   # run0/1: only the scale's reference
RUN = [SRC / 'hero-run' / f'run-{i}.png' for i in range(1, 9)]
DRONE_FROM = 6
HERO_H = 200          # px tall for a running frame (the reference)
DRONE_W = 64

def cutout(n):
    im = np.asarray(Image.open(FILE(n)).convert('RGB')).astype(np.float32)
    corners = np.concatenate([im[:40, :40].reshape(-1, 3), im[:40, -40:].reshape(-1, 3), im[-40:, :40].reshape(-1, 3), im[-40:, -40:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    soft = np.clip((d - 14) / (48 - 14), 0, 1)         # soft edge keeps the glow outline
    # Only the background is see-through: the dark area joined to the picture's border, plus closed gaps
    # (between the legs) that are the background's own colour. Dark clothes inside the body are not
    # background, so they stay solid; a plain colour key made his trousers half transparent.
    low = d < 48
    lab_bg, n_bg = ndimage.label(low)
    border = set(np.unique(np.concatenate([lab_bg[0], lab_bg[-1], lab_bg[:, 0], lab_bg[:, -1]]))) - {0}
    is_bg = np.isin(lab_bg, list(border))
    for i, sl in enumerate(ndimage.find_objects(lab_bg), start=1):
        if i in border or sl is None: continue
        part = lab_bg[sl] == i
        if part.sum() > 400 and np.median(d[sl][part]) < 12: is_bg[sl] |= part
    alpha = np.where(is_bg, soft, 1.0)
    lab, n_lab = ndimage.label(ndimage.binary_dilation(alpha > 0.35, iterations=6))
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n_lab + 1))
    hero_id = int(np.argmax(sizes)) + 1
    objs = ndimage.find_objects(lab)
    # the drone: the biggest other part with the cyan eye in it
    cyan = (im[..., 2] > 180) & (im[..., 1] > 170) & (im[..., 0] < 140)
    drone_id, best = None, 0
    for i in range(1, n_lab + 1):
        if i == hero_id: continue
        if cyan[lab == i].sum() > 30 and sizes[i - 1] > best and sizes[i - 1] > 3000:
            drone_id, best = i, sizes[i - 1]
    hero_mask = (lab != 0) & (lab != (drone_id or -1))     # hero + flames + any bits near him
    rgba = np.dstack([im, alpha * 255]).astype(np.uint8)
    return rgba, hero_mask, (lab == drone_id) if drone_id else None

def crop(rgba, mask):
    a = rgba.copy(); a[..., 3] = (a[..., 3] * mask).astype(np.uint8)
    ys, xs = np.where(a[..., 3] > 8)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])

hero = {}
for name, n in FRAMES.items():
    rgba, hmask, _ = cutout(n)
    hero[name] = crop(rgba, hmask)
scale = HERO_H / hero['run1'].height
pieces = {k: v.resize((round(v.width * scale), round(v.height * scale)), Image.LANCZOS) for k, v in hero.items() if not k.startswith('run')}
# the 8 run frames: the tallest stride (feet on the road) as tall as the old run1 (HERO_H), the whole canvas kept
run = [Image.open(f).convert('RGBA') for f in RUN]
boxes = [im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox() for im in run]
body = max(b[3] - b[1] for b in boxes if b[3] >= run[0].height - 3)
k = HERO_H / body
run = {f'run{i}': im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS) for i, im in enumerate(run)}
pieces = {**run, **pieces}
rgba, _, dmask = cutout(DRONE_FROM)
d = crop(rgba, dmask)
pieces['drone'] = d.resize((DRONE_W, round(d.height * DRONE_W / d.width)), Image.LANCZOS)

# rows, 2px apart, a new row when the next would pass MAX_W (some phones refuse wider images);
# anchor = bottom centre (feet) for the hero, centre for the drone
MAX_W = 2048
spots, x, y, row, W = {}, 0, 0, 0, 0
for k, p in pieces.items():
    if x + p.width > MAX_W: x, y, row = 0, y + row + 2, 0
    spots[k] = (x, y); x += p.width + 2; row = max(row, p.height); W = max(W, x)
sheet = Image.new('RGBA', (W, y + row), (0, 0, 0, 0)); meta = {}
for k, p in pieces.items():
    sx, sy = spots[k]
    sheet.paste(p, (sx, sy))
    meta[k] = {'x': sx, 'y': sy, 'w': p.width, 'h': p.height, 'ax': p.width // 2, 'ay': p.height if k != 'drone' else p.height // 2}
sheet.save(OUT / 'sprites.webp', 'WEBP', quality=86, method=6)
(OUT / 'sprites.json').write_text(json.dumps(meta, indent=1))
print({k: (v['w'], v['h']) for k, v in meta.items()}, (OUT / 'sprites.webp').stat().st_size, 'bytes')
