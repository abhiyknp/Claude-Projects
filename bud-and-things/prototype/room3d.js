// BUD & THINGS · "See it in a room": one piece in a small, real-lit 3D corner of a room.
// The piece is the same live 3D model as in the house (products3d.js), standing on an oak console against a plaster
// wall. A spot light with a window-pane pattern plays the sun, the room panorama baked in Blender (assets/house/env*.jpg)
// gives the reflections and soft fill, and shadows are real, so the piece sits in the room instead of being pasted on.
// Two looks: daylight by the window, and the bedroom at dusk with a lamp on. Candles can be lit.
// The page calls window.ROOM3D (set below): open(canvas, item, look), setItem, setLook, setLit, blob, snapshot, close.
import * as THREE from 'three';
import { MAKERS, ENV_MATS, plasterTex, weaveTex, lathe, box, canvasTex } from './products3d.js';

const LOOKS = {
  day: { env: 'assets/house/env.jpg', wall: '#EFE3D3', bg: '#E9DCCB', key: '#FFE6C2', keyI: 5.2, fill: .55, envI: .75, exp: 1.02, lamp: 0, cool: 0 },
  dusk: { env: 'assets/house/env-bed.jpg', wall: '#D8B79C', bg: '#B89478', key: '#9FB4DA', keyI: 1.1, fill: .22, envI: .35, exp: .95, lamp: 1.8, cool: 1 }
};
const R = { renderer: null, scene: null, cam: null, piece: null, canvas: null, raf: 0, look: 'day', lit: false, yaw: .42, pitch: .3, dist: 1.05, target: new THREE.Vector3(0, .06, 0),
  lights: {}, envs: {}, ro: null, ptrs: new Map(), drag: null, flames: [], flameLights: [], wall: null, size: .2 };
const loader = new THREE.TextureLoader();

// a window seen from inside: four panes and a cross bar, so the sunlight falls on the wall and console in panes
function paneTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * .62); g.addColorStop(0, '#fff'); g.addColorStop(.8, '#ddd'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(w * .12, h * .1, w * .76, h * .8);
    x.fillStyle = '#000'; x.fillRect(w * .48, 0, w * .04, h); x.fillRect(0, h * .47, w, h * .045);
    x.filter = 'blur(3px)'; x.drawImage(x.canvas, 0, 0); x.filter = 'none';
  }, null, true);
}

function envFor(look) {
  if (R.envs[look]) return Promise.resolve(R.envs[look]);
  return new Promise((res) => loader.load(LOOKS[look].env, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(R.renderer); R.envs[look] = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose(); res(R.envs[look]);
  }, undefined, () => res(null)));
}

