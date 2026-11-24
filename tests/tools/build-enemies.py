"""RAM RUSH: pack the enemy frames into one sheet (game/assets/enemies.webp + enemies.json).
The frames (transparent PNGs) are kept outside the repo, in the local _minigame-plan/images/enemies folder.

    pip install pillow
    python tests/tools/build-enemies.py _minigame-plan/images/enemies game/assets

Frames of one animation (orange-bot-1, -2, -3) share one box, the union of their outlines, so the feet stay
on the same spot from frame to frame instead of jumping with each pose. Each frame in the JSON has x, y, w, h,
anchor [0.5, 1.0] (bottom centre = the feet on the road) and faces "left" (they come at the hero from the right).
Only the enemies the game uses so far are packed; add a group to GROUPS when the next one comes in.
"""
import json, sys, pathlib
from PIL import Image

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
# animation name -> source files, in order
GROUPS = {
    'orangeBot.walk': ['orange-bot-1', 'orange-bot-2', 'orange-bot-3'],
    'orangeBot.curl': ['orange-bot-curl'],
    'orangeBot.ball': ['orange-bot-ball'],
    'blueRunner.run': ['blue-runner-1', 'blue-runner-2', 'blue-runner-3'],
    'blueRunner.charge': ['blue-runner-charge'],
}

pieces = {}
for anim, files in GROUPS.items():
    ims = [Image.open(SRC / f'{f}.png').convert('RGBA') for f in files]
    boxes = [im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox() for im in ims]
    # one box for the whole animation (all frames of a group come at the same canvas size)
    u = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    for i, im in enumerate(ims):
        pieces[f'{anim}.{i}'] = im.crop(u)

W = sum(p.width + 2 for p in pieces.values()); H = max(p.height for p in pieces.values())
sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); meta, x = {}, 0
for k, p in pieces.items():
    sheet.paste(p, (x, 0))
    meta[k] = {'x': x, 'y': 0, 'w': p.width, 'h': p.height, 'anchor': [0.5, 1.0], 'faces': 'left'}
    x += p.width + 2
OUT.mkdir(parents=True, exist_ok=True)
sheet.save(OUT / 'enemies.webp', 'WEBP', quality=86, method=6)
(OUT / 'enemies.json').write_text(json.dumps(meta, indent=1))
print({k: (v['w'], v['h']) for k, v in meta.items()}, (OUT / 'enemies.webp').stat().st_size, 'bytes')
