// BUD & THINGS · Opening C · Home Tour (3D).
// One continuous camera walk, driven by scroll: the front door swings open, then the foyer, the living room and
// the bedroom. In each room the candles on the centre shelf light one by one, and the pieces we sell are placed on
// the left and right shelves as decor. Built with three.js; every surface texture except the oak is generated here.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { V, clamp, seg, ease, rnd, mixHex, canvasTex, plasterTex, noiseBump, tileTex, weaveTex, skyTex, ENV_MATS, mat, textures, archPath, wallMesh, archRing, box, lathe, FLAMES, MAKERS, onLeaf } from './products3d.js';


// ---------- the house ----------
function buildRoom(R, M) {
  const { W, D, H } = R; const g = new THREE.Group(); const wallM = M.wall;
  const near = wallM && wallMesh(W, H, [{ x: 0, w: R.entry.w, h: R.entry.h }], wallM); near.position.z = 0; g.add(near);
  const far = wallMesh(W, H, R.farHoles || [], wallM); far.rotation.y = Math.PI; far.position.z = D; g.add(far);
  const side = (sx, holes) => { const w = wallMesh(D, H, holes.map((o) => ({ ...o, x: sx > 0 ? o.z - D / 2 : D / 2 - o.z })), wallM); w.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; w.position.set(sx * W / 2, 0, D / 2); g.add(w); };
  side(1, R.leftHoles || []); side(-1, R.rightHoles || []);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, D / 2); floor.receiveShadow = true; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.ceil); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, D / 2); g.add(ceil);
  // skirting
  const sk = mat({ color: mixHex(M.wallCol, '#000000', .12), roughness: .8 });
  [[0, .06, D, W / 2 - .01, 0], [0, .06, D, -W / 2 + .01, 0]].forEach(([, h, len, x]) => { const b = box(.02, .12, len, sk, 0); b.position.set(x, h, D / 2); g.add(b); });
  const fb = box(W, .12, .02, sk, 0); fb.position.set(0, .06, D - .01); g.add(fb);
  return g;
}
function shelf(len, m, depth = .26) { const b = box(len, .045, depth, m, .008); return b; }
function curtain(w, h, col) {
  const geo = new THREE.PlaneGeometry(w, h, 26, 30); geo.translate(0, -h / 2, 0); const base = geo.attributes.position.array.slice();
  const m = mat({ color: col, roughness: 1, transparent: true, opacity: .62, side: THREE.DoubleSide, emissive: new THREE.Color(col), emissiveIntensity: .08 });
  const mesh = new THREE.Mesh(geo, m); mesh.userData = { base, w, h }; return mesh;
}
function plant(M) {
  const g = new THREE.Group(); g.add(lathe([[0, 0], [.17, 0], [.22, .42], [.24, .44], [0, .44]], mat({ color: '#A55B3F', roughness: .9 })));
  const lm = mat({ map: M.leafTex, alphaTest: .5, side: THREE.DoubleSide, color: '#5E7246', roughness: .8 });
  for (let i = 0; i < 16; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.34, .7), lm); l.position.set(0, .8 + rnd() * .4, 0); l.rotation.set((rnd() - .5) * .6, i / 16 * Math.PI * 2, (rnd() - .5) * .8); l.translateY(.15); l.castShadow = true; g.add(l); }
  return g;
}

const T = { ready: false, items: [] };
window.TOUR3 = T;