function setup(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = r; R.canvas = canvas;
  const s = new THREE.Scene(); R.scene = s;
  R.cam = new THREE.PerspectiveCamera(30, 1, .02, 20);

  // the room: plaster wall, oak console, a linen runner, a stoneware vase with dried stems, two books
  const plaster = plasterTex(); plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping; plaster.repeat.set(3, 2);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), new THREE.MeshStandardMaterial({ map: plaster, color: LOOKS.day.wall, roughness: .95 }));
  wall.position.set(0, .9, -.34); wall.receiveShadow = true; s.add(wall); R.wall = wall;
  const oak = loader.load('assets/tex-oak.jpg'); oak.colorSpace = THREE.SRGBColorSpace; oak.wrapS = oak.wrapT = THREE.RepeatWrapping; oak.repeat.set(3.2, .9); oak.anisotropy = 8;
  const rough = loader.load('assets/tex-oak-rough.jpg'); rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(3.2, .9);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, .04, .68), new THREE.MeshStandardMaterial({ map: oak, roughnessMap: rough, roughness: .85, color: '#CDB497' }));
  top.position.set(0, -.02, 0); top.receiveShadow = top.castShadow = true; s.add(top);
  const front = new THREE.Mesh(new THREE.BoxGeometry(2.4, .7, .02), new THREE.MeshStandardMaterial({ map: oak, roughness: .85, color: '#B99C7E' }));
  front.position.set(0, -.39, .32); front.receiveShadow = true; s.add(front);
  const runner = new THREE.Mesh(new THREE.BoxGeometry(.5, .003, .6), new THREE.MeshStandardMaterial({ map: weaveTex('#E8DCCB', [3, 3]), roughness: 1 }));
  runner.position.set(-.62, .0015, -.02); runner.receiveShadow = true; s.add(runner);
  const stone = new THREE.MeshStandardMaterial({ color: '#8E6B54', roughness: .85 });
  const vase = lathe([[0, 0], [.05, 0], [.062, .04], [.066, .1], [.05, .17], [.026, .21], [.03, .235], [0, .235]], stone, 40); vase.position.set(-.62, .003, -.12); s.add(vase);
  const stemM = new THREE.MeshStandardMaterial({ color: '#B89A6E', roughness: 1 });
  [[-.04, .3, .12], [.03, .36, -.1], [0, .42, .05]].forEach(([lean, h, rot]) => {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0022, h, 5), stemM); st.position.set(-.62 + lean * .8, .235 + h / 2 - .02, -.12); st.rotation.z = lean * 2.2; st.rotation.x = rot; st.castShadow = true; s.add(st);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.014, 10, 8), stemM); head.scale.y = 1.8; head.position.set(-.62 + lean * 3.2, .235 + h - .03, -.12 + rot * .2); head.castShadow = true; s.add(head);
  });
  [['#6B705C', .03, 0], ['#C9A96A', .022, .3]].forEach(([c, h, ry], i) => { const b = box(.24, h, .17, new THREE.MeshStandardMaterial({ color: c, roughness: .9 }), .004); b.position.set(.66, (i ? .03 : 0) + h / 2, -.1); b.rotation.y = ry; s.add(b); });

  // light: the sun through a window (with panes), a soft sky fill, a bedside lamp for dusk
  const key = new THREE.SpotLight(LOOKS.day.key, LOOKS.day.keyI, 0, .62, .55, 0);
  key.position.set(-1.6, 1.9, 1.5); key.target.position.set(.15, .1, -.2); key.map = paneTex(); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4; key.shadow.camera.near = .5; key.shadow.camera.far = 6;
  s.add(key, key.target);
  const hemi = new THREE.HemisphereLight('#FFF3E2', '#6A4A34', LOOKS.day.fill); s.add(hemi);
  const lamp = new THREE.PointLight('#FFB46E', 0, 3.2, 2); lamp.position.set(.95, .55, .15); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.radius = 6; lamp.shadow.bias = -.001; s.add(lamp);
  R.lights = { key, hemi, lamp };

  // drag to look around, pinch or scroll to come closer
  const el = canvas;
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); R.ptrs.set(e.pointerId, [e.clientX, e.clientY]); R.drag = { yaw: R.yaw, pitch: R.pitch, dist: R.dist, pts: new Map(R.ptrs) }; });
  el.addEventListener('pointermove', (e) => {
    if (!R.ptrs.has(e.pointerId) || !R.drag) return; R.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const now = [...R.ptrs.values()], was = [...R.drag.pts.values()];
    if (now.length !== was.length) { R.drag = { yaw: R.yaw, pitch: R.pitch, dist: R.dist, pts: new Map(R.ptrs) }; return; }
    if (now.length > 1) { const d = (a) => Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); zoomTo(R.drag.dist * d(was) / Math.max(1, d(now))); return; }
    R.yaw = Math.max(-1, Math.min(1, R.drag.yaw - (now[0][0] - was[0][0]) * .006)); R.pitch = Math.max(.06, Math.min(.8, R.drag.pitch + (now[0][1] - was[0][1]) * .005));
  });
  ['pointerup', 'pointercancel'].forEach((t) => el.addEventListener(t, (e) => { R.ptrs.delete(e.pointerId); R.drag = R.ptrs.size ? { yaw: R.yaw, pitch: R.pitch, dist: R.dist, pts: new Map(R.ptrs) } : null; }));
  el.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(R.dist * (e.deltaY > 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
  el.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, .05], ArrowDown: [0, -.05] }[e.key];
    if (k) { e.preventDefault(); R.yaw = Math.max(-1, Math.min(1, R.yaw + k[0])); R.pitch = Math.max(.06, Math.min(.8, R.pitch + k[1])); }
    else if (e.key === '+' || e.key === '=' || e.key === '-') { e.preventDefault(); zoomTo(R.dist * (e.key === '-' ? 1.1 : 1 / 1.1)); }
  });
  R.ro = new ResizeObserver(resize); R.ro.observe(canvas.parentElement);
}
const zoomTo = (d) => { R.dist = Math.max(R.size * 1.6 + .12, Math.min(R.size * 6 + .6, d)); };

