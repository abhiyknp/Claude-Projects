// Automatic page audit. Loads the prototype at desktop and phone width and fails (exit 1) on:
//   text under 4.5:1 contrast (3:1 for large text) on a flat background, text under 12px, sideways scroll,
//   a page without exactly one main heading, images without an alt attribute, links, buttons and fields without a name,
//   skipped heading levels, a missing skip link, buttons and fields under 44px high on phone, and page errors.
// Text over photos and gradients has no single background colour, so it is skipped; look at those by eye.
//   node bud-and-things/tools/audit.js           (needs: npm i playwright, and a Chromium; run by .github/workflows/audit.yml)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..', 'prototype');
const page = '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + fs.readFileSync(path.join(root, 'index.html'), 'utf8') + '</body></html>';
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.css': 'text/css', '.ico': 'image/x-icon' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); }
  r.setHeader('content-type', 'text/html'); r.end(page);
});
const ROUTES = ['home', 'shop', 'candles', 'gifts', 'story', 'faq', 'help', 'privacy', 'terms', 'journal', 'track', 'feeling', 'p-chai-at-four'];
const inPage = () => {
  const out = { nodes: 0, low: [], small: [], tap: [], names: [], noAlt: 0, h1: 0, skip: 0, hscroll: document.documentElement.scrollWidth > innerWidth + 1, skipLink: !!document.querySelector('.skip-link') };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : null; };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; const p = parse(cs.backgroundColor); if (p && (p[3] === undefined || p[3] >= 0.99)) return p; } return [255, 255, 255]; };
  const L = (c) => { const a = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  document.querySelectorAll('#app *, .site-head *, .site-foot *').forEach((el) => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.opacity === '0') return;
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      out.nodes++; const fs = parseFloat(cs.fontSize); const t = el.textContent.trim().slice(0, 30);
      if (fs < 12) out.small.push(t + ' ' + fs);
      const fg = parse(cs.color), bg = bgOf(el);
      if (fg && bg && (fg.length < 4 || fg[3] === 1)) { const a = L(fg), b = L(bg); const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); const big = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight) >= 700); if (cr < (big ? 3 : 4.5)) out.low.push(cr.toFixed(2) + ' ' + t); }
    }
    if (el.matches('a[href],button,[role=button]')) { const n = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent.trim() || el.title || [...el.querySelectorAll('img')].map((i) => i.alt).join(''); if (!n) out.names.push(el.outerHTML.slice(0, 70)); }
    if (el.matches('input:not([type=hidden]),select,textarea') && !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) out.names.push(el.outerHTML.slice(0, 70));
    if (innerWidth < 600 && el.matches('button,input:not([type=hidden]),select,textarea') && r.height < 44 && !el.closest('.adm,.code-chip-wrap')) out.tap.push(el.tagName + ' ' + (el.textContent.trim().slice(0, 20) || el.getAttribute('aria-label') || '') + ' ' + Math.round(r.height));
  });
  out.noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
  const hs = [...document.querySelectorAll('#app h1,#app h2,#app h3,#app h4')].map((e) => +e.tagName[1]);
  out.h1 = hs.filter((x) => x === 1).length; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) out.skip++;
  return out;
};
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const problems = []; let total = 0;
  for (const [vw, vh] of [[1280, 800], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: vw, height: vh } });
    pg.on('pageerror', (e) => problems.push(`${vw}px: page error: ${e.message}`));
    // the live database is never used: the site falls back to its built-in draft shop; every table answers empty, so the built-in draft range shows, and Coming soon is switched off so the pages show
    await pg.route(/\.supabase\.co\//, (rt) => { const u = rt.request().url(); return /\/rest\/v1\//.test(u) ? rt.fulfill({ json: /\/settings/.test(u) ? [{ key: 'comingSoon', value: false }] : [] }) : rt.abort(); });
    await pg.goto(base + '#home'); await pg.waitForTimeout(500);
    for (const r of ROUTES) {
      await pg.goto(base + '#' + r); await pg.reload(); await pg.waitForTimeout(450);
      const o = await pg.evaluate(inPage); const at = `${vw}px #${r}`; total += o.nodes;
      if (o.nodes < 15) problems.push(`${at}: only ${o.nodes} text items found, the page did not load`);
      o.low.forEach((x) => problems.push(`${at}: contrast ${x}`)); o.small.forEach((x) => problems.push(`${at}: text under 12px: ${x}`));
      o.tap.forEach((x) => problems.push(`${at}: tap target under 44px: ${x}`)); o.names.forEach((x) => problems.push(`${at}: no name: ${x}`));
      if (o.noAlt) problems.push(`${at}: ${o.noAlt} image(s) without alt`); if (o.h1 !== 1) problems.push(`${at}: ${o.h1} h1 headings`);
      if (o.skip) problems.push(`${at}: ${o.skip} skipped heading level(s)`); if (o.hscroll) problems.push(`${at}: sideways scroll`); if (!o.skipLink) problems.push(`${at}: no skip link`);
    }
    await pg.close();
  }
  await b.close(); srv.close();
  const uniq = [...new Set(problems)];
  console.log(uniq.length ? uniq.join('\n') + `\n\n${uniq.length} problem(s).` : `Audit passed: ${ROUTES.length} pages at 1280px and 390px, ${total} text items checked.`);
  process.exit(uniq.length ? 1 : 0);
})();
