// BUD & THINGS · Opening D · The House: the foyer, then through the arch into the bedroom.
// The rooms are modelled and lit in Blender (bud-and-things/3d/foyer.py, bedroom.py): the light is baked into
// lightmaps in two states, daylight (dusk in the bedroom) and the extra glow of the candles, mixed here as the candles
// are lit. A mood (a feeling, or the kind of gift) recolours the rooms, shifts the light and dresses the house. The
// products are modelled live (products3d.js) and lit by a panorama rendered from the same room, so they sit in it.
// Scroll walks the camera through; tapping a piece glides the camera to it, like a museum.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { V, clamp, seg, ease, plasterTex, tileTex, rugTex, skyTex, canvasTex, weaveTex, mat, ENV_MATS, FLAMES, MAKERS, flameMesh, onLeaf } from './products3d.js';

const BASE = 'assets/house/';
// each room's baked surfaces share one pair of light levels
const LM = { F: { day: { value: 1 }, lit: { value: 0 } }, B: { day: { value: 1 }, lit: { value: 0 } } };
const ROOMS = {
  F: { module: 'foyer', env: 'env.jpg', pieces: ['walls', 'floor', 'ceiling', 'front', 'niche', 'trim', 'frame', 'porch', 'door_l', 'door_r', 'bench', 'rug', 'vase', 'shelves', 'reveals'] },
  B: { module: 'bedroom', env: 'env-bed.jpg', pieces: ['bwalls', 'bfloor', 'bceil', 'btrim', 'bed', 'ledge', 'tables', 'bshelves', 'gift', 'console', 'brug', 'chair', 'lamp'] }
};
const FS = .56; // the foyer takes this share of the walk, the bedroom the rest
// moods: a feeling, or the kind of gift. Colours for walls and textiles, how much daylight and candle light, and dressing.
const MOODS3 = {
  house: {},
  calm: { wallF: '#EEE9E0', wallB: '#C9CFBF', textile: '#C9CDBE', bed: '#F2EFE8', day: 1.08, lit: .8 },
  cosy: { wallF: '#EED8BE', wallB: '#B99A7C', textile: '#A55B3F', bed: '#EAD7C1', day: .62, lit: 1.4, exp: 1.05 },
  fresh: { wallF: '#F4F1E9', wallB: '#C3D3C6', textile: '#9DB7A5', bed: '#F4F2EC', day: 1.18, lit: .6 },
  creative: { wallF: '#EAD3BF', wallB: '#C98B6B', textile: '#6B7B5B', bed: '#E7D9C6', day: .95, lit: 1 },
  birthday: { wallF: '#F3E2DC', wallB: '#E2BBB0', textile: '#C97F70', bed: '#F6E9E4', lit: 1.1, extras: ['balloons'] },
  housewarming: { wallF: '#EFE1CA', wallB: '#BCA683', textile: '#C08A5B', bed: '#EEE2D0', extras: ['plants'] },
  festive: { wallF: '#F2D9BC', wallB: '#8E3E3E', textile: '#B8862D', bed: '#F1DFC4', day: .55, lit: 1.6, exp: 1.05, extras: ['garlands', 'diyas'] },
  'thank-you': { wallF: '#F1E8DA', wallB: '#D7C6AC', textile: '#E6D5C1', bed: '#F3ECE1', extras: ['cards'] }
};
const H = { ready: false, items: [], focus: -1, progress: 0 };
window.HOUSE = H;