function resize() {
  const p = R.canvas && R.canvas.parentElement; if (!p) return; const w = p.clientWidth, h = p.clientHeight; if (!w || !h) return;
  R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix();
}

function makePiece(item) {
  const mk = MAKERS[item.k] || MAKERS.box; const from = ENV_MATS.length;
  const o = Object.assign({ c: '#DCC9AE', name: '' }, item); if (o.k === 'box') Object.assign(o, { w: o.w || .24, h: o.h || .13, d: o.d || .2 });
  const g = mk(o); const mats = ENV_MATS.splice(from); mats.forEach((m) => { m.envMapIntensity = 1; });
  g.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  const bb = new THREE.Box3().setFromObject(g); const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3());
  g.position.set(-c.x, -bb.min.y + .001, -c.z); const wrap = new THREE.Group(); wrap.add(g); wrap.rotation.y = item.ry || 0;
  const flames = []; g.traverse((n) => { if (n.userData && n.userData.flame) flames.push(n.userData.flame); });
  return { obj: wrap, size: Math.max(sz.x, sz.y, sz.z), h: sz.y, flames };
}

function placePiece(item) {
  if (R.piece) { R.scene.remove(R.piece.obj); R.flameLights.forEach((l) => l.parent && l.parent.remove(l)); }
  const pc = makePiece(item); R.piece = pc; R.scene.add(pc.obj); R.size = pc.size;
  R.target.set(0, Math.min(.16, pc.h * .45), 0); R.dist = (pc.size * 3.4 + .36) * Math.max(1, Math.sqrt(1.3 / (R.cam.aspect || 1.3))); zoomTo(R.dist);
  R.flameLights = pc.flames.map((f) => { const l = new THREE.PointLight('#FFB070', 0, 1.6, 2); l.castShadow = false; f.parent.add(l); l.position.copy(f.position); l.position.y += .03; return l; });
  setLit(R.lit);
}

function setLook(look) {
  R.look = LOOKS[look] ? look : 'day'; const L = LOOKS[R.look]; const { key, hemi, lamp } = R.lights;
  key.color.set(L.key); key.intensity = L.keyI; hemi.intensity = L.fill; lamp.intensity = L.lamp; R.wall.material.color.set(L.wall);
  R.scene.background = new THREE.Color(L.bg); R.renderer.toneMappingExposure = L.exp;
  envFor(R.look).then((t) => { if (t && R.look === look) { R.scene.environment = t; R.scene.traverse((n) => { if (n.isMesh && n.material && 'envMapIntensity' in n.material) n.material.envMapIntensity = L.envI; }); } });
}
function setLit(on) {
  R.lit = !!on; if (!R.piece) return; R.piece.flames.forEach((f) => { f.visible = R.lit; }); R.flameLights.forEach((l) => { l.intensity = R.lit ? (R.look === 'dusk' ? .8 : .45) : 0; });
}

function frame(t) {
  R.raf = requestAnimationFrame(frame);
  const c = Math.cos(R.pitch); R.cam.position.set(R.target.x + Math.sin(R.yaw) * c * R.dist, R.target.y + Math.sin(R.pitch) * R.dist, R.target.z + Math.cos(R.yaw) * c * R.dist);
  R.cam.lookAt(R.target);
  if (R.lit) { const k = 1 + Math.sin(t * .011) * .05 + Math.sin(t * .031) * .04; R.flameLights.forEach((l) => { l.intensity = (R.look === 'dusk' ? .8 : .45) * k; }); R.piece.flames.forEach((f) => { f.scale.y = .92 + k * .08; }); }
  R.renderer.render(R.scene, R.cam);
}