const PATH = [
  // [p, camera position, look-at]
  [0, [0, 1.75, -11], [0, 2.4, 0]], [.05, [0, 1.7, -9], [0, 2.3, 0]], [.12, [0, 1.62, -4.6], [0, 2, 4]], [.17, [0, 1.6, .8], [0, 1.85, 9]],
  [.21, [0, 1.6, 5.2], [0, 1.5, 9]], [.26, [0, 1.55, 6.9], [0, 1.35, 9]],
  [.3, [1.2, 1.6, 4.6], [3.2, 1.45, 4.6]], [.34, [1.21, 1.6, 4.5], [3.2, 1.45, 4.4]],
  [.38, [-1.2, 1.6, 4.1], [-3.2, 1.45, 4]], [.42, [-1.21, 1.6, 4], [-3.2, 1.45, 3.9]],
  [.45, [-1.6, 1.6, 7.2], [-5, 1.6, 7.4]], [.48, [-3.6, 1.6, 7.4], [-12, 1.5, 7.4]],
  // living room: local (x, y, z) -> world (-3.2 - z, y, 7.4 + x)
  [.52, 'L', [0, 1.6, 1.6], [0, 1.3, 8]], [.57, 'L', [0, 1.6, 4.2], [0, 1.2, 8]],
  [.61, 'L', [1.5, 1.6, 4.1], [3.4, 1.45, 4.1]], [.65, 'L', [1.51, 1.6, 3.95], [3.4, 1.45, 3.9]],
  [.68, 'L', [-1.45, 1.6, 3.7], [-3.4, 1.45, 3.7]], [.72, 'L', [-1.46, 1.6, 3.55], [-3.4, 1.45, 3.55]],
  [.76, 'L', [1.6, 1.6, 6.3], [5, 1.6, 6.6]], [.79, 'L', [3.7, 1.6, 6.6], [9, 1.5, 6.6]],
  // bedroom: local (x, y, z) -> world (-9.8 + x, y, 10.9 + z)
  [.82, 'B', [0, 1.6, 1.2], [0, 1.2, 7]], [.86, 'B', [0, 1.55, 2.6], [0, 1.2, 7]],
  [.89, 'B', [1.2, 1.5, 3.2], [3.3, .95, 3.2]], [.91, 'B', [1.21, 1.5, 3.1], [3.3, .95, 3.1]],
  [.935, 'B', [-1.3, 1.55, 3.3], [-3.3, 1.5, 3.3]], [.955, 'B', [-1.31, 1.55, 3.2], [-3.3, 1.5, 3.2]],
  [.98, 'B', [0, 1.7, 1.6], [0, 1.25, 7]], [1, 'B', [0, 1.75, 1.3], [0, 1.25, 7]]
];
const toWorld = { L: ([x, y, z]) => [-3.2 - z, y, 7.4 + x], B: ([x, y, z]) => [-9.8 + x, y, 10.9 + z] };
const ROOMS = { F: { o: [0, 0, 0], ry: 0 }, L: { o: [-3.2, 0, 7.4], ry: -Math.PI / 2 }, B: { o: [-9.8, 0, 10.9], ry: 0 } };