// the scroll walk: [p, camera, look-at], in page coordinates (x left, y up, z into the house)
const PATH = [
  ...[[0, [0, 1.7, -9.5], [0, 2.7, 0]], [.05, [0, 1.65, -7.6], [0, 2.4, 0]], [.15, [0, 1.6, -3.4], [0, 2.1, 4]],
    [.21, [0, 1.6, 1.2], [0, 1.85, 9]], [.27, [0, 1.55, 5.4], [0, 1.45, 9.2]], [.3, [0, 1.5, 6.85], [0, 1.36, 9.25]], [.38, [0, 1.5, 6.95], [0, 1.38, 9.25]],
    [.42, [1.0, 1.55, 4.6], [3.2, 1.45, 4.5]], [.48, [1.05, 1.55, 4.4], [3.2, 1.45, 4.3]],
    [.53, [-1.0, 1.55, 4.1], [-3.2, 1.45, 4.0]], [.59, [-1.05, 1.55, 3.9], [-3.2, 1.45, 3.9]],
    [.67, [-.5, 1.75, 1.3], [.6, 2.3, 7]], [.76, [.4, 1.8, .9], [-.6, 2.1, 7.4]]].map(([t, a, b]) => [t * FS, a, b]),
  // through the arch into the bedroom: the bed and its candle ledge, the left shelves, the gifting table, the window
  [.47, [-1.5, 1.7, 6.6], [-4.5, 1.6, 7.4]], [.505, [-3.6, 1.65, 7.4], [-10.5, 1.4, 7.0]], [.54, [-6.5, 1.55, 6.8], [-10.5, 1.3, 6.6]],
  [.6, [-7.3, 1.5, 6.6], [-10.5, 1.35, 6.6]], [.645, [-7.31, 1.5, 6.65], [-10.5, 1.35, 6.62]],
  [.69, [-5.6, 1.55, 7.7], [-5.6, 1.5, 9.6]], [.735, [-5.65, 1.55, 7.75], [-5.65, 1.5, 9.6]],
  [.775, [-7.55, 1.5, 7.55], [-7.6, .95, 9.6]], [.81, [-7.57, 1.5, 7.57], [-7.62, .95, 9.6]],
  [.85, [-6.5, 1.55, 6.1], [-6.5, 1.15, 3.6]], [.89, [-6.52, 1.55, 6.08], [-6.52, 1.15, 3.6]],
  [.94, [-4.4, 1.75, 5.2], [-9.8, 1.3, 7.2]], [1, [-4.2, 1.8, 5.0], [-9.8, 1.3, 7.2]]
];
const CANDLE = [.3, .38];   // the niche candles light across this stretch (foyer time)
// when each piece is placed or lit along the walk. Foyer pieces reuse opening C's 'at' values on a foyer clock;
// bedroom pieces ('hp') give the walk position directly.
const placeAt = (o) => (o.hp ? o.at : (o.at + (o.pos[0] > 0 ? .12 : .155)) * FS);
const litAt = (o) => (o.place ? placeAt(o) + .005 : o.hp ? o.at : (CANDLE[0] + (o.at - .2) * 1.4) * FS);
const labelAt = (o) => (o.place ? placeAt(o) : litAt(o) + .01);
const roomAt = (p) => (p < .48 ? 'F' : 'B');

function bakedMaterial(map, color, lmDay, lmLit, L) {
  const m = new THREE.MeshBasicMaterial({ map, color });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.lmDay = { value: lmDay }; sh.uniforms.lmLit = { value: lmLit }; sh.uniforms.kDay = L.day; sh.uniforms.kLit = L.lit;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLm;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvLm = uv1;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D lmDay; uniform sampler2D lmLit; uniform float kDay; uniform float kLit; varying vec2 vLm;')
      .replace('reflectedLight.indirectDiffuse += vec3( 1.0 );', 'vec3 ld = pow(texture2D(lmDay, vLm).rgb, vec3(2.2)) * 4.0; vec3 lc = pow(texture2D(lmLit, vLm).rgb, vec3(2.2)) * 4.0;\n\t\treflectedLight.indirectDiffuse += ld * kDay + lc * kLit;');
  };
  return m;
}

