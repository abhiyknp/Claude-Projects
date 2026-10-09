"""BUD & THINGS · House tour, bedroom.

Reached through the arch in the foyer's right wall. Dusk light through one tall window, a bed under a ledge of
candles, shelves of Jesmonite pieces on the left, a gifting table, and a low console under the window. Baked in
two states (dusk, and the extra glow of the candles) like the foyer. Run headless:

    python3 bud-and-things/3d/bedroom.py [out_dir] [--fast] [--only=piece,piece]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from houselib import (arch_prism, bake, box, cut, export_module, join, lathe, mat, panorama, point_light,  # noqa: E402
                      prepare, proxies, setup, srgb, t2b)
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

OUT = next((a for a in sys.argv[1:] if not a.startswith('--')), os.path.join(os.path.dirname(__file__), '..', 'prototype', 'assets', 'house'))
FAST = '--fast' in sys.argv
ONLY = next((a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('--only=')), None)
os.makedirs(OUT, exist_ok=True)
scene = setup(24 if FAST else 160)

M = {
    'plaster': mat('plaster', '#C9C2AE'), 'oak': mat('oak', '#A27752'), 'shelf': mat('shelf', '#E2C9A5'),
    'wood_dark': mat('wood_dark', '#5A3A26'), 'linen': mat('linen', '#EFE7DA'), 'head': mat('head', '#C9B79C'),
    'throw': mat('throw', '#A55B3F'), 'rug': mat('rug', '#C9A487'), 'ceiling': mat('ceiling', '#EEE8DE'),
    'proxy': mat('proxy', '#E8DCCB'), 'foyer': mat('foyer', '#EFE6D8', '#FFE2C2', .35),
}
X0, X1, Y0, Y1, H = 3.5, 10.5, 3.6, 9.6, 3.8   # bedroom interior
T = .3
WIN_X = 6.5                                     # the window, in the right-hand wall (y = Y0)

# ---------- architecture ----------
near = box('near', X0 + .01, X0 + .05, Y0 - T, Y1 + T, 0, H, M['plaster'])
cut(near, arch_prism('c', 'yz', 7.4, 2.0, 2.6, X0 - 1, X0 + 1))
far = box('far', X1, X1 + T, Y0 - T, Y1 + T, 0, H, M['plaster'])
left = box('left', X0, X1, Y1, Y1 + T, 0, H, M['plaster'])
right = box('right', X0, X1, Y0 - T, Y0, 0, H, M['plaster'])
cut(right, arch_prism('c', 'xz', WIN_X, 1.4, 1.9, Y0 - 1, Y0 + 1, z0=.55))
bwalls = join('bwalls', [near, far, left, right])
bfloor = box('bfloor', X0, X1, Y0, Y1, -.1, 0, M['oak'])
bceil = join('bceil', [box('bc', X0, X1, Y0, Y1, H, H + .1, M['ceiling'])] +
             [box('beam%d' % i, x - .09, x + .09, Y0, Y1, H - .18, H, M['wood_dark']) for i, x in enumerate((5.2, 7.2, 9.2))])
btrim = join('btrim', [box('s1', X0 + .05, X1, Y1 - .02, Y1, 0, .12, M['plaster']), box('s2', X0 + .05, X1, Y0, Y0 + .02, 0, .12, M['plaster']),
                       box('s3', X1 - .02, X1, Y0, Y1, 0, .12, M['plaster']),
                       box('sill', WIN_X - .78, WIN_X + .78, Y0 - .12, Y0 + .06, .5, .55, M['plaster'])])
# bed under a ledge of candles, with bedside tables
bed = join('bed', [
    box('base', 8.6, X1 - .05, 5.55, 7.65, 0, .36, M['oak']), box('mattress', 8.65, X1 - .1, 5.6, 7.6, .36, .6, M['linen']),
    box('throw', 8.62, 9.45, 5.55, 7.65, .6, .66, M['throw']),
    box('pil1', 9.9, 10.32, 5.8, 6.5, .6, .78, M['linen']), box('pil2', 9.9, 10.32, 6.7, 7.4, .6, .78, M['linen']),
    box('head', X1 - .12, X1, 5.35, 7.85, 0, 1.25, M['head']),
])
ledge = box('ledge', X1 - .22, X1, 5.25, 7.95, 1.5, 1.55, M['shelf'])
tables = join('tables', [box('t1', 9.95, X1 - .05, 4.75, 5.25, 0, .55, M['oak']), box('t2', 9.95, X1 - .05, 7.95, 8.45, 0, .55, M['oak'])])
# shelves and a gifting table on the left wall; a low console under the window on the right
bshelves = join('bshelves', [box('bs%d' % i, 4.4, 6.6, Y1 - .26, Y1, z, z + .045, M['shelf']) for i, z in enumerate((1.2, 1.8))])
gift = join('gift', [box('gt', 7.0, 8.2, Y1 - .5, Y1, .72, .77, M['oak'])] +
            [box('gl%d' % i, x - .03, x + .03, y - .03, y + .03, 0, .72, M['wood_dark']) for i, (x, y) in enumerate(((7.05, Y1 - .45), (8.15, Y1 - .45), (7.05, Y1 - .05), (8.15, Y1 - .05)))])
console = join('console', [box('ct', 5.6, 7.4, Y0, Y0 + .42, .45, .5, M['oak']), box('cb', 5.65, 7.35, Y0, Y0 + .4, 0, .45, M['wood_dark'])])
brug = box('brug', 7.4, 10.3, 4.8, 8.4, 0, .008, M['rug'])
chair = join('chair', [box('cs', 4.2, 4.95, 4.0, 4.75, .2, .45, M['head']), box('cbk', 4.2, 4.95, 3.85, 4.05, .2, .95, M['head']),
                       box('ca1', 4.12, 4.22, 3.9, 4.75, .2, .65, M['head']), box('ca2', 4.93, 5.03, 3.9, 4.75, .2, .65, M['head'])])
lamp = lathe('lamp', [(0, 0), (.12, 0), (.12, .03), (.02, .05), (.02, 1.5), (.0, 1.5)], M['wood_dark'], at=(4.45, 9.2, 0))
EXPORT = [bwalls, bfloor, bceil, btrim, bed, ledge, tables, bshelves, gift, console, brug, chair, lamp]
RES = {'bwalls': 2048, 'bfloor': 1024, 'bceil': 1024, 'btrim': 256, 'bed': 1024, 'ledge': 256, 'tables': 256, 'bshelves': 256,
       'gift': 256, 'console': 512, 'brug': 512, 'chair': 512, 'lamp': 256}
if FAST:
    RES = {k: max(128, v // 4) for k, v in RES.items()}

# the lit foyer beyond the arch: a glowing block, so the bake neither leaks sky nor goes black there
foyer = box('foyer_glow', 1.0, X0, 5.9, 8.9, 0, 3.0, M['foyer'])
# the foyer wall around the arch, for the depth of the opening
fw = box('fw', 3.2, X0, 5.9, 8.9, 0, 3.3, M['plaster'])
cut(fw, arch_prism('c', 'yz', 7.4, 2.0, 2.6, 3.0, 3.7))

# product stand-ins (page coordinates, matching the 'BR' pieces in TOUR_ITEMS)
P = proxies([
    ('cyl', (-10.4, 1.55, 5.6), (.06, .26)), ('cyl', (-10.4, 1.55, 5.9), (.06, .34)), ('cyl', (-10.4, 1.55, 7.0), (.081, .17)), ('cyl', (-10.4, 1.55, 7.45), (.081, .17)),
    ('cyl', (-10.2, .55, 5.0), (.081, .17)), ('cyl', (-10.2, .55, 8.2), (.2, .03)), ('cyl', (-10.2, .55, 8.2), (.062, .23)),
    ('box', (-4.9, 1.845, 9.47), (.24, .07, .32)), ('cyl', (-5.8, 1.845, 9.47), (.13, .04)), ('cyl', (-6.3, 1.845, 9.47), (.06, .28)),
    ('box', (-4.9, 1.245, 9.47), (.27, .16, .32)), ('cyl', (-5.9, 1.245, 9.47), (.09, .11)),
    ('box', (-7.25, .77, 9.3), (.39, .31, .23)), ('box', (-7.65, .77, 9.35), (.29, .26, .18)), ('cyl', (-7.95, .77, 9.3), (.081, .17)),
    ('box', (-6.0, .5, 3.8), (.52, .29, .09)), ('cyl', (-6.9, .5, 3.8), (.081, .17)),
], M['proxy'])

# ---------- light: dusk through the window, then the candles ----------
world = bpy.data.worlds.new('w')
scene.world = world
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = srgb('#B6BFD6')
sun_d = bpy.data.lights.new('sun', 'SUN')
sun_d.energy, sun_d.color, sun_d.angle = 2.6, srgb('#FFBE85')[:3], math.radians(1.5)
sun = bpy.data.objects.new('sun', sun_d)
bpy.context.collection.objects.link(sun)
sun.rotation_euler = Vector((.5, .62, -.42)).normalized().to_track_quat('-Z', 'Y').to_euler()  # low, in through the window
CANDLES = [(-10.4, 1.86, 5.6), (-10.4, 1.94, 5.9), (-10.4, 1.77, 7.0), (-10.4, 1.77, 7.45), (-10.2, .77, 5.0), (-10.2, .81, 8.2),
           (-6.3, 2.18, 9.47), (-7.95, .99, 9.3), (-6.9, .72, 3.8)]
candles = [point_light('candle', t2b(*c), 7, '#FF9A45') for c in CANDLES]


def dusk():
    sun.hide_render = False
    foyer.hide_render = False
    for c in candles:
        c.hide_render = True
    bg.inputs['Strength'].default_value = .5


def lit():
    sun.hide_render = True
    foyer.hide_render = True
    for c in candles:
        c.hide_render = False
    bg.inputs['Strength'].default_value = 0.0


prepare(EXPORT, M['plaster'])
bake(EXPORT, RES, {'day': dusk, 'lit': lit}, OUT, ONLY)
dusk()
for c in candles:
    c.hide_render = False
panorama(scene, OUT, 'env-bed', (7.6, 6.6, 1.4), FAST)
for p in P:
    p.hide_render = True
export_module(EXPORT, OUT, 'bedroom')
print('done', OUT)
