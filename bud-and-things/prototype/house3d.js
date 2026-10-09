// BUD & THINGS · Opening D · The House (foyer preview).
// The rooms are modelled and lit in Blender (bud-and-things/3d/foyer.py): the light is baked into lightmaps in two
// states, golden-hour daylight and the extra glow of the candles, and mixed here as the candles are lit. The
// products are modelled live (products3d.js) and lit by a panorama rendered from the same room, so they sit in it.
// Scroll walks the camera through; tapping a piece glides the camera to it, like a museum.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { V, clamp, seg, ease, plasterTex, tileTex, rugTex, skyTex, canvasTex, ENV_MATS, FLAMES, MAKERS, onLeaf } from './products3d.js';

const BASE = 'assets/house/';
const LM = { day: { value: 1 }, lit: { value: 0 } };  // shared by every baked surface
const PIECES = ['walls', 'floor', 'ceiling', 'front', 'niche', 'trim', 'frame', 'porch', 'door_l', 'door_r', 'bench', 'rug', 'vase', 'shelves', 'reveals'];
const H = { ready: false, items: [], focus: -1, progress: 0 };
window.HOUSE = H;

// the scroll walk: [p, camera, look-at], in page coordinates (x left, y up, z into the house)
const PATH = [
  [0, [0, 1.7, -9.5], [0, 2.7, 0]], [.05, [0, 1.65, -7.6], [0, 2.4, 0]], [.15, [0, 1.6, -3.4], [0, 2.1, 4]],
  [.21, [0, 1.6, 1.2], [0, 1.85, 9]], [.27, [0, 1.55, 5.4], [0, 1.45, 9.2]], [.3, [0, 1.5, 6.85], [0, 1.36, 9.25]], [.38, [0, 1.5, 6.95], [0, 1.38, 9.25]],
  [.42, [1.0, 1.55, 4.6], [3.2, 1.45, 4.5]], [.48, [1.05, 1.55, 4.4], [3.2, 1.45, 4.3]],
  [.53, [-1.0, 1.55, 4.1], [-3.2, 1.45, 4.0]], [.59, [-1.05, 1.55, 3.9], [-3.2, 1.45, 3.9]],
  [.67, [-.5, 1.75, 1.3], [.6, 2.3, 7]], [.76, [.4, 1.8, .9], [-.6, 2.1, 7.4]], [.86, [-1.5, 1.7, 6.2], [-4, 1.65, 7.4]], [1, [-1.9, 1.7, 6.6], [-4.5, 1.65, 7.4]]
];
const CANDLE = [.3, .38];   // the niche candles light across this stretch
// when each piece is placed or lit along the walk (TOUR_ITEMS 'at' values are shared with opening C)
const placeAt = (o) => o.at + (o.pos[0] > 0 ? .12 : .155);
const litAt = (o) => (o.place ? placeAt(o) + .005 : CANDLE[0] + (o.at - .2) * 1.4);
const labelAt = (o) => (o.place ? placeAt(o) : litAt(o) + .01);

function bakedMaterial(map, color, lmDay, lmLit) {
  const m = new THREE.MeshBasicMaterial({ map, color });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.lmDay = { value: lmDay }; sh.uniforms.lmLit = { value: lmLit }; sh.uniforms.kDay = LM.day; sh.uniforms.kLit = LM.lit;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 uv1;\nvarying vec2 vLm;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvLm = uv1;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D lmDay; uniform sampler2D lmLit; uniform float kDay; uniform float kLit; varying vec2 vLm;')
      .replace('reflectedLight.indirectDiffuse += vec3( 1.0 );', 'vec3 ld = pow(texture2D(lmDay, vLm).rgb, vec3(2.2)) * 4.0; vec3 lc = pow(texture2D(lmLit, vLm).rgb, vec3(2.2)) * 4.0;\n\t\treflectedLight.indirectDiffuse += ld * kDay + lc * kLit;');
  };
  return m;
}

