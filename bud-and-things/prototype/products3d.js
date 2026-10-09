// BUD & THINGS · shared 3D pieces: generated textures, materials and the product models (candles and Jesmonite),
// used by the Home Tour (tour3d.js) and the Gallery House (house3d.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x) => Math.max(0, Math.min(1, x));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

// ---------- generated textures ----------
function canvasTex(w, h, draw, repeat, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function blotches(x, w, h, n, r0, r1, cols, a) {
  for (let i = 0; i < n; i++) {
    const px = rnd() * w, py = rnd() * h, r = r0 + rnd() * (r1 - r0); const col = cols[i % cols.length];
    for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); x.fillStyle = g; x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2); }
  }
}
const plasterTex = () => canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, w, h); blotches(x, w, h, 180, 30, 140, ['rgba(255,255,255,A)', 'rgba(200,200,200,A)'], .07); blotches(x, w, h, 700, 2, 6, ['rgba(255,255,255,A)', 'rgba(185,185,185,A)'], .08); }, [.5, .5]);
const noiseBump = () => canvasTex(256, 256, (x, w, h) => { const d = x.createImageData(w, h); for (let i = 0; i < d.data.length; i += 4) { const v = 110 + rnd() * 40; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); }, [3, 3], false);
function terrazzoTex(base, chips) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); blotches(x, w, h, 40, 10, 50, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .05);
    for (let i = 0; i < 260; i++) { const r = 1 + rnd() * (i < 30 ? 7 : 2.5); x.fillStyle = chips[i % chips.length]; x.beginPath(); const cx = rnd() * w, cy = rnd() * h; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd(); x.lineTo(cx + Math.cos(a) * r * (.6 + rnd() * .5), cy + Math.sin(a) * r * (.6 + rnd() * .5)); } x.fill(); }
  }, [1, 1]);
}
const speckleTex = (base) => canvasTex(256, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); blotches(x, w, h, 30, 10, 40, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .06); for (let i = 0; i < 900; i++) { x.fillStyle = rnd() > .5 ? 'rgba(40,28,20,.55)' : 'rgba(255,250,240,.5)'; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5); } }, [2, 1]);
function tileTex(base) {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#8f8576'; x.fillRect(0, 0, w, h); const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = mixHex(base, rnd() > .5 ? '#ffffff' : '#7a6a58', rnd() * .18); x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
    blotches(x, w, h, 220, 6, 40, ['rgba(255,255,255,A)', 'rgba(90,70,50,A)'], .08);
  }, [1, 1]);
}
const weaveTex = (base, rep) => canvasTex(128, 128, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 2) { x.fillStyle = `rgba(0,0,0,${.04 + rnd() * .05})`; x.fillRect(0, i, w, 1); } for (let i = 0; i < w; i += 3) { x.fillStyle = `rgba(255,255,255,${.03 + rnd() * .04})`; x.fillRect(i, 0, 1, h); } }, rep);
function rugTex() {
  return canvasTex(512, 768, (x, w, h) => {
    x.fillStyle = '#E6D8C2'; x.fillRect(0, 0, w, h); x.strokeStyle = '#A55B3F'; x.lineWidth = 10; x.strokeRect(30, 30, w - 60, h - 60); x.strokeStyle = '#6B7B5B'; x.lineWidth = 4; x.strokeRect(54, 54, w - 108, h - 108);
    x.fillStyle = 'rgba(165,91,63,.5)'; for (let j = 0; j < 5; j++) { const cy = 140 + j * 122; x.beginPath(); x.moveTo(w / 2, cy - 44); x.lineTo(w / 2 + 70, cy); x.lineTo(w / 2, cy + 44); x.lineTo(w / 2 - 70, cy); x.closePath(); x.fill(); }
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '60,40,30'},.07)`; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
  });
}
function skyTex(top, mid, bot) { return canvasTex(16, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(.62, mid); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }
let LEAF_IMG = null;
function labelTex(name) {
  return canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = '#F4ECDF'; x.fillRect(0, 0, w, h);
    if (LEAF_IMG) { const c = document.createElement('canvas'); c.width = LEAF_IMG.width; c.height = LEAF_IMG.height; const k = c.getContext('2d'); k.drawImage(LEAF_IMG, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#3D281E'; k.fillRect(0, 0, c.width, c.height); const lh = 74, lw = lh * c.width / c.height; x.drawImage(c, w / 2 - lw / 2, 26, lw, lh); }
    x.fillStyle = '#3D281E'; x.textAlign = 'center'; x.font = '600 40px "Cormorant Garamond", Georgia, serif'; x.fillText('BUD & THINGS', w / 2, 150); x.font = '28px Lato, sans-serif'; x.fillStyle = '#6B5546'; x.fillText(name.toUpperCase(), w / 2, 205);
  });
}

// ---------- materials ----------
const ENV_MATS = [];
function mat(o) { const m = new THREE.MeshStandardMaterial(o); ENV_MATS.push(m); return m; }
function phys(o) { const m = new THREE.MeshPhysicalMaterial(o); ENV_MATS.push(m); return m; }
let TEX = null;
function textures() {
  if (TEX) return TEX; const L = new THREE.TextureLoader(); const wood = (rep) => { const t = L.load('assets/tex-oak.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; };
  const rough = L.load('assets/tex-oak-rough.jpg'); rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(2, 2);
  TEX = { wood, rough, plaster: plasterTex(), bump: noiseBump(), rug: rugTex() }; return TEX;
}

// ---------- shapes ----------
function archPath(path, x0, y0, w, hRect, hole) { const r = w / 2; path.moveTo(x0, y0); path.lineTo(x0 + w, y0); path.lineTo(x0 + w, y0 + hRect); path.absarc(x0 + r, y0 + hRect, r, 0, Math.PI, false); path.lineTo(x0, y0); return path; }
function wallMesh(w, h, holes, m) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  holes.forEach((o) => s.holes.push(archPath(new THREE.Path(), o.x - o.w / 2, o.y || 0, o.w, o.h, true)));
  const g = new THREE.ShapeGeometry(s, 24); const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; return mesh;
}
function archRing(w, hRect, depth, trim, m) {
  const s = archPath(new THREE.Shape(), -w / 2 - trim, 0, w + trim * 2, hRect, false); s.holes.push(archPath(new THREE.Path(), -w / 2, 0, w, hRect, true));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 32 }); g.translate(0, 0, -depth / 2); const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
function box(w, h, d, m, r = .01) { const mesh = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), m); mesh.castShadow = mesh.receiveShadow = true; return mesh; }
function lathe(pts, m, seg = 48) { const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m); mesh.castShadow = mesh.receiveShadow = true; return mesh; }

// ---------- products ----------
const FLAMES = [];
function flameMesh() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.15, .42), toneMapped: false, transparent: true, opacity: .9 }));
  outer.scale.set(.014, .038, .014); outer.position.y = .026;
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.4, 2.4), toneMapped: false }));
  core.scale.set(.005, .012, .005); core.position.y = .016;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .45, .12), transparent: true, opacity: .16, depthWrite: false, toneMapped: false }));
  halo.scale.set(.05, .07, .05); halo.position.y = .03;
  g.add(outer, core, halo); g.userData.parts = [outer, core, halo]; return g;
}
function candleTop(group, y, lit) {
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.0016, .0016, .016, 6), new THREE.MeshBasicMaterial({ color: '#1b120c' })); wick.position.y = y + .008; group.add(wick);
  const f = flameMesh(); f.position.y = y + .008; f.visible = false; group.add(f); FLAMES.push(f); group.userData.flame = f;
}
function jar(o) {
  const g = new THREE.Group(); const r = .062, h = .13;
  const body = lathe([[0, 0], [r - .006, 0], [r, .006], [r, h - .004], [r - .004, h], [r - .01, h], [r - .01, h - .014], [0, h - .014]], mat({ map: speckleTex(o.c), roughness: .82 }));
  g.add(body);
  const wax = new THREE.Mesh(new THREE.CircleGeometry(r - .01, 40), phys({ color: '#F1E6D2', roughness: .45, sheen: 1, sheenColor: new THREE.Color('#ffe6c4') })); wax.rotation.x = -Math.PI / 2; wax.position.y = h - .014; g.add(wax);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(r + .0008, r + .0008, .055, 40, 1, true, -.62, 1.24), mat({ map: labelTex(o.name || ''), roughness: .9 })); lab.position.y = h * .48; g.add(lab);
  candleTop(g, h - .014); g.userData.wax = wax.material; return g;
}
function pillar(o) {
  const g = new THREE.Group(); const r = .046, h = o.h || .2; const pts = [[0, 0]]; const n = 14;
  for (let i = 0; i <= 40; i++) { const y = h * i / 40; pts.push([r, y]); }
  const geo = new THREE.LatheGeometry(pts.concat([[r - .006, h + .004], [0, h - .004]]).map(([x, y]) => new THREE.Vector2(x, y)), 64);
  const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i); const a = Math.atan2(z, x); const rr = Math.hypot(x, z); if (rr > .01 && y > .003 && y < h - .002) { const k = 1 + .045 * Math.max(0, Math.cos(a * n)); pos.setX(i, x * k); pos.setZ(i, z * k); } }
  geo.computeVertexNormals();
  const wax = phys({ color: o.c, roughness: .55, sheen: .8, sheenColor: new THREE.Color('#fff2dc'), emissive: new THREE.Color('#ff9a4a'), emissiveIntensity: 0 });
  const m = new THREE.Mesh(geo, wax); m.castShadow = m.receiveShadow = true; g.add(m); candleTop(g, h - .002); g.userData.wax = wax; return g;
}
function ghatTray(o) { const g = new THREE.Group(); const m = mat({ map: terrazzoTex(o.c, ['#3D281E', '#F8F0E4', '#A55B3F', '#6B7B5B']), roughness: .55 }); [[.4, .22, 0], [.3, .16, .022], [.2, .1, .044]].forEach(([w, d, y]) => { const b = box(w, .024, d, m, .008); b.position.y = y + .012; g.add(b); }); return g; }
function plate(o) { const g = new THREE.Group(); const m = mat({ map: terrazzoTex(o.c, ['#3D281E', '#F8F0E4', '#C08A5B']), roughness: .5 }); g.add(lathe([[0, 0], [.13, 0], [.155, .012], [.165, .03], [.155, .032], [.13, .012], [0, .012]], m)); if (o.withPillar) { const p = pillar({ c: '#F1E8DA', h: .16 }); p.position.y = .012; g.add(p); g.userData.flame = p.userData.flame; g.userData.wax = p.userData.wax; } return g; }
function ringDish(o) {
  const g = new THREE.Group(); const m = mat({ map: terrazzoTex(o.c, ['#3D281E', '#F8F0E4', '#A55B3F']), roughness: .5 });
  const s = new THREE.Shape(); s.absarc(0, 0, .1, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(.04, .015, .085, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .022, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 4, curveSegments: 48 }); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; mesh.position.y = .006; g.add(mesh); return g;
}
function archForm(o) {
  const g = new THREE.Group(); const m = mat({ map: terrazzoTex(o.c, ['#3D281E', '#F8F0E4', '#C08A5B']), roughness: .55 });
  const s = archPath(new THREE.Shape(), -.09, 0, .18, .16, false); const hole = new THREE.Path(); hole.absarc(0, .15, .036, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 4, curveSegments: 48 }); geo.translate(0, 0, -.025);
  const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return g;
}
function pebbles(o) { const g = new THREE.Group(); const cols = [o.c, '#F1E8DA', '#C99A6C', '#B0644A']; cols.forEach((c, i) => { const m = mat({ map: terrazzoTex(c, ['#3D281E', '#F8F0E4']), roughness: .5 }); const p = new THREE.Mesh(new THREE.SphereGeometry(.07, 40, 16), m); p.scale.set(1, .16, .9 + i * .03); p.position.set((i % 2) * .008, .012 + i * .021, (i % 3) * .006); p.rotation.y = i * .7; p.castShadow = p.receiveShadow = true; g.add(p); }); return g; }
function catchAll(o) {
  const g = new THREE.Group(); const m = mat({ map: terrazzoTex(o.c, ['#3D281E', '#F8F0E4', '#A55B3F']), roughness: .55 });
  const s = archPath(new THREE.Shape(), -.1, 0, .2, .15, false); const inner = archPath(new THREE.Path(), -.065, .06, .13, .1, true); const back = new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelSize: .005, bevelThickness: .005, bevelSegments: 3, curveSegments: 40 });
  const bm = new THREE.Mesh(back, m); bm.position.z = -.06; bm.castShadow = bm.receiveShadow = true; g.add(bm);
  const insetS = archPath(new THREE.Shape(), -.065, .06, .13, .1, false); const inset = new THREE.Mesh(new THREE.ExtrudeGeometry(insetS, { depth: .006, bevelEnabled: false, curveSegments: 40 }), mat({ color: mixHex(o.c, '#3D281E', .25), roughness: .7 })); inset.position.z = -.026; g.add(inset); void inner;
  const tray = box(.22, .03, .12, m, .01); tray.position.set(0, .015, 0); g.add(tray); return g;
}
function giftBox(o) {
  const g = new THREE.Group(); const b = box(o.w, o.h, o.d, mat({ map: weaveTex(o.c, [1, 1]), roughness: .85 }), .006); b.position.y = o.h / 2; g.add(b);
  const tw = mat({ color: '#7C5A3A', roughness: .9 }); const t1 = box(o.w + .004, .006, .01, tw, 0); t1.position.y = o.h + .001; const t2 = box(.01, .006, o.d + .004, tw, 0); t2.position.y = o.h + .001; const s1 = box(o.w + .004, o.h, .008, tw, 0); s1.position.y = o.h / 2; const s2 = box(.008, o.h, o.d + .004, tw, 0); s2.position.y = o.h / 2; g.add(t1, t2, s1, s2);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(.022, .005, 8, 20), tw); bow.position.y = o.h + .02; bow.rotation.y = .6; g.add(bow); return g;
}
const MAKERS = { jar, pillar, tray: ghatTray, plate, dish: ringDish, arch: archForm, pebbles, archtray: catchAll, box: giftBox };

const leafImg = new Image(); const leafWaiters = [];
leafImg.onload = () => { LEAF_IMG = leafImg; leafWaiters.forEach((f) => f()); }; leafImg.src = 'assets/leaf.png';
// call back when the leaf logo is ready, so labels made before it loaded can be redrawn
export function onLeaf(f) { if (LEAF_IMG) f(); else leafWaiters.push(f); }
export { V, clamp, seg, ease, rnd, mixHex, canvasTex, blotches, plasterTex, noiseBump, terrazzoTex, speckleTex, tileTex, weaveTex, rugTex, skyTex, labelTex, ENV_MATS, mat, phys, textures, archPath, wallMesh, archRing, box, lathe, FLAMES, flameMesh, MAKERS };
