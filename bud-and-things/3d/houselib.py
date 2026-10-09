"""Shared helpers for the BUD & THINGS house rooms (foyer.py, bedroom.py).

Geometry helpers build simple boxes, arched openings and lathed forms with bmesh; prepare() gives every exported
piece a tiled texture UV and a packed lightmap UV; bake() renders each lighting state with Cycles into JPEG
lightmaps; export_module() writes the geometry as a JS module (glTF JSON plus a base64 buffer).

Coordinates are Blender's: x to the right, y into the house, z up. In three.js a Blender point (x, y, z) lands at
(-x, z, y) after the glTF export and the scene's half-turn, which matches TOUR_ITEMS in index.html.
"""
import json
import math
import os
import time

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh
import cv2
import numpy as np
from mathutils import Vector

LM_MAX = 4.0  # lightmaps store (light / LM_MAX) ** (1 / 2.2)
MATS = {}


def setup(samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 4
    scene.cycles.sample_clamp_indirect = 6
    scene.view_settings.view_transform = 'Standard'
    MATS.clear()
    return scene


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c) + (1,)


def mat(name, col, emit=None, strength=0):
    """A matte material. Only its colour matters for the bake (light bouncing); the page adds the textures."""
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


def t2b(x, y, z):
    """A page (three.js) position to Blender's coordinates."""
    return (-x, z, y)


def proxies(items, material):
    """Stand-ins for the products: they cast the baked shadows but are never exported."""
    out = []
    for i, (k, p, s) in enumerate(items):
        x, y, z = t2b(*p)
        if k == 'cyl':
            out.append(lathe('proxy%d' % i, [(0, 0), (s[0], 0), (s[0], s[1]), (0, s[1])], material, seg=24, at=(x, y, z)))
        else:
            out.append(box('proxy%d' % i, x - s[0] / 2, x + s[0] / 2, y - s[1] / 2, y + s[1] / 2, z, z + s[2], material))
    return out


def point_light(name, loc, energy, col, size=.03):
    d = bpy.data.lights.new(name, 'POINT')
    d.energy, d.color, d.shadow_soft_size = energy, srgb(col)[:3], size
    o = bpy.data.objects.new(name, d)
    o.location = loc
    bpy.context.collection.objects.link(o)
    return o


def _tile_uv(ob):
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


def _lightmap_uv(ob):
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


def prepare(objs, fallback):
    for ob in objs:
        first = next((sl.material for sl in ob.material_slots if sl.material), fallback)
        for sl in ob.material_slots:
            if sl.material is None:
                sl.material = first  # boolean cuts leave an empty slot behind
        for p in ob.data.polygons:
            p.use_smooth = False
        _tile_uv(ob)
        _lightmap_uv(ob)


def _encode(px, res):
    a = np.array(px, dtype=np.float32).reshape(res, res, 4)[::-1, :, :3]
    e = np.clip(a / LM_MAX, 0, 1) ** (1 / 2.2)
    u8 = (e * 255 + .5).astype(np.uint8)
    h = 5 if res >= 1024 else 4
    u8 = cv2.fastNlMeansDenoisingColored(u8, None, h, h, 5, 17)
    return cv2.cvtColor(u8, cv2.COLOR_RGB2BGR)


def bake(objs, res, states, out, only=None):
    """Bake each lighting state into lm-<state>-<piece>.jpg. states maps a state name to a function that sets the lights."""
    for state, set_lights in states.items():
        set_lights()
        for ob in objs:
            if only and ob.name not in only:
                continue
            r = res[ob.name]
            t = time.time()
            img = bpy.data.images.new('lm_%s_%s' % (state, ob.name), r, r, float_buffer=True)
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
            cv2.imwrite(os.path.join(out, 'lm-%s-%s.jpg' % (state, ob.name)), _encode(img.pixels[:], r), [cv2.IMWRITE_JPEG_QUALITY, 90])
            print('baked', state, ob.name, r, round(time.time() - t, 1), 's', flush=True)


def panorama(scene, out, name, location, fast):
    """An equirectangular render from inside the room, saved as an sRGB JPEG, for product reflections."""
    cam_data = bpy.data.cameras.new('pano')
    cam_data.type = 'PANO'
    cam_data.panorama_type = 'EQUIRECTANGULAR'
    cam = bpy.data.objects.new('pano', cam_data)
    cam.location = location
    cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = (512, 256) if fast else (1024, 512)
    scene.cycles.samples = 32 if fast else 128
    scene.cycles.use_denoising = True
    scene.render.image_settings.file_format = 'HDR'
    hdr = os.path.join(out, name + '.hdr')
    scene.render.filepath = hdr
    bpy.ops.render.render(write_still=True)
    e = cv2.imread(hdr, cv2.IMREAD_UNCHANGED)
    s = np.where(e <= .0031308, e * 12.92, 1.055 * np.power(np.clip(e, 0, None), 1 / 2.4) - .055)
    cv2.imwrite(os.path.join(out, name + '.jpg'), np.clip(s * 255, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
    os.remove(hdr)


def export_module(objs, out, name):
    """Export as GLB, then ship it as a JS module (glTF JSON + base64 buffer): served everywhere, and nothing on
    the page has to fetch a binary file or a data: URL."""
    import base64
    import struct
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        ob.select_set(True)
    path = os.path.join(out, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_texcoords=True,
                              export_normals=True, export_materials='NONE', export_yup=True, export_apply=True)
    raw = open(path, 'rb').read()
    off, g, binb = 12, None, b''
    while off < len(raw):
        ln, typ = struct.unpack('<II', raw[off:off + 8])
        chunk = raw[off + 8:off + 8 + ln]
        off += 8 + ln
        if typ == 0x4E4F534A:
            g = json.loads(chunk)
        elif typ == 0x004E4942:
            binb = chunk
    with open(os.path.join(out, name + '.js'), 'w') as fh:
        fh.write('// %s geometry from bud-and-things/3d: glTF JSON plus its binary buffer as base64.\n' % name.capitalize())
        fh.write('// Shipped as a module so it loads like any script, with no fetch of a binary file or a data: URL.\n')
        fh.write('export default { gltf: ' + json.dumps(g, separators=(',', ':')) + ', bin: "' + base64.b64encode(binb).decode() + '" };\n')
    os.remove(path)
