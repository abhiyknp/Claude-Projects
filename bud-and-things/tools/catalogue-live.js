#!/usr/bin/env node
// Rebuilds the product list on the catalogue page from the live database, so the catalogue always has everything on the website
// (in stock and sold out) plus pieces marked "Upcoming (catalogue only)" in Owner view.
// The sheet snapshot (catalogue/products.json) is the back-up: pieces only it knows stay listed, and if the database cannot be
// reached the page is left exactly as it is.
//   node tools/catalogue-live.js <catalogue folder to change, default bud-and-things/catalogue>
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DRAFT_SKU = /^BT-(CN|JS|GB)-/, LIVE_SKU = /^BNT-PRD-/;
const GROUPS = [['candles', 'Candles'], ['jesmonite', 'Jesmonite trays & dishes'], ['gifts', 'Gift boxes'], ['diy', 'DIY kits'], ['more', 'More from the studio']];
const TAB_GROUP = { 'Glass Candles': 'candles', 'Moulded Candles': 'candles', 'Tealight Candles': 'candles', 'Jesmonite Tray': 'jesmonite', 'DIY Items': 'diy' };
const ROLE_ORDER = ['packshot', 'lifestyle', 'detail', 'hand', 'lit'];
const skusOf = (r) => ((r.data && r.data.variants) || []).map((v) => (v && v.sku) || '');

