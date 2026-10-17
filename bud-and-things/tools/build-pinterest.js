// BUD & THINGS · pages and feeds for Pinterest, written into the published site by .github/workflows/pages.yml.
//   node bud-and-things/tools/build-pinterest.js _site
// Reads the live products, stock, photos and settings from Supabase with the public key in prototype/config.js
// (the same reads any visitor's browser makes) and writes:
//   p/<id>/index.html        one address per product, with its own title, description, picture, price and Product data,
//                            for Pinterest, Google and link previews. People who open it go straight to /#p-<id>.
//   pinterest/products.xml   RSS feed for Pinterest auto-publishing (Settings → Bulk create Pins → RSS feed)
//   pinterest/catalog.csv    data source for Pinterest Catalogs, one row per size or finish
// The two feeds list only live products that have a published photo, and stay empty while the Coming soon page is
// on, so nothing is pinned before launch or without a real picture. No packages: Node's built-in fetch only.
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://budandthings.com';
const BRAND = 'BUD & THINGS';
const out = path.resolve(process.argv[2] || '_site');
const ROLE_ORDER = ['packshot', 'lifestyle', 'lit', 'detail', 'hand', 'ritual'];

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const csv = (s) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const write = (rel, body) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };

function config() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'config.js'), 'utf8');
  const pick = (k) => ((new RegExp(k + ":\\s*'([^']*)'")).exec(src) || [])[1] || '';
  return { url: process.env.BT_SUPABASE_URL || pick('url').replace(/\/+$/, ''), key: process.env.BT_SUPABASE_KEY || pick('anonKey') };
}

async function load({ url, key }) {
  const get = async (q) => {
    const r = await fetch(url + '/rest/v1/' + q, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    if (!r.ok) throw new Error(q.split('?')[0] + ': HTTP ' + r.status);
    return r.json();
  };
  const [products, stock, media, settings] = await Promise.all([
    get('products?select=*&live=eq.true&order=sort'), get('stock?select=*'), get('media?select=*&published=eq.true&order=sort'), get('settings?select=*')]);
  return { products, stock, media, settings };
}

function prepare(d, fileUrl) {
  const qty = Object.fromEntries(d.stock.map((r) => [r.sku, r.qty]));
  const set = Object.fromEntries(d.settings.map((r) => [r.key, r.value]));
  const products = d.products.map((r) => {
    const p = Object.assign({ name: r.id, cat: 'candles', line: '', material: '', size: '', variants: [] }, r.data, { id: r.id });
    p.variants = (p.variants || []).filter((v) => v && v.sku && v.price > 0);
    p.photos = d.media.filter((m) => m.product_id === p.id && m.kind === 'photo' && ROLE_ORDER.includes(m.role))
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || (a.sort || 0) - (b.sort || 0))
      .map((m) => ({ url: fileUrl(m.path), alt: m.alt || '', variant: m.variant || '' }));
    p.link = `${SITE}/p/${encodeURIComponent(p.id)}/`;
    p.text = [p.line, p.notes && p.notes.length ? 'Notes: ' + p.notes.join(', ') + '.' : '', p.material].filter(Boolean).join(' ');
    p.type = p.type || (p.cat === 'candles' ? 'Scented candle' : 'Jesmonite object');
    p.updated = r.updated_at;
    return p;
  }).filter((p) => p.variants.length && /^[a-z0-9][a-z0-9-]*$/i.test(p.id)); // the id becomes a folder name
  return { products, qty, comingSoon: set.comingSoon !== false }; // the site treats a missing setting as on
}

