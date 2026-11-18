// Draws the Coming soon screen into the built home page, so a phone shows it at once instead of waiting for the big
// app script to download and run (that wait is most of the 3 to 4 seconds before the first screen on a slow phone).
// The app still starts as before and replaces this block with its own drawing, so nothing about the page changes.
//   node bud-and-things/tools/prerender-soon.js _site        (run by .github/workflows/pages.yml, after split-js, before add-csp)
//
// It only does anything while the shop is in Coming soon mode: it reads the setting from the database, and if the
// setting is off, or cannot be read, the page is left exactly as it was (a stale Coming soon block on an open shop
// would be worse than a slow first screen). Test-only: BT_PRERENDER_FORCE=1 skips the database check.
// Needs Playwright (PLAYWRIGHT_PATH, as the tests use) because the block is the app's own drawing of the page, not a
// second copy of its text kept by hand.
const fs = require('fs'), path = require('path'), http = require('http');
const dir = process.argv[2]; if (!dir) { console.error('usage: prerender-soon.js <site folder>'); process.exit(1); }
const file = path.join(dir, 'index.html');
const MOUNT = '<main id="app" tabindex="-1"></main>';
const cfg = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'config.js'), 'utf8');
const dbUrl = (/url:\s*'([^']*)'/.exec(cfg) || [])[1] || '';
const dbKey = (/anonKey:\s*'([^']*)'/.exec(cfg) || [])[1] || '';

async function comingSoonIsOn() {
  if (process.env.BT_PRERENDER_FORCE) return true;
  if (!dbUrl || !dbKey) return false;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(dbUrl + '/rest/v1/settings?select=key,value&key=eq.comingSoon', { headers: { apikey: dbKey, Authorization: 'Bearer ' + dbKey } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json();
      return !(rows[0] && rows[0].value === false); // the site treats a missing setting as on
    } catch (e) { if (i === 2) return false; await new Promise((res) => setTimeout(res, 1500)); }
  }
  return false;
}

(async () => {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes(MOUNT)) { console.log('prerender-soon: the page has no empty #app, nothing to do'); return; }
  if (!(await comingSoonIsOn())) { console.log('prerender-soon: Coming soon is off (or the setting could not be read), page left as it is'); return; }

  const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
  const server = http.createServer((q, r) => {
    const p = decodeURIComponent(q.url.split('?')[0]); const f = path.join(dir, p.endsWith('/') ? p + 'index.html' : p);
    if (!f.startsWith(path.resolve(dir))) { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    // only the site itself answers: the database is blocked, so the page draws its built-in Coming soon text
    await page.route((u) => !u.href.startsWith(base), (route) => route.abort());
    await page.goto(base + '/index.html', { waitUntil: 'load' });
    await page.waitForSelector('#app .soon', { timeout: 15000 });
    // only the Coming soon section: the page may also draw a "trouble loading" notice above it, because the database is blocked here
    const out = await page.evaluate(() => { const s = document.querySelector('#app > section.soon'); return { inner: s ? s.outerHTML : '', body: document.body.className }; });
    if (!/^<section class="soon"/.test(out.inner) || /<script|data-act="db-retry"/i.test(out.inner)) throw new Error('unexpected Coming soon drawing, not used');
    html = html.replace(MOUNT, `<main id="app" tabindex="-1">${out.inner}</main>`);
    html = html.replace(/<body>/, `<body class="${out.body || 'cs'}">`);
    fs.writeFileSync(file, html);
    console.log(`prerender-soon: Coming soon screen added to the home page (${out.inner.length} bytes, body class "${out.body}")`);
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error('prerender-soon: skipped, page left as it is:', e.message); process.exit(0); });
