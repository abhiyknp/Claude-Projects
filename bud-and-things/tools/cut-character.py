#!/usr/bin/env python3
"""Turns a character picture on a plain green background into a cut-out for the festive looks.

  python3 bud-and-things/tools/cut-character.py picture.png xmas peek elf
  python3 bud-and-things/tools/cut-character.py picture.png diw wave girl

If the character wears green, add KEEP_GREEN=1 in front so its green clothes are not cut out with the background.

Arguments: the picture, the look id (xmas, ny, val, diw, holi, eid, bday), the pose (peek or wave) and a short name.
It writes bud-and-things/prototype/assets/festive/chars/<look>-<pose>-<name>.webp and adds it to manifest.json, so the
shop starts using it at random. Needs Pillow, numpy and scipy (pip install pillow numpy scipy).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, minimum_filter

LOOKS = {'xmas', 'ny', 'val', 'diw', 'holi', 'eid', 'bday'}
POSES = {'peek', 'wave'}


def main():
    if len(sys.argv) != 5:
        print(__doc__); sys.exit(1)
    src, look, pose, name = sys.argv[1:]
    if look not in LOOKS or pose not in POSES:
        print('look must be one of', sorted(LOOKS), 'and pose peek or wave'); sys.exit(1)
    im = Image.open(src).convert('RGB')
    c = np.asarray(im).astype(np.float32)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    d = g - np.maximum(r, b)                      # how green a pixel is, beyond red and blue
    alpha = np.clip(1 - (d - 10) / (48 - 10), 0, 1)
    if os.environ.get('KEEP_GREEN') == '1':
        # the character wears green (an elf's collar, a leaf): key on distance from the real background colour instead,
        # so dark greens inside the character stay opaque
        H0, W0 = r.shape
        corners = np.concatenate([c[:20, :20].reshape(-1, 3), c[:20, -20:].reshape(-1, 3), c[-20:, :20].reshape(-1, 3), c[-20:, -20:].reshape(-1, 3)])
        key = np.median(corners, axis=0)
        dist = np.sqrt(((c - key) ** 2).sum(-1))
        alpha = np.clip((dist - 70) / (150 - 70), 0, 1)
        alpha = np.clip((alpha - .45) / .55, 0, 1)      # drop the faint green-tinted halo around fur and hair
    # the green behind the character is not perfectly flat: estimate it so edges unmix cleanly
    bgmask = (alpha < .02).astype(np.float32)
    den = gaussian_filter(bgmask, 40)
    bg = np.stack([gaussian_filter(c[..., k] * bgmask, 40) / np.maximum(den, 1e-3) for k in range(3)], -1)
    a3 = alpha[..., None]
    f = np.clip((c - (1 - a3) * bg) / np.maximum(a3, .05), 0, 255)
    lim = np.maximum(f[..., 0], f[..., 2])
    f[..., 1] = np.where(alpha < .999, np.minimum(f[..., 1], lim + 4), f[..., 1])   # remove green spill on edges
    # bright background-green left on the very edge of the character (fur, hair): pull it back to neutral near the outline only
    from scipy.ndimage import binary_dilation
    edge = binary_dilation(alpha < .98, iterations=4)
    spill = edge & (f[..., 1] > f[..., 0] + 25) & (f[..., 1] > f[..., 2] + 25) & (f[..., 1] > 140)
    f[..., 1] = np.where(spill, np.maximum(f[..., 0], f[..., 2]) + 2, f[..., 1])
    H, W = alpha.shape
    if pose == 'peek':
        # the ledge shadow leaves faint smudges under the hands: drop anything not solid in the lower part
        lo = int(H * .86)
        alpha[lo:, :] = np.where(alpha[lo:, :] < .88, 0, alpha[lo:, :])
    alpha = gaussian_filter(minimum_filter(alpha, size=3), .7)
    # sleeves or paws cut by the picture frame fade out softly instead of ending in a straight edge
    x = np.arange(W)[None, :].astype(np.float32)
    fade = np.clip(np.minimum(x, W - 1 - x) / (W * .06), 0, 1)
    alpha *= fade * fade * (3 - 2 * fade)
    if pose == 'wave':
        y = np.arange(H)[:, None].astype(np.float32)
        alpha *= np.clip((H - 1 - y) / (H * .06), 0, 1)      # soft fade where the body leaves the frame
    # the outline keeps its softness (alpha) but takes its colour from the solid pixels a few pixels inside, so no background
    # green or dark rim survives on fur or hair
    from scipy.ndimage import distance_transform_edt, binary_erosion
    solid = binary_erosion(alpha >= .97, iterations=4)
    if solid.any():
        _, (iy, ix) = distance_transform_edt(~solid, return_indices=True)
        f = np.where(solid[..., None], f, f[iy, ix])
    out = Image.fromarray(np.dstack([f, alpha * 255]).astype(np.uint8), 'RGBA')
    bb = out.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox()
    out = out.crop(bb)
    w = 900 if pose == 'peek' else 700
    out = out.resize((w, int(out.height * w / out.width)), Image.LANCZOS)
    here = os.path.dirname(os.path.abspath(__file__))
    folder = os.path.join(here, '..', 'prototype', 'assets', 'festive', 'chars')
    os.makedirs(folder, exist_ok=True)
    fn = '%s-%s-%s.webp' % (look, pose, name)
    out.save(os.path.join(folder, fn), quality=88, method=6)
    mp = os.path.join(folder, 'manifest.json')
    m = json.load(open(mp)) if os.path.exists(mp) else {}
    lst = m.setdefault(look, {}).setdefault(pose, [])
    if fn not in lst:
        lst.append(fn)
    json.dump(m, open(mp, 'w'), indent=2); open(mp, 'a').write('\n')
    print('saved', fn, out.size, os.path.getsize(os.path.join(folder, fn)) // 1024, 'KB')


if __name__ == '__main__':
    main()