function productPage(p, qty) {
  const prices = p.variants.map((v) => v.price);
  const inStock = p.variants.some((v) => (qty[v.sku] || 0) > 0);
  const img = p.photos[0] ? p.photos[0].url : SITE + '/assets/share.jpg';
  const title = `${p.name} · ${BRAND} by Ashi`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.text, url: p.link,
    image: p.photos.length ? p.photos.map((x) => x.url) : [img], brand: { '@type': 'Brand', name: BRAND }, category: p.type,
    offers: p.variants.map((v) => ({ '@type': 'Offer', sku: v.sku, name: `${p.name}, ${v.label}`, price: v.price, priceCurrency: 'INR', url: p.link,
      availability: 'https://schema.org/' + ((qty[v.sku] || 0) > 0 ? 'InStock' : 'OutOfStock') }))
  };
  const go = '/#p-' + encodeURIComponent(p.id);
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.text)}">
<link rel="canonical" href="${esc(p.link)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="${esc(BRAND)} by Ashi">
<meta property="og:title" content="${esc(p.name)}">
<meta property="og:description" content="${esc(p.text)}">
<meta property="og:url" content="${esc(p.link)}">
<meta property="og:image" content="${esc(img)}">
<meta property="product:price:amount" content="${Math.min(...prices)}">
<meta property="product:price:currency" content="INR">
<meta property="og:availability" content="${inStock ? 'instock' : 'oos'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/monogram-seal.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script>location.replace('/' + location.search + ${JSON.stringify('#p-' + encodeURIComponent(p.id))});</script>
</head>
<body>
<p><a href="${esc(go)}">${esc(p.name)} at ${esc(BRAND)}</a></p>
</body>
</html>
`;
}

function rss(items) {
  const now = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${esc(BRAND)} by Ashi</title>
<link>${SITE}/</link>
<description>Candles and Jesmonite objects, made in small batches for everyday rituals and meaningful giving.</description>
<language>en-IN</language>
<lastBuildDate>${now}</lastBuildDate>
${items.map((p) => `<item>
<title>${esc(p.name)}</title>
<link>${esc(p.link)}</link>
<guid isPermaLink="true">${esc(p.link)}</guid>
<description>${esc(p.text)}</description>
${p.updated ? `<pubDate>${new Date(p.updated).toUTCString()}</pubDate>\n` : ''}<enclosure url="${esc(p.photos[0].url)}" type="${/\.png$/i.test(p.photos[0].url) ? 'image/png' : 'image/jpeg'}" length="0"/>
<media:content url="${esc(p.photos[0].url)}" medium="image"/>
</item>`).join('\n')}
</channel>
</rss>
`;
}

function catalog(items, qty) {
  const cols = ['id', 'item_group_id', 'title', 'description', 'link', 'image_link', 'additional_image_link', 'price', 'availability', 'condition', 'brand', 'product_type'];
  const rows = [];
  for (const p of items) {
    for (const v of p.variants) {
      const own = p.photos.filter((x) => !x.variant || x.variant === v.label);
      const pics = (own.length ? own : p.photos).map((x) => x.url);
      rows.push([v.sku, p.id, `${p.name}, ${v.label}`, p.text, p.link, pics[0], pics.slice(1, 11).join(','), `${v.price.toFixed(2)} INR`,
        (qty[v.sku] || 0) > 0 ? 'in stock' : 'out of stock', 'new', BRAND, p.cat === 'candles' ? 'Home > Candles' : 'Home > Jesmonite Objects']);
    }
  }
  return [cols, ...rows].map((r) => r.map(csv).join(',')).join('\n') + '\n';
}

(async () => {
  const c = config();
  if (!c.url || !c.key) { console.log('Pinterest: no database in config.js, nothing to build.'); return; }
  let d;
  try { d = await load(c); } catch (e) {
    console.log('::warning::Pinterest pages and feeds were not built: the database could not be read (' + e.message + ').');
    return; // never block the site deploy over the feeds
  }
  const fileUrl = (p) => (/^https?:/.test(p) ? p : /^assets\//.test(p) ? SITE + '/' + p : c.url + '/storage/v1/object/public/media/' + p.split('/').map(encodeURIComponent).join('/'));
  const { products, qty, comingSoon } = prepare(d, fileUrl);
  for (const p of products) write(`p/${p.id}/index.html`, productPage(p, qty));
  const ready = comingSoon ? [] : products.filter((p) => p.photos.length);
  write('pinterest/products.xml', rss(ready));
  write('pinterest/catalog.csv', catalog(ready, qty));
  const noPhoto = products.filter((p) => !p.photos.length).map((p) => p.id);
  console.log(`Pinterest: ${products.length} product pages; ${ready.length} products in the feeds` +
    (comingSoon ? ' (Coming soon is on, so the feeds are empty).' : '.') + (noPhoto.length && !comingSoon ? ` No photo yet: ${noPhoto.join(', ')}.` : ''));
})();