function load(onProgress) {
  const mgr = new THREE.LoadingManager(); mgr.onProgress = (u, a, b) => onProgress(a / b);
  const tl = new THREE.TextureLoader(mgr);
  const lm = (state, n) => { const t = tl.load(`${BASE}lm-${state}-${n}.jpg`); t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t; };
  const maps = {}; PIECES.forEach((n) => { maps[n] = { day: lm('day', n), lit: lm('lit', n) }; });
  const oak = tl.load('assets/tex-oak.jpg'); oak.colorSpace = THREE.SRGBColorSpace; oak.wrapS = oak.wrapT = THREE.RepeatWrapping; oak.anisotropy = 8;
  return Promise.all([
    new Promise((res, rej) => new GLTFLoader(mgr).load(BASE + 'foyer.glb', res, undefined, rej)),
    new Promise((res, rej) => new RGBELoader(mgr).load(BASE + 'env.hdr', res, undefined, rej))
  ]).then(([gltf, env]) => ({ gltf, env, maps, oak }));
}

function build(res) {
  ENV_MATS.length = 0; FLAMES.length = 0;
  const scene = new THREE.Scene(); scene.background = skyTex('#7D93B8', '#E9C9A2', '#F3DEC2');
  const pm = new THREE.PMREMGenerator(H.renderer); scene.environment = pm.fromEquirectangular(res.env).texture;
  // baked rooms: Blender's y-up export turned half round, so a Blender point (x, y, z) lands at (-x, z, y)
  const root = res.gltf.scene; root.rotation.y = Math.PI; scene.add(root);
  const plaster = plasterTex(); plaster.repeat.set(.5, .5);
  const wood = (rep, col) => { const t = res.oak.clone(); t.repeat.set(rep, rep); t.needsUpdate = true; return [t, col]; };
  const stone = tileTex('#D5C6AE'); stone.repeat.set(.5, .5);
  const rug = rugTex(); rug.wrapS = rug.wrapT = THREE.ClampToEdgeWrapping; rug.repeat.set(1 / 1.6, 1 / 5.2); rug.offset.set(.5, -1.6 / 5.2);
  const LOOK = {
    walls: [plaster, '#F1E8DA'], trim: [plaster, '#F1E8DA'], reveals: [plaster, '#F1E8DA'], ceiling: [plaster, '#F3EEE6'], niche: [plaster, '#DECBB3'],
    front: [plaster, '#E8D2B2'], floor: wood(.45, '#C79B70'), frame: wood(.6, '#6E4A33'), door_l: wood(.6, '#7A5038'), door_r: wood(.6, '#7A5038'),
    shelves: wood(.8, '#EAD4B4'), bench: wood(.8, '#B98E66'), porch: [stone, '#ffffff'], rug: [rug, '#ffffff'], vase: [plaster, '#CFC0AA']
  };
  const nodes = {};
  root.traverse((o) => { if (!o.isMesh) return; const n = o.name.replace(/[._]\d+$/, ''); const key = PIECES.find((p) => n === p || o.parent?.name === p) || n; const L = LOOK[key]; const lm = res.maps[key]; if (!L || !lm) return; o.material = bakedMaterial(L[0], new THREE.Color(L[1]), lm.day, lm.lit); nodes[key] = o.parent && o.parent !== root ? o.parent : o; });
  ['door_l', 'door_r'].forEach((k) => { if (!nodes[k]) root.traverse((o) => { if (o.name === k) nodes[k] = o; }); });
  // the arched fanlight and the clerestory sky, which glow rather than take light
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48, 0, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.12, .78), toneMapped: false, side: THREE.DoubleSide })); fan.position.set(0, 3.5, -.14); scene.add(fan);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ map: skyTex('#AFC3DE', '#F2DDBF', '#F7E7CF'), toneMapped: false })); sky.rotation.y = -Math.PI / 2; sky.position.set(3.75, 3.6, 4.5); scene.add(sky);
  const beyond = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: '#3a2a20' })); beyond.rotation.y = Math.PI / 2; beyond.position.set(-4.3, 1.5, 7.4); scene.add(beyond);
  // light for the products: low sun through the windows, a warm room fill, and a point light per lit candle
  const sun = new THREE.DirectionalLight('#FFD9B0', 1.6); sun.position.set(6, 5, -5); sun.target.position.set(0, 1, 5); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#FFE7CF', '#6A4A34', .35); scene.add(hemi);
  // the pieces
  const list = window.TOUR_ITEMS || []; const byId = window.BT_BYID || {};
  H.items = list.map((o) => {
    if (o.room !== 'F') return null; const mk = MAKERS[o.k]; if (!mk) return null; const p = o.id ? byId[o.id] : null;
    const obj = mk({ ...o, name: p ? p.name : '' }); obj.position.set(...o.pos); obj.rotation.y = o.ry || 0; obj.scale.setScalar(1.3); scene.add(obj);
    obj.userData.base = obj.position.clone(); obj.userData.ry = obj.rotation.y; return { o, obj };
  });
  ENV_MATS.forEach((m) => { m.envMapIntensity = 1; });
  const candleLights = H.items.filter((it) => it && it.obj.userData.flame).map((it) => { const l = new THREE.PointLight('#FFB070', 0, 2.2, 2); it.obj.add(l); l.position.y = .3; return { it, l }; });
  return { scene, nodes, candleLights, sun, hemi };
}

