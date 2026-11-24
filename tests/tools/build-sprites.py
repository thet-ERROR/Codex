"""RAM RUSH: cut the hero and the drone out of the 2048px renders and pack them into one sprite sheet
(game/assets/sprites.webp + sprites.json). The renders (20 JPGs, 2048px, 27 MB) are kept outside the repo,
in the local _minigame-plan/images folder.

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
FRAMES = {'run0': 8, 'run1': 17, 'jump': 6, 'boost': 9, 'slide': 1, 'land': 4}
DRONE_FROM = 6
HERO_H = 200          # px tall for a running frame (the reference)
DRONE_W = 64

def cutout(n):
    im = np.asarray(Image.open(FILE(n)).convert('RGB')).astype(np.float32)
    corners = np.concatenate([im[:40, :40].reshape(-1, 3), im[:40, -40:].reshape(-1, 3), im[-40:, :40].reshape(-1, 3), im[-40:, -40:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    alpha = np.clip((d - 14) / (48 - 14), 0, 1)        # soft edge keeps the glow outline
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
pieces = {k: v.resize((round(v.width * scale), round(v.height * scale)), Image.LANCZOS) for k, v in hero.items()}
rgba, _, dmask = cutout(DRONE_FROM)
d = crop(rgba, dmask)
pieces['drone'] = d.resize((DRONE_W, round(d.height * DRONE_W / d.width)), Image.LANCZOS)

# one row, 2px apart; anchor = bottom centre (feet) for the hero, centre for the drone
W = sum(p.width + 2 for p in pieces.values()); H = max(p.height for p in pieces.values())
sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); meta, x = {}, 0
for k, p in pieces.items():
    sheet.paste(p, (x, 0))
    meta[k] = {'x': x, 'y': 0, 'w': p.width, 'h': p.height, 'ax': p.width // 2, 'ay': p.height if k != 'drone' else p.height // 2}
    x += p.width + 2
sheet.save(OUT / 'sprites.webp', 'WEBP', quality=86, method=6)
(OUT / 'sprites.json').write_text(json.dumps(meta, indent=1))
print({k: (v['w'], v['h']) for k, v in meta.items()}, (OUT / 'sprites.webp').stat().st_size, 'bytes')
