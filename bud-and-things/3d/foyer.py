"""BUD & THINGS · House tour, foyer.

Builds the porch and the foyer in Blender, unwraps a lightmap UV for every architectural piece, bakes the light
with Cycles in two states (golden-hour daylight, and the extra glow when the candles are lit), renders a
panorama for product reflections, and exports the geometry as glTF. Run headless:

    python3 bud-and-things/3d/foyer.py [out_dir] [--fast]

Coordinates are Blender's: x to the right, y into the house, z up. In three.js a Blender point (x, y, z)
lands at (-x, z, y) after the glTF export and the scene's half-turn, which matches TOUR_ITEMS in index.html.
"""
import math
import os
import sys
import time

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh
import numpy as np
from mathutils import Vector

OUT = next((a for a in sys.argv[1:] if not a.startswith('--')), os.path.join(os.path.dirname(__file__), '..', 'prototype', 'assets', 'house'))
FAST = '--fast' in sys.argv
ONLY = next((a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('--only=')), None)  # rebake just these pieces
os.makedirs(OUT, exist_ok=True)
SAMPLES = 24 if FAST else 160
LM_MAX = 4.0  # lightmaps store (light / LM_MAX) ** (1 / 2.2)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
scene.cycles.max_bounces = 6
scene.cycles.diffuse_bounces = 4
scene.cycles.sample_clamp_indirect = 6
scene.view_settings.view_transform = 'Standard'


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c) + (1,)


MATS = {}