// ---------- page hooks ----------
H.mount = function (stage) {
  if (H.failed) return false;
  if (H.canvas) { if (!stage.contains(H.canvas)) stage.insertBefore(H.canvas, stage.firstChild); return true; }
  try {
    const cv = document.createElement('canvas'); cv.id = 'lc-gl'; cv.setAttribute('aria-hidden', 'true'); stage.insertBefore(cv, stage.firstChild);
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1; r.outputColorSpace = THREE.SRGBColorSpace;
    H.renderer = r; H.canvas = cv; H.camera = new THREE.PerspectiveCamera(46, 1, .05, 120);
    load((f) => { H.progress = f; }).then((res) => {
      H.S = build(res); const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      const comp = new EffectComposer(r, rt); comp.addPass(new RenderPass(H.S.scene, H.camera)); comp.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .5, .92)); comp.addPass(new OutputPass());
      H.composer = comp; H.resize(H.W || 800, H.Hh || 600, window.devicePixelRatio || 1); H.ready = true; onLeaf(() => {}); window.dispatchEvent(new Event('house-ready'));
    }).catch((e) => { console.error(e); H.failed = true; });
    return true;
  } catch (e) { H.failed = true; return false; }
};
H.resize = function (W, Hh, dpr) {
  if (!H.renderer) return; H.W = W; H.Hh = Hh; H.renderer.setPixelRatio(Math.min(dpr, W < 760 ? 1.5 : 1.75)); H.renderer.setSize(W, Hh, false);
  H.camera.aspect = W / Hh; H.camera.fov = W < 760 ? 60 : 46; H.camera.updateProjectionMatrix();
  if (H.composer) { H.composer.setPixelRatio(H.renderer.getPixelRatio()); H.composer.setSize(W, Hh); }
};

// camera along the walk
let curve = null;
function pathAt(p) {
  if (!curve) curve = { pos: new THREE.CatmullRomCurve3(PATH.map((k) => V(...k[1])), false, 'catmullrom', .3), look: new THREE.CatmullRomCurve3(PATH.map((k) => V(...k[2])), false, 'catmullrom', .3) };
  let i = 0; while (i < PATH.length - 2 && p > PATH[i + 1][0]) i++;
  const u = (i + ease(clamp((p - PATH[i][0]) / (PATH[i + 1][0] - PATH[i][0])))) / (PATH.length - 1);
  return { pos: curve.pos.getPoint(u), look: curve.look.getPoint(u) };
}
// where to stand to look at a piece: in front of it, a little above
function focusView(it) {
  const o = it.o; const c = V(...o.pos); c.y += (o.top || .2) * .45; const n = V(Math.sin(o.ry || 0), 0, Math.cos(o.ry || 0)).multiplyScalar(-1);
  const d = H.W < 760 ? 1.05 : .8; return { pos: c.clone().add(n.multiplyScalar(d)).add(V(0, .12, 0)), look: c };
}
const F = { from: null, to: null, t0: 0, dir: 0, k: 0, spin: 0, p: 0 };
H.focusOn = function (i) {
  const it = H.items[i]; if (!it) return false;
  F.from = { pos: H.camera.position.clone(), look: H.lastLook ? H.lastLook.clone() : V(0, 1.5, 9) }; F.to = focusView(it); F.t0 = performance.now(); F.dir = 1; F.i = i; F.p = H.lastP || 0; H.focus = i; F.spin = 0; return true;
};
H.unfocus = function () { if (H.focus < 0) return; F.t0 = performance.now(); F.dir = -1; };
H.spin = function (dx) { F.spin += dx * .012; };
H.forceLit = {}; H.timeOf = (i) => labelAt(H.items[i].o);

