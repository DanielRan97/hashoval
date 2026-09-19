"""
Prepares the home page photo: removes the brand logos and titles printed over the top of the source
image by filling each box from its surroundings (normalised blur, so the fill matches the local colour),
then crops off the "main notes" strip at the bottom. Usage: python scripts/hero-clean.py <source.webp>
"""
import sys
import numpy as np
from PIL import Image

# boxes (x0, y0, x1, y1) in source pixels
BOXES = [
    (185, 12, 432, 142), (762, 4, 938, 174), (1292, 22, 1502, 108),  # logos and titles
    (572, 50, 586, 300), (1101, 50, 1116, 300),  # the thin gold column dividers, now floating without the titles
]
KEEP_HEIGHT = 0.718  # crop off the bottom strip of note labels


def box_blur(a, r):
    """Blur along both axes with a running-sum box filter, applied three times (close to a Gaussian)."""
    for _ in range(3):
        for axis in (0, 1):
            pad = [(0, 0)] * a.ndim
            pad[axis] = (r + 1, r)
            c = np.cumsum(np.pad(a, pad), axis=axis)
            n = a.shape[axis]
            hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
            lo = np.take(c, np.arange(0, n), axis=axis)
            a = (hi - lo) / (2 * r + 1)
    return a


im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float64)
out = im.copy()
rng = np.random.default_rng(1)
for (x0, y0, x1, y1) in BOXES:
    m = 110  # context around the box
    wx0, wy0, wx1, wy1 = max(0, x0 - m), max(0, y0 - m), min(im.shape[1], x1 + m), min(im.shape[0], y1 + m)
    win = im[wy0:wy1, wx0:wx1]
    valid = np.ones(win.shape[:2])
    valid[y0 - wy0:y1 - wy0, x0 - wx0:x1 - wx0] = 0
    r = 48
    denom = np.maximum(box_blur(valid, r), 1e-4)
    fill = np.stack([box_blur(win[..., c] * valid, r) / denom for c in range(3)], axis=-1)
    fill += rng.normal(0, 1.6, fill.shape)  # a little grain so the patch is not perfectly smooth
    hard = np.zeros(win.shape[:2])
    hard[y0 - wy0:y1 - wy0, x0 - wx0:x1 - wx0] = 1
    # feathered edge: wide for the big title boxes, narrow for the thin divider lines
    feather = max(2, min(7, min(x1 - x0, y1 - y0) // 5))
    soft = box_blur(hard, feather)[..., None]
    out[wy0:wy1, wx0:wx1] = soft * fill + (1 - soft) * win

img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
w, h = img.size
img = img.crop((0, 0, w, int(h * KEEP_HEIGHT)))
img.save("public/hero/showcase.webp", quality=90, method=6)
print("saved", img.size)