// pack the glTF JSON and its buffer into one GLB in memory, so the loader never has to fetch anything
function glb({ gltf, bin }) {
  const raw = atob(bin), body = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) body[i] = raw.charCodeAt(i);
  let js = new TextEncoder().encode(JSON.stringify(gltf)); const jp = (4 - js.length % 4) % 4; const bp = (4 - body.length % 4) % 4;
  const total = 12 + 8 + js.length + jp + 8 + body.length + bp; const out = new ArrayBuffer(total); const dv = new DataView(out); const u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, js.length + jp, true); dv.setUint32(16, 0x4E4F534A, true); u8.set(js, 20); u8.fill(0x20, 20 + js.length, 20 + js.length + jp);
  const o = 20 + js.length + jp; dv.setUint32(o, body.length + bp, true); dv.setUint32(o + 4, 0x004E4942, true); u8.set(body, o + 8);
  return out;
}
function load(onProgress) {
  const mgr = new THREE.LoadingManager(); mgr.onProgress = (u, a, b) => onProgress(a / b);
  const tl = new THREE.TextureLoader(mgr);
  const lm = (state, n) => { const t = tl.load(`${BASE}lm-${state}-${n}.jpg`); t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t; };
  const env = (f) => new Promise((res, rej) => tl.load(BASE + f, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; res(t); }, undefined, rej));
  const maps = {}; Object.values(ROOMS).forEach((R) => R.pieces.forEach((n) => { maps[n] = { day: lm('day', n), lit: lm('lit', n) }; }));
  const oak = tl.load('assets/tex-oak.jpg'); oak.colorSpace = THREE.SRGBColorSpace; oak.wrapS = oak.wrapT = THREE.RepeatWrapping; oak.anisotropy = 8;
  const geo = (k) => import(`./assets/house/${ROOMS[k].module}.js`).then((m) => new Promise((res, rej) => new GLTFLoader().parse(glb(m.default), '', res, rej)));
  return Promise.all([geo('F'), geo('B'), env(ROOMS.F.env), env(ROOMS.B.env)]).then(([gF, gB, eF, eB]) => ({ gltf: { F: gF, B: gB }, env: { F: eF, B: eB }, maps, oak }));
}