const tmp = V(0, 0, 0), dir = V(0, 0, 0);
H.render = function (p, t) {
  if (!H.ready || !H.W) return [];
  const S = H.S, cam = H.camera;
  // doors
  const open = ease(seg(p, .06, .15)); if (S.nodes.door_l) S.nodes.door_l.rotation.y = open * 1.65; if (S.nodes.door_r) S.nodes.door_r.rotation.y = -open * 1.65;
  // candles: the niche lights one by one, then the shelf candles as they are placed
  let litSum = 0, litN = 0;
  H.items.forEach((it, i) => {
    if (!it) return; const { o, obj } = it; const f = obj.userData.flame;
    if (o.place) { const k = ease(seg(p, placeAt(o) - .02, placeAt(o))); obj.visible = k > 0 || H.focus === i; obj.position.y = obj.userData.base.y + (1 - k) * .3; }
    if (f) { const on = Math.max(H.forceLit[i] ? 1 : 0, seg(p, litAt(o), litAt(o) + .008)); f.visible = on > 0; litSum += on; litN++;
      if (on > 0) { const fl = 1 + .1 * Math.sin(t * 13 + i * 7) + .05 * Math.sin(t * 7.3 + i); f.scale.set(on, on * fl, on); f.rotation.z = .05 * Math.sin(t * 3 + i); }
      if (obj.userData.wax && obj.userData.wax.emissiveIntensity !== undefined) obj.userData.wax.emissiveIntensity = on * .06; }
  });
  S.candleLights.forEach(({ it, l }, k) => { l.intensity = (it.obj.userData.flame.visible ? 1 : 0) * (.9 + .1 * Math.sin(t * 11 + k)) * 1.2; });
  LM.lit.value = (litN ? litSum / litN : 0) * (.94 + .06 * Math.sin(t * 9.3) * Math.sin(t * 5.1));
  // camera: the scroll walk, or a glide to the piece in focus
  const w = pathAt(p); let pos = w.pos, look = w.look;
  if (H.W < 760 && p > .2) { const back = pos.clone().sub(look); back.y = 0; pos = pos.clone().add(back.normalize().multiplyScalar(.6)); }
  if (H.focus >= 0 && Math.abs(p - F.p) > .03 && F.dir === 1) H.unfocus();
  if (H.focus >= 0) {
    const k = ease(clamp((performance.now() - F.t0) / 1300)); F.k = F.dir > 0 ? k : 1 - k;
    const to = focusView(H.items[H.focus]); pos = pos.clone().lerp(to.pos, F.k); look = look.clone().lerp(to.look, F.k);
    const it = H.items[H.focus]; it.obj.rotation.y = it.obj.userData.ry + F.k * (F.spin + Math.sin(t * .5) * .25); it.obj.position.y = it.obj.userData.base.y + F.k * .03;
    if (F.dir < 0 && k >= 1) { it.obj.rotation.y = it.obj.userData.ry; it.obj.position.y = it.obj.userData.base.y; H.focus = -1; window.dispatchEvent(new Event('house-unfocus')); }
  }
  cam.position.copy(pos); cam.position.y += Math.sin(t * .8) * .004; cam.lookAt(look); H.lastLook = look.clone(); H.lastP = p;
  H.composer.render();
  // labels
  cam.getWorldDirection(dir);
  return H.items.map((it, i) => {
    if (!it || !it.o.label || (H.focus >= 0 && H.focus !== i) || F.k > .2) return { x: 0, y: 0, a: 0 }; const { o, obj } = it;
    if (!obj.visible) return { x: 0, y: 0, a: 0 };
    obj.getWorldPosition(tmp); tmp.y += (o.top || .2) * 1.3; const to = tmp.clone().sub(cam.position); const dist = to.length(); if (to.normalize().dot(dir) < .6 || dist > 4) return { x: 0, y: 0, a: 0 };
    const v = tmp.clone().project(cam); const x = (v.x + 1) / 2 * H.W, y = (1 - v.y) / 2 * H.Hh; const vis = x > 50 && x < H.W - 50 && y > 70 && y < H.Hh - 60 ? 1 : 0;
    const at = labelAt(o); return { x, y, a: seg(p, at, at + .01) * vis };
  });
};
H.ready = false;
window.dispatchEvent(new Event('house-module'));
void canvasTex;
