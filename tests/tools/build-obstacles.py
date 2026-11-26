"""RAM RUSH: pack the obstacles, the background cars and the platform pieces into one sheet
(game/assets/obstacles.webp + obstacles.json). The frames (transparent PNGs) are kept outside the repo, in the
local _minigame-plan folder (obstacles/frames and images/platforms-obstacles).

    pip install pillow
    python tests/tools/build-obstacles.py _minigame-plan game/assets

Each frame keeps its whole canvas (no crop): the hitboxes in config.js OBSTACLES are pixels of these canvases.
The JSON gives each frame's x, y, w, h in the sheet.
"""
import json, sys, pathlib
from PIL import Image

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
FILES = {
    'barrier': 'obstacles/frames/barrier.png',
    'boom_gate': 'obstacles/frames/boom_gate.png',
    'car_blue': 'obstacles/frames/car_blue.png',
    'car_orange': 'obstacles/frames/car_orange.png',
    'cables': 'images/platforms-obstacles/hanging-cables.png',
    'sign': 'images/platforms-obstacles/hanging-sign.png',
    'laser_off': 'images/platforms-obstacles/laser-grid-off.png',
    'laser_on': 'images/platforms-obstacles/laser-grid-on.png',
    'platform_left': 'images/platforms-obstacles/platform-left.png',
    'platform_middle': 'images/platforms-obstacles/platform-middle.png',
    'platform_right': 'images/platforms-obstacles/platform-right.png',
    'platform': 'images/platforms-obstacles/platform.png',
    'platform_cracked': 'images/platforms-obstacles/platform-cracked.png',
    'platform_broken': 'images/platforms-obstacles/platform-broken.png',
}
ims = {k: Image.open(SRC / f).convert('RGBA') for k, f in FILES.items()}

# shelves, tallest first: left to right, a new row when the next would pass MAX_W (some phones refuse wider images)
MAX_W, PAD = 2048, 2
spots, x, y, row, width = {}, 0, 0, 0, 0
for k in sorted(ims, key=lambda k: -ims[k].height):
    im = ims[k]
    if x + im.width > MAX_W: x, y, row = 0, y + row + PAD, 0
    spots[k] = (x, y)
    x += im.width + PAD; row = max(row, im.height); width = max(width, x)
sheet = Image.new('RGBA', (width, y + row), (0, 0, 0, 0))
frames = {}
for k, (sx, sy) in spots.items():
    sheet.paste(ims[k], (sx, sy))
    frames[k] = {'x': sx, 'y': sy, 'w': ims[k].width, 'h': ims[k].height}
OUT.mkdir(parents=True, exist_ok=True)
sheet.save(OUT / 'obstacles.webp', 'WEBP', quality=88, method=6)
(OUT / 'obstacles.json').write_text(json.dumps(frames, indent=1), encoding='utf-8')
print(sheet.size, (OUT / 'obstacles.webp').stat().st_size, 'bytes')