def mat(name, col, emit=None, strength=0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = srgb(col)
    bsdf.inputs['Roughness'].default_value = .85
    if emit:
        bsdf.inputs['Emission Color'].default_value = srgb(emit)
        bsdf.inputs['Emission Strength'].default_value = strength
    MATS[name] = m
    return m


def obj_from_bm(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if material:
        ob.data.materials.append(material)
    return ob


def box(name, x0, x1, y0, y1, z0, z1, material=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    return obj_from_bm(name, bm, material)


def arch_prism(name, plane, c, w, h_rect, d0, d1, z0=0.0, seg=28):
    """An arched opening shape (rectangle + half circle) extruded between d0 and d1.
    plane 'xz' extrudes along y (front/back walls); 'yz' extrudes along x (side walls)."""
    r = w / 2
    pts = [(c - r, z0), (c + r, z0), (c + r, z0 + h_rect)]
    pts += [(c + math.cos(a) * r, z0 + h_rect + math.sin(a) * r) for a in np.linspace(0, math.pi, seg)[1:-1]]
    pts += [(c - r, z0 + h_rect)]
    bm = bmesh.new()
    def P(u, v, d):
        return Vector((u, d, v)) if plane == 'xz' else Vector((d, u, v))
    a = [bm.verts.new(P(u, v, d0)) for u, v in pts]
    b = [bm.verts.new(P(u, v, d1)) for u, v in pts]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    n = len(pts)
    for i in range(n):
        bm.faces.new([a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, None)


def cut(ob, cutter):
    m = ob.modifiers.new('cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    m.object = cutter
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter)


def join(name, obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def lathe(name, profile, material, seg=48, at=(0, 0, 0)):
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        rings.append([bm.verts.new(Vector((at[0] + math.cos(a) * r, at[1] + math.sin(a) * r, at[2] + z))) for a in np.linspace(0, 2 * math.pi, seg, endpoint=False)])
    for i in range(len(rings) - 1):
        for j in range(seg):
            k = (j + 1) % seg
            bm.faces.new([rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]])
    return obj_from_bm(name, bm, material)


# ---------- materials (base colours only matter for light bouncing; the web view adds the textures) ----------
M = {
    'plaster': mat('plaster', '#EFE6D8'), 'niche': mat('niche', '#D9C7B0'), 'oak': mat('oak', '#A27752'),
    'shelf': mat('shelf', '#E2C9A5'), 'wood_dark': mat('wood_dark', '#5A3A26'), 'stone': mat('stone', '#CDBDA4'),
    'facade': mat('facade', '#E4C9A6'), 'rug': mat('rug', '#C9A487'), 'ceiling': mat('ceiling', '#F1EBE1'),
    'brass': mat('brass', '#B8A46A'), 'proxy': mat('proxy', '#E8DCCB'),
}

W, D, H = 3.2, 9.0, 5.0      # half width, depth, height of the foyer
T = .3                        # wall thickness
DOOR_W, DOOR_RECT = 2.6, 3.5  # door opening: 2.6 m wide, arch springs at 3.5 m

# ---------- architecture ----------
floor = box('floor', -W, W, 0, D, -.1, 0, M['oak'])
ceiling = box('ceiling', -W, W, 0, D, H, H + .1, M['ceiling'])
front = box('front', -8, 8, -T, 0, 0, 7.2, M['facade'])
cut(front, arch_prism('c', 'xz', 0, DOOR_W, DOOR_RECT, -1, 1))
back = box('back', -W - T, W + T, D, D + .6, 0, H, M['plaster'])
cut(back, arch_prism('c', 'xz', 0, 2.0, 1.7, D - .1, D + .5, z0=.9))
left = box('left', -W - T, -W, 0, D, 0, H, M['plaster'])
for y in (2.3, 4.5, 6.7):
    cut(left, arch_prism('c', 'yz', y, 1.5, 1.1, -W - 1, -W + 1, z0=2.75))
right = box('right', W, W + T, 0, D, 0, H, M['plaster'])
cut(right, arch_prism('c', 'yz', 7.4, 2.0, 2.6, W - 1, W + 1))
walls = join('walls', [back, left, right])
# niche: recess walls, a stone ledge and an oak shelf
# the recess itself is cut into the back wall above; only the ledge and the shelf are added (panels laid over the
# cut faces would block their light)
niche = join('niche', [
    box('ledge', -1.1, 1.1, D - .12, D + .5, .87, .93, M['stone']),
    box('nshelf', -.98, .98, D + .04, D + .5, 1.6, 1.645, M['shelf']),
])
# skirting all round, and a soft cornice
trim = join('trim', [
    box('s1', -W, -W + .02, 0, D, 0, .12, M['plaster']), box('s2', W - .02, W, 0, D, 0, .12, M['plaster']),
    box('s3', -W, W, D - .02, D, 0, .12, M['plaster']),
    box('c1', -W, -W + .06, 0, D, H - .1, H, M['plaster']), box('c2', W - .06, W, 0, D, H - .1, H, M['plaster']),
    box('c3', -W, W, D - .06, D, H - .1, H, M['plaster']),
])
# arched door frame (dark oak) and the fixed fanlight bars
fr_out = arch_prism('fo', 'xz', 0, DOOR_W + .3, DOOR_RECT, -T - .08, .06)
cut(fr_out, arch_prism('c', 'xz', 0, DOOR_W, DOOR_RECT, -1, 1))
fr_out.data.materials.append(M['wood_dark'])
bars = [box('transom', -DOOR_W / 2, DOOR_W / 2, -.2, -.08, DOOR_RECT - .06, DOOR_RECT + .04, M['wood_dark'])]
for i in range(1, 6):
    a = i / 6 * math.pi
    b = box('spoke%d' % i, -.02, .02, -.17, -.11, 0, 1.25, M['wood_dark'])
    b.rotation_euler = (0, -(a - math.pi / 2), 0)
    b.location = (0, 0, DOOR_RECT)
    bars.append(b)
frame = join('frame', [fr_out] + bars)
# porch: stone floor, two columns and a roof slab that throws a long shadow
porch = join('porch', [
    box('pf', -8, 8, -6, -T, -.1, 0, M['stone']), box('step', -2.2, 2.2, -1.4, -T, 0, .14, M['stone']),
    box('col1', -2.9, -2.5, -1.9, -1.5, 0, 5.4, M['facade']), box('col2', 2.5, 2.9, -1.9, -1.5, 0, 5.4, M['facade']),
    box('roof', -3.4, 3.4, -2.1, -T, 5.4, 5.75, M['facade']),
])
# the door leaves, each with its origin on the hinge so the page can swing them
def leaf(name, sd):
    parts = [box(name + 'b', -.64, .64, -.05, .05, 0, DOOR_RECT - .08, M['wood_dark'])]
    for z0, z1 in ((.25, 1.55), (1.8, 3.2)):
        for y in (-.07, .07):
            parts.append(box(name + 'p', -.46, .46, y - .02, y + .02, z0, z1, M['wood_dark']))
    ob = join(name, parts)
    for v in ob.data.vertices:
        v.co.x += -sd * .64
    ob.location = (sd * DOOR_W / 2, -.14, 0)
    return ob
door_l, door_r = leaf('door_l', -1), leaf('door_r', 1)
# furniture: a bench, a runner, a tall vase
bench = join('bench', [box('bt', W - .62, W - .2, 1.0, 2.6, .44, .5, M['oak']), box('bl1', W - .58, W - .24, 1.06, 1.12, 0, .44, M['wood_dark']), box('bl2', W - .58, W - .24, 2.48, 2.54, 0, .44, M['wood_dark'])])
rug = box('rug', -.8, .8, 1.6, 6.8, 0, .008, M['rug'])
vase = lathe('vase', [(.0, 0), (.16, 0), (.22, .25), (.2, .55), (.1, .8), (.12, .9), (0, .9)], M['stone'], at=(-W + .5, D - .6, 0))
# side shelves (viewer's left is -x in Blender)
shelves = join('shelves', [box('sl%d' % i, -W, -W + .26, 3.1, 5.7, z, z + .045, M['shelf']) for i, z in enumerate((1.13, 1.73))] +
               [box('sr%d' % i, W - .26, W, 2.7, 5.3, z, z + .045, M['shelf']) for i, z in enumerate((1.13, 1.73))])
# window reveals, so the clerestory light has depth
reveals = join('reveals', [box('rv%d' % i, -W - T, -W, y - .75, y + .75, 2.7, 2.75, M['plaster']) for i, y in enumerate((2.3, 4.5, 6.7))])

# product stand-ins: they cast the baked shadows but are not exported (the page models the real pieces)
def t2b(x, y, z):
    return (-x, z, y)
PROXIES = [  # (kind, three.js position, size)
    ('cyl', (-.5, .93, 9.2), (.081, .17)), ('cyl', (0, .93, 9.2), (.081, .17)), ('cyl', (.5, .93, 9.2), (.081, .17)),
    ('cyl', (-.36, 1.643, 9.25), (.062, .31)), ('cyl', (0, 1.643, 9.25), (.062, .25)), ('cyl', (.36, 1.643, 9.25), (.062, .27)),
    ('box', (3.06, 1.1725, 3.7), (.29, .52, .09)), ('cyl', (3.06, 1.1725, 5), (.2, .03)), ('cyl', (3.06, 1.1725, 5), (.062, .23)),
    ('cyl', (3.06, 1.7725, 4), (.13, .04)), ('cyl', (3.06, 1.7725, 5), (.081, .17)),
    ('box', (-3.06, 1.7725, 3.4), (.07, .24, .32)), ('box', (-3.06, 1.7725, 4.6), (.16, .27, .32)),
    ('cyl', (-3.06, 1.1725, 3.6), (.09, .11)), ('cyl', (-3.06, 1.1725, 4.6), (.2, .03)), ('cyl', (-3.06, 1.1725, 4.6), (.062, .23)),
]
proxies = []
for i, (k, p, s) in enumerate(PROXIES):
    x, y, z = t2b(*p)
    if k == 'cyl':
        proxies.append(lathe('proxy%d' % i, [(0, 0), (s[0], 0), (s[0], s[1]), (0, s[1])], M['proxy'], seg=24, at=(x, y, z)))
    else:
        proxies.append(box('proxy%d' % i, x - s[0] / 2, x + s[0] / 2, y - s[1] / 2, y + s[1] / 2, z, z + s[2], M['proxy']))

# ---------- light ----------
world = bpy.data.worlds.new('w')
scene.world = world
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = srgb('#C8D2DE')
sun_data = bpy.data.lights.new('sun', 'SUN')
sun_data.energy = 5.5
sun_data.color = srgb('#FFD8AE')[:3]
sun_data.angle = math.radians(1.2)
sun = bpy.data.objects.new('sun', sun_data)
bpy.context.collection.objects.link(sun)
d = Vector((.62, .55, -.5)).normalized()  # travels in through the facade and the left clerestory windows
sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
lanterns = []
for sx in (-1, 1):
    ld = bpy.data.lights.new('lantern', 'POINT')
    ld.energy, ld.color, ld.shadow_soft_size = 40, srgb('#FFC98A')[:3], .12
    lo = bpy.data.objects.new('lantern', ld)
    lo.location = (sx * 2.2, -.45, 2.7)
    bpy.context.collection.objects.link(lo)
    lanterns.append(lo)
candles = []
for (x, y, z) in [(-.5, 1.12, 9.2), (0, 1.12, 9.2), (.5, 1.12, 9.2), (-.36, 1.985, 9.25), (0, 1.92, 9.25), (.36, 1.946, 9.25), (3.06, 1.43, 5), (3.06, 1.96, 5), (-3.06, 1.43, 4.6)]:
    cd = bpy.data.lights.new('candle', 'POINT')
    cd.energy, cd.color, cd.shadow_soft_size = 7, srgb('#FF9A45')[:3], .03
    co = bpy.data.objects.new('candle', cd)
    co.location = t2b(x, y, z)
    bpy.context.collection.objects.link(co)
    candles.append(co)

# ---------- UVs: a tiled world-space map for textures, and a packed lightmap ----------
BAKE = {'walls': 2048, 'floor': 1024, 'ceiling': 512, 'front': 2048, 'niche': 1024, 'trim': 512, 'frame': 1024, 'porch': 1024,
        'door_l': 512, 'door_r': 512, 'bench': 256, 'rug': 512, 'vase': 256, 'shelves': 512, 'reveals': 256}
if FAST:
    BAKE = {k: max(128, v // 4) for k, v in BAKE.items()}
EXPORT = [bpy.data.objects[n] for n in BAKE]


def tile_uv(ob):
    me = ob.data
    me.uv_layers.new(name='tile')
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv['tile']
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            c = ob.matrix_world @ l.vert.co
            l[uv].uv = (c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y)
    bm.to_mesh(me)
    bm.free()


def lightmap_uv(ob):
    me = ob.data
    lm = me.uv_layers.new(name='lightmap')
    me.uv_layers.active = lm
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.004, area_weight=0, scale_to_bounds=True)
    bpy.ops.uv.pack_islands(margin=.006, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')


for ob in EXPORT:
    first = next((sl.material for sl in ob.material_slots if sl.material), M['plaster'])
    for sl in ob.material_slots:
        if sl.material is None:
            sl.material = first  # boolean cuts leave an empty slot behind
    for p in ob.data.polygons:
        p.use_smooth = False
    tile_uv(ob)
    lightmap_uv(ob)

# ---------- bake ----------
def set_state(state):
    sun.hide_render = state != 'day'
    for l in lanterns:
        l.hide_render = state != 'day'
    for c in candles:
        c.hide_render = state != 'lit'
    bg.inputs['Strength'].default_value = 1.1 if state == 'day' else 0.0


def encode(px, res):
    import cv2
    a = np.array(px, dtype=np.float32).reshape(res, res, 4)[::-1, :, :3]
    e = np.clip(a / LM_MAX, 0, 1) ** (1 / 2.2)
    u8 = (e * 255 + .5).astype(np.uint8)
    h = 5 if res >= 1024 else 4
    u8 = cv2.fastNlMeansDenoisingColored(u8, None, h, h, 5, 17)
    return cv2.cvtColor(u8, cv2.COLOR_RGB2BGR)


def bake_all(state):
    import cv2
    set_state(state)
    for ob in EXPORT:
        if ONLY and ob.name not in ONLY:
            continue
        res = BAKE[ob.name]
        t = time.time()
        img = bpy.data.images.new('lm_%s_%s' % (state, ob.name), res, res, float_buffer=True)
        for slot in ob.material_slots:
            nt = slot.material.node_tree
            node = nt.nodes.get('bake') or nt.nodes.new('ShaderNodeTexImage')
            node.name = 'bake'
            node.image = img
            nt.nodes.active = node
        ob.data.uv_layers.active = ob.data.uv_layers['lightmap']
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6, use_clear=True)
        cv2.imwrite(os.path.join(OUT, 'lm-%s-%s.jpg' % (state, ob.name)), encode(img.pixels[:], res), [cv2.IMWRITE_JPEG_QUALITY, 90])
        print('baked', state, ob.name, res, round(time.time() - t, 1), 's', flush=True)


bake_all('day')
bake_all('lit')

# ---------- panorama for product reflections ----------
set_state('day')
for c in candles:
    c.hide_render = False
cam_data = bpy.data.cameras.new('pano')
cam_data.type = 'PANO'
cam_data.panorama_type = 'EQUIRECTANGULAR'
cam = bpy.data.objects.new('pano', cam_data)
cam.location = (0, 4.6, 1.6)
cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
bpy.context.collection.objects.link(cam)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = (512, 256) if FAST else (1024, 512)
scene.cycles.samples = 32 if FAST else 128
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'HDR'
scene.render.filepath = os.path.join(OUT, 'env.hdr')
bpy.ops.render.render(write_still=True)
# the page loads an sRGB JPEG (plain web image type) rather than the HDR
import cv2  # noqa: E402
_e = cv2.imread(scene.render.filepath, cv2.IMREAD_UNCHANGED)
_s = np.where(_e <= .0031308, _e * 12.92, 1.055 * np.power(np.clip(_e, 0, None), 1 / 2.4) - .055)
cv2.imwrite(os.path.join(OUT, 'env.jpg'), np.clip(_s * 255, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
os.remove(scene.render.filepath)

# ---------- export ----------
for p in proxies:
    p.hide_render = True
bpy.ops.object.select_all(action='DESELECT')
for ob in EXPORT:
    ob.select_set(True)
# embedded glTF saved as .json: plain JSON is a served web type where .glb is not
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'foyer.gltf'), use_selection=True, export_format='GLTF_EMBEDDED', export_texcoords=True,
                          export_normals=True, export_materials='NONE', export_yup=True, export_apply=True)
os.replace(os.path.join(OUT, 'foyer.gltf'), os.path.join(OUT, 'foyer.json'))
print('done', OUT)
