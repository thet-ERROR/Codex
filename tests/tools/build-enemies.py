"""RAM RUSH: pack the enemy frames into one sheet (game/assets/enemies.webp + enemies.json).
The frames (transparent PNGs) are kept outside the repo, in the local _minigame-plan/images/enemies folder.

    pip install pillow
    python tests/tools/build-enemies.py _minigame-plan/images/enemies game/assets

Frames of one animation (orange-bot-1, -2, -3) share one box, the union of their outlines, so the feet stay
on the same spot from frame to frame instead of jumping with each pose. Each frame in the JSON has x, y, w, h,
anchor [0.5, 1.0] (bottom centre = the feet on the road) and faces "left" (they come at the hero from the right).
Only the enemies the game uses so far are packed; add a group to GROUPS when the next one comes in.
Groups in OWN_BOX come in different canvas sizes (the spikes, growing out of the road): each frame keeps its
own outline instead, and still stands on its bottom centre.
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
    'spyDrone.fly': ['spy-drone-1', 'spy-drone-2', 'spy-drone-3'],
    'fireCrawler.crawl': ['fire-crawler-1', 'fire-crawler-2', 'fire-crawler-3', 'fire-crawler-4'],
    'spikes.rise': ['spikes-1', 'spikes-2', 'spikes-3'],
    'mechBoss.walk': ['mech-boss-1', 'mech-boss-2', 'mech-boss-3', 'mech-boss-4'],
    'mechBoss.charge': ['mech-boss-charge'],
    'mechBoss.fire': ['mech-boss-fire'],
    'mechBoss.stunned': ['mech-boss-stunned'],
}

OWN_BOX = {'spikes.rise'}
# Groups whose frames do not all stand on the canvas bottom (the boss's first step is drawn higher):
# each frame is moved down onto it first, then they share one box as usual
BOTTOM = {'mechBoss.walk'}
# Frames whose body is not in the middle of the picture (the boss's shot has its flames on the left): the
# anchor is moved so that the boss's chest core stays on one spot from walk to charge to shot to stunned
# (measured: the core, the bright magenta circle, lands 9px left of the feet in every one)
ANCHOR = {'mechBoss.walk': [0.427, 1.0], 'mechBoss.fire': [0.608, 1.0], 'mechBoss.stunned': [0.545, 1.0]}

pieces = {}
for anim, files in GROUPS.items():
    ims = [Image.open(SRC / f'{f}.png').convert('RGBA') for f in files]
    outline = lambda im: im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if anim in BOTTOM:
        moved = []
        for im in ims:
            c = Image.new('RGBA', im.size, (0, 0, 0, 0)); c.paste(im, (0, im.height - outline(im)[3])); moved.append(c)
        ims = moved
    boxes = [outline(im) for im in ims]
    # one box for the whole animation (all frames of a group come at the same canvas size)
    u = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    for i, im in enumerate(ims):
        pieces[f'{anim}.{i}'] = im.crop(boxes[i] if anim in OWN_BOX else u)

# shelves: left to right, a new row when the next would pass MAX_W (some phones refuse wider images)
MAX_W = 2048
spots, x, y, row = {}, 0, 0, 0
for k, p in pieces.items():
    if x + p.width > MAX_W: x, y, row = 0, y + row + 2, 0
    spots[k] = (x, y); x += p.width + 2; row = max(row, p.height)
W = max(spots[k][0] + p.width for k, p in pieces.items()); H = y + row
sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); meta = {}
for k, p in pieces.items():
    sheet.paste(p, spots[k])
    meta[k] = {'x': spots[k][0], 'y': spots[k][1], 'w': p.width, 'h': p.height,
               'anchor': ANCHOR.get(k.rsplit('.', 1)[0], [0.5, 1.0]), 'faces': 'left'}
OUT.mkdir(parents=True, exist_ok=True)
sheet.save(OUT / 'enemies.webp', 'WEBP', quality=86, method=6)
(OUT / 'enemies.json').write_text(json.dumps(meta, indent=1))
print({k: (v['w'], v['h']) for k, v in meta.items()}, (OUT / 'enemies.webp').stat().st_size, 'bytes')
