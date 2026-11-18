// Festive characters: each page view picks a character at random from the manifest; one sits on the main button,
// a different one on the footer ribbon, and a waving one on the thank-you screen. Needs a preview server (tools/preview.sh).
const fs = require('fs'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; let fails = 0;
  const ok = (l, c) => { console.log(l, c ? 'ok' : 'FAIL'); if (!c) fails++; };
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  const img = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'assets', 'festive', 'chars', 'xmas-peek-santa.webp'));
  for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(tag + ' ' + e.message));
    await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    await p.route('**/chars/manifest.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ xmas: { peek: ['xmas-peek-santa.webp', 'xmas-peek-b.webp'], wave: ['xmas-wave-a.webp'] } }) }));
    for (const f of ['xmas-peek-b.webp', 'xmas-wave-a.webp']) await p.route('**/chars/' + f, (r) => r.fulfill({ contentType: 'image/webp', body: img }));
    await p.goto(url + '#admin'); await p.waitForTimeout(600);
    await p.click('[data-act="adm-tab"][data-v="festive"]'); await p.locator('[data-act="ft-ask"][data-v="xmas"]').click(); await p.locator('[data-act="ft-apply"]').click(); await p.waitForTimeout(400);
    await p.goto(url + '#home'); await p.waitForTimeout(2200);
    const srcs = await p.evaluate(() => [...document.querySelectorAll('.ft-sit img')].map((i) => i.getAttribute('src').split('/').pop()));
    ok(tag + ': a character on the main button and a different one on the footer ribbon', srcs.length === 2 && srcs[0] !== srcs[1]);
    ok(tag + ': the character on the button never covers its label', await p.evaluate(() => { const bt = document.querySelector('.ft-host'); const s = bt && bt.querySelector('.ft-sit'); if (!s) return false; const lb = bt.getBoundingClientRect(); return s.getBoundingClientRect().bottom <= lb.top + 24; }));
    await p.goto(url + '#p-bnt-prd-cg-001'); await p.waitForTimeout(1500);
    ok(tag + ': product pages get no character on the Add to cart button', await p.evaluate(() => !document.querySelector('.buy .ft-sit')));
    ok(tag + ': characters never intercept a tap', await p.evaluate(() => [...document.querySelectorAll('.ft-sit')].every((e) => getComputedStyle(e).pointerEvents === 'none')));
    await p.evaluate(() => { BTFest.thanks({ text: 'Order test is paid.' }); }); await p.waitForTimeout(500);
    ok(tag + ': the thank-you screen shows the waving character', await p.evaluate(() => !!document.querySelector('.ft-thx .ft-thxchar')));
    await ctx.close();
  }
  await b.close(); console.log('page errors:', errs.length ? errs : 'none');
  if (fails || errs.length) process.exit(1); console.log('Festive character checks passed.');
})();