let S3 = null;
function build(skin) {
  ENV_MATS.length = 0; FLAMES.length = 0; const tx = textures();
  const K = skin; const light = new THREE.Color(`rgb(${K.light})`);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#120c09', 14, 40);
  const M = {}; const wallMat = (col) => mat({ color: col, map: tx.plaster, bumpMap: tx.bump, bumpScale: .25, roughness: .95 });
  const leafTex = new THREE.TextureLoader().load('assets/leaf.png'); M.leafTex = leafTex;
  const oak = mat({ map: tx.wood([3, 3]), roughnessMap: tx.rough, roughness: .75, color: '#B98E66' });
  const shelfM = mat({ map: tx.wood([2, .3]), roughness: .7, color: '#E6CFAE' });
  const darkWood = mat({ map: tx.wood([1, 2]), roughness: .6, color: '#6B4630' });
  const brass = mat({ color: '#B8A46A', metalness: 1, roughness: .32 });
  const stone = mat({ map: tileTex('#CDBDA4'), roughness: .8 }); stone.map.repeat.set(1.5, 1.5); stone.map.wrapS = stone.map.wrapT = THREE.RepeatWrapping;
  const ceilM = mat({ color: '#EDE6DA', map: tx.plaster, roughness: 1 });

  // outside: dusk sky, garden, facade and the big door
  scene.background = skyTex('#1F2440', '#B7826A', '#E9B88F');
  const out = new THREE.Group(); scene.add(out);
  const facadeCol = mixHex('#E4C9A6', K.wall[0], .15); const facade = wallMesh(30, 12, [{ x: 0, w: 2.6, h: 3.5 }], wallMat(facadeCol)); facade.rotation.y = Math.PI; out.add(facade);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), mat({ map: tileTex('#C7AE8C'), roughness: .9 })); ground.material.map.repeat.set(10, 5); ground.material.map.wrapS = ground.material.map.wrapT = THREE.RepeatWrapping; ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.001, -10); ground.receiveShadow = true; out.add(ground);
  const step = box(4, .16, 1.2, mat({ map: tileTex('#D2C3AA'), roughness: .85 }), .02); step.position.set(0, .08, -.7); out.add(step);
  const trim = archRing(2.6, 3.5, .5, .32, darkWood); trim.position.z = 0; out.add(trim);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40, 0, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.05, .6), toneMapped: false })); fan.position.set(0, 3.5, .02); out.add(fan);
  for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; const sp = box(.04, 1.3, .06, darkWood, 0); sp.position.set(Math.cos(a) * .65, 3.5 + Math.sin(a) * .65, 0); sp.rotation.z = a - Math.PI / 2; out.add(sp); }
  const transom = box(2.6, .1, .12, darkWood, .01); transom.position.set(0, 3.45, 0); out.add(transom);
  const leaves = [];
  [-1, 1].forEach((sd) => {
    const pivot = new THREE.Group(); pivot.position.set(sd * 1.3, 0, 0); out.add(pivot);
    const leaf = box(1.28, 3.4, .1, mat({ map: tx.wood([1, 3]), roughness: .55, color: '#7A4E30' }), .015); leaf.position.set(-sd * .64, 1.7, 0); pivot.add(leaf);
    [[.85, 1.1, 2.55], [.85, 1.25, .95]].forEach(([w, h, y]) => { const pn = box(w * .85, h, .04, darkWood, .02); pn.position.set(-sd * .64, y, -.06); pivot.add(pn); const pi = box(w * .62, h * .78, .03, mat({ map: tx.wood([1, 2]), roughness: .5, color: '#87593A' }), .02); pi.position.set(-sd * .64, y, -.085); pivot.add(pi); });
    const med = new THREE.Mesh(new THREE.TorusGeometry(.11, .02, 12, 32), brass); med.position.set(-sd * .64, 1.75, -.1); pivot.add(med);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.07, .012, 10, 28), brass); ring.position.set(-sd * 1.08, 1.45, -.09); pivot.add(ring);
    leaves.push({ pivot, sd });
  });
  [-1, 1].forEach((sd) => {
    const lan = new THREE.Group(); lan.position.set(sd * 2.4, 2.6, -.18); out.add(lan);
    const frame = box(.24, .42, .24, mat({ color: '#2B211B', metalness: .6, roughness: .5 }), .01); lan.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(.2, .34, .26), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, .85, .45), toneMapped: false })); lan.add(glass);
    const pl = new THREE.PointLight(light, 1.6, 6, 2); pl.position.set(0, 0, -.3); lan.add(pl);
    const pt = plant(M); pt.position.set(sd * 3.3, .16, -1.2); pt.scale.setScalar(1.25); out.add(pt);
  });
  const hemi = new THREE.HemisphereLight('#8f9fc4', '#3a2a20', .5); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#c9d4ff', .6); moon.position.set(-6, 10, -12); scene.add(moon);

  // a room-local group
  const roomGroup = (key) => { const r = ROOMS[key]; const g = new THREE.Group(); g.position.set(...r.o); g.rotation.y = r.ry; scene.add(g); return g; };

  // ---- Foyer: ivory lime plaster, oak floor, a deep arched niche of candles
  const F = roomGroup('F'); const fWall = mixHex('#EFE6D8', K.wall[0], .08);
  F.add(buildRoom({ W: 6.4, D: 9, H: 5, entry: { w: 2.6, h: 3.5 }, farHoles: [{ x: 0, y: .9, w: 2, h: 1.7 }], rightHoles: [{ z: 7.4, w: 2, h: 2.6 }] }, { wall: wallMat(fWall), wallCol: fWall, floor: oak, ceil: ceilM }));
  const nicheM = mat({ color: mixHex(fWall, '#8a6a50', .18), map: tx.plaster, roughness: .95 });
  const nb = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), nicheM); nb.rotation.y = Math.PI; nb.position.set(0, 2.3, 9.5); F.add(nb);
  [-1, 1].forEach((sd) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(.5, 2.7), nicheM); s.rotation.y = sd * Math.PI / 2 * -1; s.position.set(sd * 1, 2.25, 9.25); F.add(s); });
  const nTop = archRing(2, 1.7, .5, .001, nicheM); nTop.position.set(0, .9, 9.25); F.add(nTop);
  const nBase = box(2.2, .06, .62, mat({ map: tileTex('#E2D6C2'), roughness: .7 }), .01); nBase.position.set(0, .9, 9.2); F.add(nBase);
  const nShelf = box(1.96, .045, .46, shelfM, .008); nShelf.position.set(0, 1.62, 9.27); F.add(nShelf);
  const foyerTrim = archRing(2, 2.6, .24, .14, mat({ color: mixHex(fWall, '#ffffff', .2), map: tx.plaster, roughness: .9 })); foyerTrim.rotation.y = Math.PI / 2; foyerTrim.position.set(-3.2, 0, 7.4); F.add(foyerTrim);
  const entryTrim = archRing(2.6, 3.5, .3, .12, mat({ color: fWall, map: tx.plaster, roughness: .9 })); entryTrim.position.set(0, 0, .15); F.add(entryTrim);
  [[3.08, 1], [-3.08, -1]].forEach(([x, sd]) => [1.15, 1.75].forEach((y) => { const s = shelf(2.6, shelfM); s.rotation.y = Math.PI / 2; s.position.set(x - sd * .01, y, sd > 0 ? 4.4 : 4); F.add(s); }));
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5.2), mat({ map: tx.rug, roughness: 1 })); runner.rotation.x = -Math.PI / 2; runner.position.set(0, .004, 4.2); runner.receiveShadow = true; F.add(runner);
  const pf = plant(M); pf.position.set(2.5, 0, 8.4); F.add(pf);
  const bench = box(1.4, .08, .42, oak, .02); bench.position.set(-2.2, .46, 1.6); bench.rotation.y = Math.PI / 2; F.add(bench); [-.6, .6].forEach((z) => { const l = box(.06, .42, .36, darkWood, .01); l.position.set(-2.2, .21, 1.6 + z); F.add(l); });
  const chand = new THREE.Group(); chand.position.set(0, 3.9, 4.5); F.add(chand); const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .018, 10, 48), brass); ring.rotation.x = Math.PI / 2; chand.add(ring); const rod = box(.02, 1.1, .02, brass, 0); rod.position.y = .55; chand.add(rod);

  // ---- Living room: terracotta wash, stone floor, sofa, two tall windows with sheer curtains
  const Lr = roomGroup('L'); const lWall = mixHex('#C98A6B', K.wall[0], .35);
  Lr.add(buildRoom({ W: 7, D: 8, H: 4.2, entry: { w: 2, h: 2.6 }, farHoles: [{ x: -2.3, y: .6, w: 1.2, h: 2.2 }, { x: 2.3, y: .6, w: 1.2, h: 2.2 }], leftHoles: [{ z: 6.6, w: 1.8, h: 2.4 }] }, { wall: wallMat(lWall), wallCol: lWall, floor: stone, ceil: ceilM }));
  [-2.3, 2.3].forEach((x) => { const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.4), new THREE.MeshBasicMaterial({ map: skyTex('#2A2F52', '#8C6A72', '#C99A84') })); sky.rotation.y = Math.PI; sky.position.set(x, 2, 8.3); Lr.add(sky); const wt = archRing(1.2, 2.2, .3, .06, mat({ color: '#EDE3D3', roughness: .7 })); wt.rotation.y = Math.PI; wt.position.set(x, .6, 8); Lr.add(wt); const mul = box(.04, 2.6, .05, mat({ color: '#EDE3D3' }), 0); mul.position.set(x, 1.9, 8.05); Lr.add(mul); });
  const curtains = [];
  [-3.05, -1.55, 1.55, 3.05].forEach((x) => { const c = curtain(.9, 3.5, '#F6EFE4'); c.position.set(x, 3.95, 7.75); c.rotation.y = Math.PI; Lr.add(c); curtains.push(c); });
  const rodL = box(6.8, .03, .03, brass, 0); rodL.position.set(0, 3.95, 7.75); Lr.add(rodL);
  const cred = box(2.4, .72, .46, darkWood, .02); cred.position.set(0, .36, 7.65); Lr.add(cred); [-.6, 0, .6].forEach((x) => { const d = box(.7, .55, .01, mat({ map: tx.wood([1, 1]), color: '#5a3a26', roughness: .5 }), .005); d.position.set(x, .36, 7.415); Lr.add(d); });
  const art = box(1.4, 1, .04, mat({ map: canvasTex(256, 192, (x, w, h) => { x.fillStyle = '#E9DCC6'; x.fillRect(0, 0, w, h); x.fillStyle = '#A55B3F'; x.beginPath(); x.arc(w * .4, h * .62, 54, Math.PI, 0); x.fill(); x.fillStyle = '#6B7B5B'; x.fillRect(w * .55, h * .3, 60, 90); x.fillStyle = '#C08A5B'; x.beginPath(); x.arc(w * .7, h * .3, 22, 0, Math.PI * 2); x.fill(); }), roughness: .9 }), .01); art.position.set(0, 2, 7.96); art.rotation.y = Math.PI; Lr.add(art);
  const sofaM = mat({ map: weaveTex('#D9CBB4', [4, 4]), roughness: 1 });
  const sofa = new THREE.Group(); sofa.position.set(-2.05, 0, 4.4); sofa.rotation.y = Math.PI / 2; Lr.add(sofa); const sb = box(2.4, .42, .9, sofaM, .08); sb.position.y = .3; const sback = box(2.4, .5, .22, sofaM, .08); sback.position.set(0, .7, -.36); sofa.add(sb, sback); [-1.25, 1.25].forEach((x) => { const a = box(.2, .55, .9, sofaM, .08); a.position.set(x, .4, 0); sofa.add(a); }); [-.6, .6].forEach((x, i) => { const c = box(.5, .42, .14, mat({ map: weaveTex(i ? '#A55B3F' : '#6B7B5B', [2, 2]), roughness: 1 }), .06); c.position.set(x, .72, -.2); c.rotation.x = -.15; sofa.add(c); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), mat({ map: tx.rug, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.rotation.z = Math.PI / 2; rug.position.set(-.9, .004, 4.4); rug.receiveShadow = true; Lr.add(rug);
  const ct = box(.6, .06, 1.2, oak, .02); ct.position.set(-.85, .4, 4.4); Lr.add(ct); [[-.22, -.5], [.22, -.5], [-.22, .5], [.22, .5]].forEach(([x, z]) => { const l = box(.05, .37, .05, darkWood, .01); l.position.set(-.85 + x, .185, 4.4 + z); Lr.add(l); });
  [[3.38, 1], [-3.38, -1]].forEach(([x, sd]) => [1.15, 1.75].forEach((y) => { const s = shelf(2.4, shelfM); s.rotation.y = Math.PI / 2; s.position.set(x, y, sd > 0 ? 4 : 3.6); Lr.add(s); }));
  const lTrim = archRing(1.8, 2.4, .24, .12, mat({ color: mixHex(lWall, '#ffffff', .25), map: tx.plaster, roughness: .9 })); lTrim.rotation.y = Math.PI / 2; lTrim.position.set(3.5, 0, 6.6); Lr.add(lTrim);
  const pl2 = plant(M); pl2.position.set(-2.9, 0, 6.6); Lr.add(pl2);

  // ---- Bedroom: deep sage, oak floor, bed, a ledge of candles, window with curtains, a gifting table
  const B = roomGroup('B'); const bWall = mixHex('#8E977C', K.wall[0], .22);
  B.add(buildRoom({ W: 6.6, D: 7, H: 3.6, entry: { w: 1.8, h: 2.4 }, leftHoles: [{ z: 5.3, y: .7, w: 1.3, h: 1.9 }] }, { wall: wallMat(bWall), wallCol: bWall, floor: oak, ceil: ceilM }));
  const bsky = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshBasicMaterial({ map: skyTex('#1E2240', '#6E5A70', '#B98C7E') })); bsky.rotation.y = -Math.PI / 2; bsky.position.set(3.6, 1.8, 5.3); B.add(bsky);
  const bwt = archRing(1.3, 1.9, .3, .06, mat({ color: '#EDE3D3', roughness: .7 })); bwt.rotation.y = -Math.PI / 2; bwt.position.set(3.3, .7, 5.3); B.add(bwt);
  [4.5, 6.1].forEach((z) => { const c = curtain(.85, 3.2, '#F7F1E7'); c.position.set(3.15, 3.45, z); c.rotation.y = -Math.PI / 2; B.add(c); curtains.push(c); });
  const linen = mat({ map: weaveTex('#EFE7DA', [3, 3]), roughness: 1 });
  const bed = new THREE.Group(); bed.position.set(0, 0, 5.75); B.add(bed); const base = box(1.9, .36, 2.1, mat({ map: tx.wood([1, 1]), color: '#7a5236', roughness: .6 }), .03); base.position.y = .18; const mattress = box(1.86, .24, 2.04, linen, .08); mattress.position.y = .48; const throwB = box(1.92, .06, .8, mat({ map: weaveTex('#A55B3F', [3, 3]), roughness: 1 }), .03); throwB.position.set(0, .62, -.55); bed.add(base, mattress, throwB);
  const head = box(2.1, 1.2, .1, mat({ map: weaveTex('#C9B79C', [3, 3]), roughness: 1 }), .05); head.position.set(0, .95, 1.15); bed.add(head);
  [-.45, .45].forEach((x) => { const pw = box(.62, .2, .38, linen, .09); pw.position.set(x, .72, .8); pw.rotation.x = -.35; bed.add(pw); });
  [-1.4, 1.4].forEach((x) => { const st = box(.5, .55, .42, mat({ map: tx.wood([1, 1]), color: '#8a6040', roughness: .6 }), .02); st.position.set(x, .275, 6.6); B.add(st); });
  const ledge = box(2.6, .05, .22, shelfM, .008); ledge.position.set(0, 1.75, 6.88); B.add(ledge);
  const gt = box(1.1, .05, .5, oak, .02); gt.position.set(2.95, .74, 3.2); B.add(gt); [[-.48, -.2], [.48, -.2], [-.48, .2], [.48, .2]].forEach(([z, x]) => { const l = box(.05, .72, .05, darkWood, .01); l.position.set(2.95 + x, .36, 3.2 + z); B.add(l); });
  [1.25, 1.8].forEach((y) => { const s = shelf(2, shelfM); s.rotation.y = Math.PI / 2; s.position.set(-3.17, y, 3.3); B.add(s); });

  // ---- products, placed from TOUR_ITEMS (shared with the page so labels line up)
  const groups = { F, L: Lr, B }; const SC = 1.3;
  const contactM = new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.5, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false });
  const list = window.TOUR_ITEMS || [];
  T.items = list.map((o) => {
    const p = window.BT_BYID && o.id ? window.BT_BYID[o.id] : null; const mk = MAKERS[o.k]; if (!mk || !groups[o.room]) return null; // opening D's bedroom pieces live elsewhere
    const obj = mk({ ...o, name: p ? p.name : '' }); obj.position.set(...o.pos); obj.rotation.y = o.ry || 0; obj.scale.setScalar(SC); groups[o.room].add(obj);
    const r = { jar: .09, pillar: .07, tray: .24, plate: .17, dish: .12, arch: .12, pebbles: .09, archtray: .14, box: .2 }[o.k] || .1;
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6), contactM); cs.rotation.x = -Math.PI / 2; cs.position.y = .002; obj.add(cs);
    obj.userData.base = obj.position.clone(); return { o, obj };
  });

  // ---- lights per room: candle glow (flickers), shelf glow left and right, a soft room fill
  const mkL = (g, pos, col, dist) => { const l = new THREE.PointLight(col, 0, dist, 2); l.position.set(...pos); g.add(l); return l; };
  const L = {
    F: { candle: mkL(F, [0, 1.75, 8.7], light, 9), left: mkL(F, [2.4, 2.3, 4.4], light, 4.5), right: mkL(F, [-2.4, 2.3, 4], light, 4.5), fill: mkL(F, [0, 3.6, 4.5], light, 12) },
    L: { candle: mkL(Lr, [0, 1.3, 7], light, 8), left: mkL(Lr, [2.6, 2.2, 4], light, 4.5), right: mkL(Lr, [-2.6, 2.2, 3.6], light, 4.5), fill: mkL(Lr, [0, 3.4, 4], light, 11) },
    B: { candle: mkL(B, [0, 2.1, 6.3], light, 7), left: mkL(B, [2.2, 1.9, 3.2], light, 4.5), right: mkL(B, [-2.3, 2.2, 3.3], light, 4.5), fill: mkL(B, [0, 3, 3.5], light, 10) }
  };
  const shadow = new THREE.PointLight(light, 0, 9, 2); shadow.castShadow = true; shadow.shadow.mapSize.set(512, 512); shadow.shadow.bias = -.004; shadow.shadow.radius = 6; scene.add(shadow);
  const pmrem = new THREE.PMREMGenerator(T.renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(T.renderer), .04).texture;

  // camera path through all keyframes
  const kp = PATH.map((k) => typeof k[1] === 'string' ? [k[0], toWorld[k[1]](k[2]), toWorld[k[1]](k[3])] : k);
  const pos = new THREE.CatmullRomCurve3(kp.map((k) => V(...k[1])), false, 'catmullrom', .35);
  const look = new THREE.CatmullRomCurve3(kp.map((k) => V(...k[2])), false, 'catmullrom', .35);
  return { scene, leaves, curtains, L, shadow, hemi, moon, fan, kp, pos, look, out };
}

