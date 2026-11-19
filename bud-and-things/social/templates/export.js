#!/usr/bin/env node
/* Export the social templates to PNG with Playwright.
   Usage (from bud-and-things/social):
     node templates/export.js                 export everything in templates/posts.json to out/
     node templates/export.js --only p01,s02  export just those ids
     node templates/export.js --guides        draw Story safe zones (blue) and sticker slot, for checking only
     node templates/export.js --final         refuse to export if any picture is a temporary catalogue image
   Photos: put your own in social/photos/ and name them in posts.json ("photo": "vanilla-gold.jpg").
   Without one, the site's temporary catalogue picture is used and flagged. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');                // bud-and-things/social
const BT = path.resolve(ROOT, '..');                       // bud-and-things
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const oi = args.indexOf('--only'); const only = oi < 0 ? [] : (args[oi + 1] || '').split(',').filter(Boolean);
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.json'), 'utf8'));
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));
const prods = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(BT, 'catalogue/products.json'), 'utf8')).products.map((p) => [p.id, p]));
const sheet = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(BT, 'data/catalogue.sheet.json'), 'utf8')).map((p) => [p.id, p]));
const NAME_FIX = { 'BNT-PRD-TL-003': 'Marigold Glow' };   // the sheet spells it Marrigold; the site says Marigold
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const em = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const temp = [], warn = [];

function photo(spec, label) {                               // -> file:// url
  if (!spec) return '';
  const own = path.join(ROOT, 'photos', spec);
  if (fs.existsSync(own)) return 'file://' + own;
  const cat = path.join(BT, 'prototype/assets/catalogue', spec);
  const asset = path.join(BT, 'prototype/assets', spec);
  const f = [cat, asset].find((x) => fs.existsSync(x));
  if (!f) throw new Error(`${label}: picture "${spec}" not found in social/photos/ or the site assets`);
  temp.push(`${label}: ${spec}`); return 'file://' + f;
}
function product(post) {
  const id = post.product; if (!id) return {};
  const p = prods[id], s = sheet[id]; if (!p) throw new Error(`${post.id}: unknown product ${id}`);
  if (p.stock === 0) warn.push(`${post.id}: ${p.name} shows stock 0 in the catalogue snapshot. Do not post it as available.`);
  const name = NAME_FIX[id] || p.name;
  const SCENT_FIX = { Vanila: 'Vanilla', 'Whit Oud': 'White Oud', BlueBerry: 'Blueberry' };   // typos in the sheet
  const sc = s && s.scent ? s.scent.trim() : '';
  const scent = sc && !/^(n\/a|any)/i.test(sc) ? (SCENT_FIX[sc] || sc) + ' scent' : '';
  const type = p.type.replace(/^./, (c) => c.toUpperCase());
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const own = ['jpg', 'jpeg', 'png', 'webp'].flatMap((x) => [`${id.toLowerCase()}.${x}`, `${slug}.${x}`]).find((f) => fs.existsSync(path.join(ROOT, 'photos', f)));
  return { name, price: p.price, meta: [type, scent].filter(Boolean).join(' · '), img: own || p.img };
}
const priceHtml = (price, post) => (brand.showPrices && post.price !== false && price != null) ? `<span class="pill">${inr(price)}</span>` : '';

function build(post) {
  const pr = product(post);
  const f = { icon: esc(post.icon || ''), site: esc(brand.site), kicker: esc(post.kicker || ''), title: em(post.title || ''), sub: em(post.sub || ''),
    name: esc(post.name || pr.name || ''), meta: esc(post.meta || pr.meta || ''),
    price_html: priceHtml(post.price ?? pr.price, post), badge_html: post.badge ? `<div class="badge">${esc(post.badge)}</div>` : '' };
  f.photo_url = photo(post.photo || pr.img, post.id);
  f.rows = (post.items || []).map((it, i) => {
    const q = product({ id: post.id, product: it.product });
    const ph = photo(it.photo || q.img, `${post.id}[${i + 1}]`);
    const price = brand.showPrices && it.price !== false ? `<div class="p">${inr(it.price ?? q.price)}</div>` : '';
    return `<div class="r"><div class="ph" style="background-image:url('${ph}')"></div><div class="t"><b>${esc(it.name || q.name)}</b><span>${esc(it.line || q.meta)}</span></div>${price}</div>`;
  }).join('');
  return f;
}
const fill = (html, f) => html.replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => f[k] ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => f[k] ?? '');

(async () => {
  const list = posts.filter((p) => !only.length || only.includes(p.id));
  if (!list.length) { console.error('Nothing to export. Check --only ids against posts.json.'); process.exit(1); }
  const jobs = list.map((p) => ({ p, html: fill(fs.readFileSync(path.join(__dirname, p.template + '.html'), 'utf8'), build(p)) }));
  if (flag('--final') && temp.length) { console.error('--final: these still use temporary catalogue pictures. Add real photos to social/photos/:\n  ' + temp.join('\n  ')); process.exit(2); }
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] }); let bad = 0;
  for (const { p, html } of jobs) {
    const [w, h] = /name="size" content="(\d+)x(\d+)"/.exec(html).slice(1).map(Number);
    const tmp = path.join(__dirname, `.tmp-${p.id}.html`); fs.writeFileSync(tmp, html);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file://' + tmp); await page.evaluate(() => document.fonts.ready);
    if (flag('--guides')) await page.evaluate(() => document.documentElement.classList.add('guides'));
    const over = await page.evaluate(() => [...document.querySelectorAll('[data-fit]')].filter((e) => e.scrollHeight > e.clientHeight + 16 || e.scrollWidth > e.clientWidth + 4).map((e) => e.textContent.trim().slice(0, 40) || e.className));
    if (over.length) { bad++; warn.push(`${p.id}: text may not fit (${over.join(' | ')}). Shorten it.`); }
    const out = path.join(ROOT, 'out', `${p.id}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } }); await page.close(); fs.unlinkSync(tmp);
    console.log(`ok  ${p.id}  ${w}x${h}  -> out/${p.id}.png`);
  }
  await browser.close();
  if (temp.length) console.log(`\nTEMPORARY pictures used (${temp.length}). Fine for drafts. Replace with your own photos in social/photos/ before posting:\n  ` + [...new Set(temp)].join('\n  '));
  if (warn.length) console.log('\nCheck:\n  ' + warn.join('\n  '));
})().catch((e) => { console.error(e.message); process.exit(1); });