function photoUrl(p, base) {
  if (/^https?:\/\/res\.cloudinary\.com\//.test(p)) return /\/upload\/(f_|q_|w_)/.test(p) ? p : p.replace('/upload/', '/upload/f_auto,q_auto,w_720/');
  if (/^https?:/.test(p)) return p;
  return base + '/storage/v1/object/public/media/' + p.split('/').map(encodeURIComponent).join('/');
}

// rows: {products, stock, media}; snap: catalogue/products.json; returns the list the page shows
function merge(rows, snap, base) {
  let prods = (rows.products || []).filter((r) => r.live !== false && !skusOf(r).some((k) => DRAFT_SKU.test(k)));
  if (prods.some((r) => skusOf(r).some((k) => LIVE_SKU.test(k)))) prods = prods.filter((r) => skusOf(r).some((k) => LIVE_SKU.test(k)));
  const qty = {}; (rows.stock || []).forEach((s) => { qty[s.sku] = s.qty; });
  const snapBySku = {}; (snap.products || []).forEach((s) => { snapBySku[s.id] = s; });
  const used = new Set(), out = [];
  prods.sort((a, b) => (a.sort || 0) - (b.sort || 0)).forEach((r) => {
    const d = r.data || {}, vs = (d.variants || []).filter((v) => v && v.sku);
    const price = vs.length ? Math.min(...vs.map((v) => +v.price || 0).filter((x) => x > 0)) : 0;
    const photos = (rows.media || []).filter((m) => m.product_id === r.id && m.kind === 'photo' && m.published !== false && m.role !== 'cutout')
      .sort((a, b) => (ROLE_ORDER.indexOf(a.role) + 1 || 9) - (ROLE_ORDER.indexOf(b.role) + 1 || 9) || (a.sort || 0) - (b.sort || 0));
    const snapHit = vs.map((v) => snapBySku[v.sku]).find(Boolean); if (snapHit) used.add(snapHit.id);
    const status = d.upcoming ? 'upcoming' : vs.some((v) => (qty[v.sku] || 0) > 0) ? 'in' : 'out';
    const details = []; if (d.size) details.push('Size: ' + d.size); if (d.material) details.push('Material: ' + d.material);
    if (d.notes && d.notes.length) details.push('Scent: ' + d.notes.join(', ')); if (d.colour) details.push('Colour: ' + d.colour);
    out.push({ name: d.name || r.id, line: d.line || '', details, price: isFinite(price) ? price : 0, status, group: GROUPS.some((g) => g[0] === d.cat) ? d.cat : 'more',
      img: photos[0] ? photoUrl(photos[0].path, base) : snapHit && snapHit.img ? 'img/' + snapHit.img : '' });
  });
  (snap.products || []).filter((s) => !used.has(s.id)).forEach((s) => {
    out.push({ name: s.name, price: s.price, status: 'in', group: TAB_GROUP[s.sheetTab] || 'more', img: s.img ? 'img/' + s.img : '' });
  });
  return out;
}

function renderMain(list) {
  return '<main>' + GROUPS.map(([k, title]) => {
    const ps = list.filter((p) => p.group === k); if (!ps.length) return '';
    return `<section><h2>${esc(title)}</h2><ul class="grid">${ps.map((p) => {
      // the catalogue never says "Sold out": that belongs to the shop. A sold-out piece looks like any other piece here.
      const badge = p.status === 'upcoming' ? '<span class="badge soon">Coming soon</span>' : '';
      const note = p.status === 'upcoming' ? '<p class="note">Not on the shop yet.</p>' : '';
      const img = p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" width="360" height="360">` : '<div class="noimg" role="img" aria-label="Photo coming"></div>';
      return `<li class="card${p.status === 'upcoming' ? ' upcoming' : ''}">${badge}${img}<h3>${esc(p.name)}</h3>${p.line ? `<p class="line">${esc(p.line)}</p>` : ''}${p.details && p.details.length ? `<p class="spec">${p.details.map(esc).join(' · ')}</p>` : ''}${p.price > 0 ? `<p class="price">₹${p.price.toLocaleString('en-IN')}</p>` : ''}${note}</li>`;
    }).join('')}</ul></section>`;
  }).join('') + '</main>';
}

const CSS = '.card{position:relative}.badge{position:absolute;left:10px;top:10px;z-index:1;padding:4px 10px;background:var(--ink);color:var(--cream);font:600 12px Montserrat,system-ui,sans-serif;letter-spacing:.06em}.badge.soon{background:var(--gold);color:var(--ink)}.card.out img{filter:grayscale(1);opacity:.5}.noimg{aspect-ratio:1;background:#efe3cf}.line{margin:4px 8px 0;font-size:14px}.spec{margin:2px 8px 0;font-size:13px;color:#555}.note{margin:4px 8px 0;font-size:14px;color:var(--maroon-d)}';

function apply(html, list) {
  const m = html.replace(/<main>[\s\S]*<\/main>/, renderMain(list));
  return m.includes('.badge{') ? m : m.replace('</style>', CSS + '</style>');
}

async function get(base, key, table, q) {
  const r = await fetch(base + '/rest/v1/' + table + '?' + q, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!r.ok) throw new Error(table + ' ' + r.status);
  return r.json();
}

async function main() {
  const dir = path.resolve(process.argv[2] || path.join(ROOT, 'catalogue'));
  const cfg = fs.readFileSync(path.join(ROOT, 'prototype/config.js'), 'utf8');
  const base = (cfg.match(/url:\s*'(https:[^']+)'/) || [])[1], key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
  if (!base || !key) { console.log('catalogue-live: no database in config.js, page left as it is'); return; }
  try {
    const [products, stock, media] = await Promise.all([get(base, key, 'products', 'select=id,data,sort,live&order=sort.asc'), get(base, key, 'stock', 'select=sku,qty'), get(base, key, 'media', 'select=product_id,kind,role,path,sort,published&published=eq.true')]);
    const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalogue/products.json'), 'utf8'));
    const list = merge({ products, stock, media }, snap, base);
    if (!list.length) throw new Error('nothing to show');
    const f = path.join(dir, 'index.html');
    fs.writeFileSync(f, apply(fs.readFileSync(f, 'utf8'), list));
    const c = (s) => list.filter((p) => p.status === s).length;
    console.log(`catalogue-live: ${list.length} pieces (${c('in')} in stock, ${c('out')} sold out, ${c('upcoming')} upcoming)`);
  } catch (e) { console.log('catalogue-live: database not reached (' + e.message + '), page left as it is'); }
}
if (require.main === module) main(); else module.exports = { merge, renderMain, apply };