function pathAt(s, p) {
  const k = s.kp; let i = 0; while (i < k.length - 2 && p > k[i + 1][0]) i++;
  const u = (i + clamp((p - k[i][0]) / (k[i + 1][0] - k[i][0]))) / (k.length - 1);
  return { pos: s.pos.getPoint(u), look: s.look.getPoint(u) };
}

const ROOM_T = { F: { light: [.19, .26], left: [.29, .34], right: [.37, .41], dark: false, span: [.12, .49] }, L: { light: [.52, .57], left: [.6, .65], right: [.67, .72], dark: true, span: [.47, .8] }, B: { light: [.81, .86], left: [.88, .91], right: [.925, .955], dark: true, span: [.78, 1.01] } };

T.mount = function (stage) {
  if (T.failed) return false;
  if (T.canvas) { if (!stage.contains(T.canvas)) stage.insertBefore(T.canvas, stage.firstChild); return true; }
  try {
    const cv = document.createElement('canvas'); cv.id = 'lc-gl'; cv.setAttribute('aria-hidden', 'true'); stage.insertBefore(cv, stage.firstChild);
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .85; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
    T.renderer = r; T.canvas = cv; T.camera = new THREE.PerspectiveCamera(46, 1, .05, 80); T.skinKey = null; return true;
  } catch (e) { T.failed = true; return false; }
};
T.resize = function (W, H, dpr) {
  if (!T.renderer) return; T.W = W; T.H = H; T.renderer.setPixelRatio(Math.min(dpr, W < 760 ? 1.25 : 1.5)); T.renderer.setSize(W, H, false);
  T.camera.aspect = W / H; T.camera.fov = W < 760 ? 60 : 46; T.camera.updateProjectionMatrix();
  if (T.composer) { T.composer.setSize(W, H); T.composer.setPixelRatio(T.renderer.getPixelRatio()); }
};
T.unmount = function () { if (T.canvas) T.canvas.remove(); };
function ensure(skin, key) {
  if (S3 && T.skinKey === key) return S3;
  if (S3) S3.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  S3 = build(skin); T.skinKey = key;
  const comp = new EffectComposer(T.renderer); comp.addPass(new RenderPass(S3.scene, T.camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(T.W || 800, T.H || 600), .4, .45, .96); comp.addPass(bloom); comp.addPass(new OutputPass());
  T.composer = comp; T.composer.setSize(T.W || 800, T.H || 600); T.composer.setPixelRatio(T.renderer.getPixelRatio()); return S3;
}

const tmp = V(0, 0, 0), dir = V(0, 0, 0);
T.render = function (p, t, skin, key) {
  if (!T.renderer || !T.W) return [];
  const s = ensure(skin, key); const cam = T.camera;
  const { pos, look } = pathAt(s, p); cam.position.copy(pos);
  // phones are narrow: step back a little along the line of sight so the shelves still fit
  if (T.W < 760) { const back = pos.clone().sub(look); back.y = 0; back.normalize().multiplyScalar(.85 * seg(p, .15, .2)); cam.position.add(back); }
  cam.position.y += Math.sin(t * .9) * .006; cam.lookAt(look);
  // front door: both leaves swing inward
  const open = ease(seg(p, .045, .13)); s.leaves.forEach(({ pivot, sd }) => { pivot.rotation.y = sd * open * 1.75; });
  const outside = 1 - seg(p, .13, .19);
  s.hemi.intensity = .12 + .38 * outside; s.hemi.color.set(outside > .5 ? '#8f9fc4' : '#ffd2a6'); s.hemi.groundColor.set(outside > .5 ? '#3a2a20' : '#4a2e1e'); s.moon.intensity = .35 * outside; s.fan.material.color.setRGB(1.6 * (.3 + .7 * outside), 1.05 * (.3 + .7 * outside), .6 * (.3 + .7 * outside));
  // rooms
  let wind = Math.min(1, Math.abs(p - (T.lastP ?? p)) * 600); T.lastP = p; T.wind = (T.wind || 0) * .92 + wind * .08;
  let env = .02 + .22 * outside;
  for (const k of ['F', 'L', 'B']) {
    const R = ROOM_T[k], Lk = s.L[k]; const lit = seg(p, R.light[0], R.light[1]);
    const near = seg(p, R.span[0] - .02, R.span[0] + .02) * (1 - seg(p, R.span[1] - .01, R.span[1] + .03));
    const fl = .88 + .12 * Math.sin(t * 9.1 + k.length) * Math.sin(t * 5.3 + 1);
    const base = R.dark ? 0 : .25;
    Lk.candle.intensity = (lit * 3.2 * fl) * near; Lk.fill.intensity = (base + lit * 2.2) * near;
    Lk.left.intensity = seg(p, R.left[0] - .01, R.left[0] + .02) * 2.2 * near; Lk.right.intensity = seg(p, R.right[0] - .01, R.right[0] + .02) * 2.2 * near;
    if (near > .5) { env = Math.max(env, (R.dark ? .008 : .03) + lit * .06); const wp = Lk.candle.getWorldPosition(tmp); s.shadow.position.copy(wp); s.shadow.intensity = lit * 1.6 * fl; }
  }
  ENV_MATS.forEach((m) => { m.envMapIntensity = env; });
  // products: candles light one by one, shelf pieces are placed (they drop in and settle)
  const lists = {};
  T.items.forEach((it) => { if (!it) return; const k = it.o.room; (lists[k] = lists[k] || []).push(it); });
  T.items.forEach((it) => {
    if (!it) return; const { o, obj } = it; const at = o.at;
    const f = obj.userData.flame; const candle = !!f;
    if (candle) { const on = seg(p, at - .006, at); f.visible = on > 0; if (on > 0) { const fl = 1 + .12 * Math.sin(t * 13 + at * 90) + .06 * Math.sin(t * 7 + at * 40); f.scale.set(on, on * fl, on); f.rotation.z = .05 * Math.sin(t * 3 + at * 50); } if (obj.userData.wax && obj.userData.wax.emissiveIntensity !== undefined) obj.userData.wax.emissiveIntensity = on * .08; }
    if (o.place) { const k = ease(seg(p, at - .02, at)); obj.visible = k > 0; obj.position.y = obj.userData.base.y + (1 - k) * .35; obj.scale.setScalar(1.3 * (.7 + .3 * k)); }
  });
  // curtains breathe, more when you scroll quickly
  const amp = .05 + T.wind * .25;
  s.curtains.forEach((c, ci) => { const a = c.geometry.attributes.position; const b = c.userData.base; for (let i = 0; i < a.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const d = -y / c.userData.h; a.setZ(i, amp * d * Math.sin(t * 1.3 + x * 3 + ci) + .03 * Math.sin(x * 14 + ci)); a.setX(i, x + amp * .4 * d * Math.sin(t * .9 + ci + y)); } a.needsUpdate = true; c.geometry.computeVertexNormals(); });
  T.composer.render();
  // label positions
  cam.getWorldDirection(dir);
  return T.items.map((it) => {
    if (!it || !it.o.label) return { x: 0, y: 0, a: 0 }; const { o, obj } = it; const R = ROOM_T[o.room];
    obj.getWorldPosition(tmp); tmp.y += (o.top || .2); const toItem = tmp.clone().sub(cam.position); const dist = toItem.length(); if (toItem.normalize().dot(dir) < .55 || dist > 4.2) return { x: 0, y: 0, a: 0 };
    const v = tmp.clone().project(cam); const x = (v.x + 1) / 2 * T.W, y = (1 - v.y) / 2 * T.H;
    const vis = x > 50 && x < T.W - 50 && y > 70 && y < T.H - 50 ? 1 : 0; const inRoom = p >= R.span[0] && p <= R.span[1] - .02 ? 1 : 0;
    return { x, y, a: seg(p, o.at, o.at + .008) * vis * inRoom };
  });
};
onLeaf(() => { T.skinKey = null; });
T.ready = true;
window.dispatchEvent(new Event('tour3-ready'));