function build(res) {
  ENV_MATS.length = 0; FLAMES.length = 0;
  const scene = new THREE.Scene(); scene.background = skyTex('#7D93B8', '#E9C9A2', '#F3DEC2');
  const pm = new THREE.PMREMGenerator(H.renderer); const envs = { F: pm.fromEquirectangular(res.env.F).texture, B: pm.fromEquirectangular(res.env.B).texture }; scene.environment = envs.F;
  const plaster = plasterTex(); plaster.repeat.set(.5, .5);
  const wood = (rep, col) => { const t = res.oak.clone(); t.repeat.set(rep, rep); t.needsUpdate = true; return [t, col]; };
  const stone = tileTex('#D5C6AE'); stone.repeat.set(.5, .5);
  const rug = rugTex(); rug.wrapS = rug.wrapT = THREE.ClampToEdgeWrapping; rug.repeat.set(1 / 1.6, 1 / 5.2); rug.offset.set(.5, 5.8 / 5.2); // glTF flips v: the runner spans v = -5.8 … -0.6
  const brug = rugTex(); brug.wrapS = brug.wrapT = THREE.ClampToEdgeWrapping; brug.repeat.set(1 / 2.9, 1 / 3.6); brug.offset.set(-7.4 / 2.9, 8.4 / 3.6); brug.rotation = 0;
  const linen = weaveTex('#ffffff', [2, 2]);
  // [texture, colour, mood category]
  const LOOK = {
    walls: [plaster, '#F1E8DA', 'wallF'], trim: [plaster, '#F1E8DA', 'wallF'], reveals: [plaster, '#F1E8DA', 'wallF'], ceiling: [plaster, '#F3EEE6'], niche: [plaster, '#DECBB3'],
    front: [plaster, '#E8D2B2'], floor: wood(.45, '#C79B70'), frame: wood(.6, '#6E4A33'), door_l: wood(.6, '#7A5038'), door_r: wood(.6, '#7A5038'),
    shelves: wood(.8, '#EAD4B4'), bench: wood(.8, '#B98E66'), porch: [stone, '#ffffff'], rug: [rug, '#ffffff', 'textile'], vase: [plaster, '#CFC0AA'],
    bwalls: [plaster, '#DCD1BD', 'wallB'], btrim: [plaster, '#DCD1BD', 'wallB'], bfloor: wood(.45, '#B88B62'), bceil: [plaster, '#EFE8DD'],
    bed: [linen, '#EFE6D8', 'bed'], ledge: wood(.8, '#EAD4B4'), tables: wood(.8, '#B98E66'), bshelves: wood(.8, '#EAD4B4'), gift: wood(.8, '#B98E66'),
    console: wood(.8, '#9C7454'), brug: [brug, '#ffffff', 'textile'], chair: [linen, '#C9B79C', 'textile2'], lamp: [plaster, '#5A3A26']
  };
  const nodes = {}; const cats = {};
  for (const k of ['F', 'B']) {
    const root = res.gltf[k].scene; root.rotation.y = Math.PI; scene.add(root); // Blender (x, y, z) lands at (-x, z, y)
    root.traverse((o) => {
      if (!o.isMesh) return; const key = ROOMS[k].pieces.find((p) => o.name === p || o.name.replace(/[._]\d+$/, '') === p || o.parent?.name === p); const L = key && LOOK[key]; const lm = key && res.maps[key]; if (!L || !lm) return;
      o.material = bakedMaterial(L[0], new THREE.Color(L[1]), lm.day, lm.lit, LM[k]); nodes[key] = o;
      if (L[2]) (cats[L[2]] = cats[L[2]] || []).push({ m: o.material, base: L[1] });
    });
  }
  // what glows rather than takes light: the fanlight, the sky beyond the windows
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48, 0, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.12, .78), toneMapped: false, side: THREE.DoubleSide })); fan.position.set(0, 3.5, -.14); scene.add(fan);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ map: skyTex('#AFC3DE', '#F2DDBF', '#F7E7CF'), toneMapped: false })); sky.rotation.y = -Math.PI / 2; sky.position.set(3.75, 3.6, 4.5); scene.add(sky);
  const dusk = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.6), new THREE.MeshBasicMaterial({ map: skyTex('#3B4466', '#C98E78', '#E7B48E'), toneMapped: false })); dusk.position.set(-6.5, 1.8, 3.15); scene.add(dusk);
  // sheer curtains at the bedroom window, which move
  const curtains = [-5.62, -7.38].map((x) => { const c = curtain(.5, 2.95, '#F6EFE4'); c.position.set(x, 3.35, 3.72); scene.add(c); return c; });
  // light for the products: low sun through the windows, a warm room fill, and a point light per lit candle
  const sun = new THREE.DirectionalLight('#FFD9B0', 1.6); sun.position.set(6, 5, -5); sun.target.position.set(0, 1, 5); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#FFE7CF', '#6A4A34', .35); scene.add(hemi);
  // the pieces
  const list = window.TOUR_ITEMS || []; const byId = window.BT_BYID || {};
  H.items = list.map((o) => {
    if (o.room !== 'F' && o.room !== 'BR') return null; const mk = MAKERS[o.k]; if (!mk) return null; const p = o.id ? byId[o.id] : null;
    const obj = mk({ ...o, name: p ? p.name : '' }); obj.position.set(...o.pos); obj.rotation.y = o.ry || 0; obj.scale.setScalar(1.3); scene.add(obj);
    obj.userData.base = obj.position.clone(); obj.userData.ry = obj.rotation.y; return { o, obj, p, room: o.room === 'BR' ? 'B' : 'F' };
  });
  const candleLights = H.items.filter((it) => it && it.obj.userData.flame).map((it) => { const l = new THREE.PointLight('#FFB070', 0, 2.2, 2); it.obj.add(l); l.position.y = .3; return { it, l }; });
  const extras = dressing(scene);
  ENV_MATS.forEach((m) => { m.envMapIntensity = 1; });
  return { scene, nodes, cats, envs, curtains, candleLights, sun, hemi, extras };
}
function curtain(w, h, col) {
  const geo = new THREE.PlaneGeometry(w, h, 18, 24); geo.translate(0, -h / 2, 0); const base = geo.attributes.position.array.slice();
  const m = mat({ color: col, roughness: 1, transparent: true, opacity: .45, side: THREE.DoubleSide, emissive: new THREE.Color('#FFD7AE'), emissiveIntensity: .06 });
  const mesh = new THREE.Mesh(geo, m); mesh.userData = { base, h }; return mesh;
}
// what each gifting mood adds to the rooms
function dressing(scene) {
  const g = {}; const add = (k) => { const grp = new THREE.Group(); grp.visible = false; scene.add(grp); g[k] = grp; return grp; };
  // festive: marigold garlands round the niche and along the bed ledge, and diyas
  const gar = add('garlands'); const mari = [mat({ color: '#E8901C', roughness: .8 }), mat({ color: '#F2B42B', roughness: .8 })];
  const bead = new THREE.SphereGeometry(.03, 10, 8);
  const strand = (pts) => pts.forEach((p, i) => { const s = new THREE.Mesh(bead, mari[Math.floor(i / 3) % 2]); s.position.copy(p); s.scale.setScalar(.85 + (i % 3) * .1); gar.add(s); });
  const arc = []; for (let i = 0; i <= 60; i++) { const a = Math.PI * i / 60; arc.push(V(Math.cos(a) * 1.04, 2.6 + Math.sin(a) * 1.04, 8.96)); } strand(arc);
  [-1.04, 1.04].forEach((x) => { const s = []; for (let i = 0; i < 26; i++) s.push(V(x, 2.6 - i * .055, 8.96)); strand(s); });
  const cat = []; for (let i = 0; i <= 50; i++) { const u = i / 50; cat.push(V(-10.4, 2.25 - Math.sin(Math.PI * u) * .3, 5.2 + u * 2.8)); } strand(cat);
  const diyas = add('diyas'); const clay = mat({ color: '#B0644A', roughness: .9 });
  [[-.92, .93, 8.94], [-.78, .93, 8.94], [.78, .93, 8.94], [.92, .93, 8.94], [-10.3, 1.55, 5.35], [-10.3, 1.55, 7.8]].forEach((p) => {
    const d = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.035, 0], [.05, .02], [.045, .025], [.0, .012]].map(([x, y]) => new THREE.Vector2(x, y)), 20), clay); d.position.set(...p); diyas.add(d);
    const f = flameMesh(); f.position.set(p[0], p[1] + .02, p[2]); f.scale.setScalar(.8); diyas.add(f); });
  // birthday: balloons by the gifting table and the bench
  const bal = add('balloons'); [['#E3A595', -7.3, 2.3, 9.25], ['#F6E2C8', -7.75, 2.55, 9.3], ['#C97F70', -8.1, 2.2, 9.2], ['#E3A595', -2.7, 1.9, 1.5], ['#F6E2C8', -2.95, 2.15, 1.9]].forEach(([c, x, y, z]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), new THREE.MeshPhysicalMaterial({ color: c, roughness: .25, clearcoat: 1, envMapIntensity: 1 })); b.scale.y = 1.18; b.position.set(x, y, z); bal.add(b);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, y - .8, 4), new THREE.MeshBasicMaterial({ color: '#8a7a6a' })); s.position.set(x, (y + .8) / 2 - .1, z); bal.add(s); });
  // housewarming: plants in clay pots
  const pl = add('plants'); const leafTex = new THREE.TextureLoader().load('assets/leaf.png'); const lm = mat({ map: leafTex, alphaTest: .5, side: THREE.DoubleSide, color: '#5E7246', roughness: .8 });
  [[1.45, 0, 8.6, 1.2], [-1.45, 0, 8.6, 1.2], [-7.9, 0, 4.0, 1.0], [-3.0, .5, 1.1, .5]].forEach(([x, y, z, s], k) => {
    const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.16, 0], [.2, .38], [.22, .4], [0, .4]].map(([a, b]) => new THREE.Vector2(a, b)), 28), mat({ color: '#A55B3F', roughness: .9 }));
    const grp = new THREE.Group(); grp.add(pot); for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.3, .62), lm); l.position.y = .75 + (i % 4) * .08; l.rotation.set((i % 3 - 1) * .3, i / 14 * Math.PI * 2 + k, (i % 2 ? .4 : -.4)); l.translateY(.12); grp.add(l); }
    grp.position.set(x, y, z); grp.scale.setScalar(s); pl.add(grp); });
  // thank you: small folded cards in front of the pieces
  const cards = add('cards'); const cardTex = canvasTex(256, 160, (x, w, h) => { x.fillStyle = '#FBF6EC'; x.fillRect(0, 0, w, h); x.fillStyle = '#3D281E'; x.textAlign = 'center'; x.font = 'italic 44px "Cormorant Garamond", Georgia, serif'; x.fillText('Thank you', w / 2, h / 2 + 14); });
  [[-.25, .93, 9.02, Math.PI], [.25, .93, 9.02, Math.PI], [-7.45, .77, 9.12, Math.PI], [-6.45, .5, 3.95, 0]].forEach(([x, y, z, r]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(.12, .075, .004), new THREE.MeshStandardMaterial({ map: cardTex, roughness: .9 })); c.position.set(x, y + .04, z); c.rotation.set(-.25, r, 0); cards.add(c); });
  return g;
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
      const comp = new EffectComposer(r, rt); comp.addPass(new RenderPass(H.S.scene, H.camera)); comp.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .4, .5, 1.05)); comp.addPass(new OutputPass());
      H.composer = comp; H.resize(H.W || 800, H.Hh || 600, window.devicePixelRatio || 1); H.setMood(H.mood); H.ready = true; onLeaf(() => {}); window.dispatchEvent(new Event('house-ready'));
    }).catch((e) => { console.error(e); H.error = String((e && e.message) || e); H.failed = true; });
    return true;
  } catch (e) { H.error = String((e && e.message) || e); H.failed = true; return false; }
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
  const o = it.o; const c = V(...o.pos); c.y += (o.top || .2) * .45; const n = V(Math.sin(o.ry || 0), 0, Math.cos(o.ry || 0)); // the side the piece faces
  const mob = H.W < 760, d = mob ? 1.1 : .8; const pos = c.clone().add(n.clone().multiplyScalar(d)).add(V(0, .12, 0)); const look = c.clone();
  // leave room for the panel: on a wide screen the piece sits left of centre, on a phone above the sheet
  if (mob) { look.y -= .16; } else { const side = V(0, 1, 0).cross(n).normalize().multiplyScalar(.22); pos.add(side); look.add(side); }
  return { pos, look };
}
const F = { from: null, to: null, t0: 0, dir: 0, k: 0, spin: 0, p: 0 };
H.focusOn = function (i) {
  const it = H.items[i]; if (!it) return false;
  F.from = { pos: H.camera.position.clone(), look: H.lastLook ? H.lastLook.clone() : V(0, 1.5, 9) }; F.to = focusView(it); F.t0 = performance.now(); F.dir = 1; F.i = i; F.p = H.lastP || 0; H.focus = i; F.spin = 0; return true;
};
H.unfocus = function () { if (H.focus < 0) return; F.t0 = performance.now(); F.dir = -1; };
H.spin = function (dx) { F.spin += dx * .012; };
H.mood = 'house';
// does a piece suit the mood? Feelings match a product's moods, gifting moods its occasions
H.matches = (i) => { const it = H.items[i]; if (!it || !it.p || H.mood === 'house') return true; const p = it.p; return ['calm', 'cosy', 'fresh', 'creative'].includes(H.mood) ? (p.mood || []).includes(H.mood) : (p.occ || []).includes(H.mood); };
H.setMood = function (k) {
  H.mood = MOODS3[k] ? k : 'house'; if (!H.S) return; const M = MOODS3[H.mood];
  Object.entries(H.S.cats).forEach(([cat, list]) => list.forEach(({ m, base }) => m.color.set(M[cat] || base)));
  Object.entries(H.S.extras).forEach(([k2, g]) => { g.visible = (M.extras || []).includes(k2); });
};
H.roomAt = roomAt;
H.forceLit = {}; H.isLit = (i) => { const f = H.items[i] && H.items[i].obj.userData.flame; return !!(f && f.visible); }; H.timeOf = (i) => labelAt(H.items[i].o);