function open(canvas, item, look) {
  if (!R.renderer || R.canvas !== canvas) { if (R.renderer) { R.ro.disconnect(); R.renderer.dispose(); } R.envs = {}; setup(canvas); }
  R.yaw = .42; R.pitch = .3; resize(); placePiece(item); setLook(look || R.look); cancelAnimationFrame(R.raf); R.raf = requestAnimationFrame(frame);
}
function close() { cancelAnimationFrame(R.raf); R.raf = 0; }
// the current view as a JPEG, for Share and Save photo
function blob() { return new Promise((res) => { R.renderer.render(R.scene, R.cam); R.canvas.toBlob(res, 'image/jpeg', .92); }); }

// the piece alone on a transparent background, lit like the room, to stand in a visitor's own photo
const SNAP = { r: null, cache: new Map() };
async function snapshot(item, key) {
  if (SNAP.cache.has(key)) return SNAP.cache.get(key);
  if (!SNAP.r) {
    const c = document.createElement('canvas'); c.width = c.height = 640;
    SNAP.r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
    SNAP.r.outputColorSpace = THREE.SRGBColorSpace; SNAP.r.toneMapping = THREE.ACESFilmicToneMapping; SNAP.r.setClearColor(0x000000, 0);
    const pm = new THREE.PMREMGenerator(SNAP.r); const t = await new Promise((res) => loader.load(LOOKS.day.env, res, undefined, () => res(null)));
    if (t) { t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; SNAP.env = pm.fromEquirectangular(t).texture; } pm.dispose();
  }
  const s = new THREE.Scene(); s.environment = SNAP.env || null;
  s.add(new THREE.HemisphereLight('#FFF3E2', '#6A4A34', .7)); const d = new THREE.DirectionalLight('#FFE6C2', 2.4); d.position.set(-1, 1.6, 1.4); s.add(d);
  const pc = makePiece(item); s.add(pc.obj); s.traverse((n) => { if (n.isMesh && n.material && 'envMapIntensity' in n.material) n.material.envMapIntensity = .8; });
  const bb = new THREE.Box3().setFromObject(pc.obj); const sz = bb.getSize(new THREE.Vector3()); const ctr = bb.getCenter(new THREE.Vector3());
  // a camera a little above eye level, like a phone held over a shelf; the frame is fitted to the piece
  const cam = new THREE.PerspectiveCamera(22, 1, .01, 10); const dist = Math.max(sz.x, sz.y, sz.z) * 3.4; const pitch = .26;
  cam.position.set(ctr.x + Math.sin(.42) * Math.cos(pitch) * dist, ctr.y + Math.sin(pitch) * dist, ctr.z + Math.cos(.42) * Math.cos(pitch) * dist); cam.lookAt(ctr);
  SNAP.r.render(s, cam);
  // crop to the piece so its base sits on the image's bottom edge
  const src = SNAP.r.domElement; const W = src.width, H = src.height; const t2 = document.createElement('canvas'); t2.width = W; t2.height = H; const x = t2.getContext('2d'); x.drawImage(src, 0, 0);
  const px = x.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y += 2) for (let i = 0; i < W; i += 2) if (px[(y * W + i) * 4 + 3] > 16) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) return null; const out = document.createElement('canvas'); out.width = x1 - x0 + 4; out.height = y1 - y0 + 4; out.getContext('2d').drawImage(t2, x0 - 2, y0 - 2, out.width, out.height, 0, 0, out.width, out.height);
  const url = out.toDataURL('image/png'); SNAP.cache.set(key, url); return url;
}

window.ROOM3D = { open, close, setItem: placePiece, setLook, setLit, blob, snapshot, lit: () => R.lit };
window.dispatchEvent(new Event('room3d-ready'));