const tmp = V(0, 0, 0), dir = V(0, 0, 0);
H.render = function (p, t) {
  if (!H.ready || !H.W) return [];
  const S = H.S, cam = H.camera;
  // doors
  const open = ease(seg(p, .06 * FS, .15 * FS)); if (S.nodes.door_l) S.nodes.door_l.rotation.y = open * 1.65; if (S.nodes.door_r) S.nodes.door_r.rotation.y = -open * 1.65;
  // candles: the niche lights one by one, then the shelf candles as they are placed
  const lit = { F: [0, 0], B: [0, 0] };
  H.items.forEach((it, i) => {
    if (!it) return; const { o, obj } = it; const f = obj.userData.flame;
    if (o.place) { const k = ease(seg(p, placeAt(o) - .02, placeAt(o))); obj.visible = k > 0 || H.focus === i; obj.position.y = obj.userData.base.y + (1 - k) * .3; }
    if (f) { const fo = H.forceLit[i]; const on = fo === 1 ? 1 : fo === -1 ? 0 : seg(p, litAt(o), litAt(o) + .008); f.visible = on > 0; lit[it.room][0] += on; lit[it.room][1]++;
      if (on > 0) { const fl = 1 + .1 * Math.sin(t * 13 + i * 7) + .05 * Math.sin(t * 7.3 + i); f.scale.set(on, on * fl, on); f.rotation.z = .05 * Math.sin(t * 3 + i); }
      if (obj.userData.wax && obj.userData.wax.emissiveIntensity !== undefined) obj.userData.wax.emissiveIntensity = on * .06; }
  });
  S.candleLights.forEach(({ it, l }, k) => { l.intensity = (it.obj.userData.flame.visible ? 1 : 0) * (.9 + .1 * Math.sin(t * 11 + k)) * 1.2; });
  const M = MOODS3[H.mood] || {}; const fl = .94 + .06 * Math.sin(t * 9.3) * Math.sin(t * 5.1);
  for (const k of ['F', 'B']) { LM[k].day.value = M.day ?? 1; LM[k].lit.value = (lit[k][1] ? lit[k][0] / lit[k][1] : 0) * (M.lit ?? 1) * fl; }
  // the curtains breathe, more when you scroll quickly
  H.wind = (H.wind || 0) * .92 + Math.min(1, Math.abs(p - (H.lastP ?? p)) * 600) * .08; const amp = .04 + H.wind * .2;
  S.curtains.forEach((c, ci) => { const a = c.geometry.attributes.position, b = c.userData.base; for (let i = 0; i < a.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], d = -y / c.userData.h; a.setZ(i, amp * d * Math.sin(t * 1.3 + x * 4 + ci * 2) + .025 * Math.sin(x * 16 + ci)); } a.needsUpdate = true; c.geometry.computeVertexNormals(); });
  // camera: the scroll walk, or a glide to the piece in focus
  const w = pathAt(p); let pos = w.pos, look = w.look;
  if (H.W < 760 && p > .2 * FS) { const back = pos.clone().sub(look); back.y = 0; pos = pos.clone().add(back.normalize().multiplyScalar(.6)); }
  if (H.focus >= 0 && Math.abs(p - F.p) > .03 && F.dir === 1) H.unfocus();
  if (H.focus >= 0) {
    const k = ease(clamp((performance.now() - F.t0) / 1300)); F.k = F.dir > 0 ? k : 1 - k;
    const to = focusView(H.items[H.focus]); pos = pos.clone().lerp(to.pos, F.k); look = look.clone().lerp(to.look, F.k);
    const it = H.items[H.focus]; it.obj.rotation.y = it.obj.userData.ry + F.k * (F.spin + Math.sin(t * .5) * .25); it.obj.position.y = it.obj.userData.base.y + F.k * .03;
    if (F.dir < 0 && k >= 1) { it.obj.rotation.y = it.obj.userData.ry; it.obj.position.y = it.obj.userData.base.y; H.focus = -1; window.dispatchEvent(new Event('house-unfocus')); }
  }
  H.renderer.toneMappingExposure = (.78 + .22 * seg(p, .07, .11)) * (M.exp ?? 1); // the porch is in full sun, the rooms are softer
  S.scene.environment = pos.x < -3.4 ? S.envs.B : S.envs.F;
  cam.position.copy(pos); cam.position.y += Math.sin(t * .8) * .004; cam.lookAt(look); H.lastLook = look.clone(); H.lastP = p;
  H.composer.render();
  // labels
  cam.getWorldDirection(dir);
  return H.items.map((it, i) => {
    if (!it || !it.o.label || (H.focus >= 0 && H.focus !== i) || F.k > .2 || !H.matches(i)) return { x: 0, y: 0, a: 0 }; const { o, obj } = it;
    if (!obj.visible) return { x: 0, y: 0, a: 0 };
    obj.getWorldPosition(tmp); tmp.y += (o.top || .2) * 1.3; const to = tmp.clone().sub(cam.position); const dist = to.length(); if (to.normalize().dot(dir) < .6 || dist > 4) return { x: 0, y: 0, a: 0 };
    const v = tmp.clone().project(cam); const x = (v.x + 1) / 2 * H.W, y = (1 - v.y) / 2 * H.Hh; const vis = x > 50 && x < H.W - 50 && y > 70 && y < H.Hh - 60 ? 1 : 0;
    const at = labelAt(o); return { x, y, a: seg(p, at, at + .01) * vis };
  });
};
H.ready = false;
window.dispatchEvent(new Event('house-module'));
void canvasTex;
