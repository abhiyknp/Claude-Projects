// The shop in Firefox and in WebKit (the engine behind Safari on iPhone and Mac), where the other tests use Chromium.
// Needs a preview server (tools/preview.sh). BROWSERS=firefox,webkit (default both). Run on GitHub by .github/workflows/cross-browser.yml.
const pw = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const url = process.env.BT_URL || 'http://localhost:8765/page.html';
const ROUTES = ['home', 'shop', 'gifting', 'story', 'help', 'faq', 'privacy', 'terms', 'cart', 'checkout', 'track', 'p-bnt-prd-cg-001', 'p-bnt-prd-jt-001', 'p-bnt-prd-tl-002'];
(async () => {
  const names = (process.env.BROWSERS || 'firefox,webkit').split(','); let fails = 0;
  for (const name of names) {
    const sets = name === 'webkit' ? [['Safari on iPhone', pw.devices['iPhone 12']], ['Safari on Mac', { viewport: { width: 1366, height: 768 } }]] : [['Firefox desktop', { viewport: { width: 1366, height: 768 } }], ['Firefox phone', { viewport: { width: 390, height: 844 }, isMobile: false }]];
    const b = await pw[name].launch();
    for (const [label, opt] of sets) {
      const ctx = await b.newContext(opt); await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
      const p = await ctx.newPage(); const errs = [], issues = [];
      p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource|NS_ERROR|blocked/i.test(m.text())) errs.push(m.text()); });
      const log = []; if (process.env.VERBOSE) { p.on('console', (m) => log.push('console.' + m.type() + ': ' + m.text().slice(0, 200))); p.on('requestfailed', (r) => log.push('requestfailed: ' + r.url().slice(0, 100) + ' ' + (r.failure() || {}).errorText)); p.on('response', (r) => { if (r.status() >= 400) log.push('http ' + r.status() + ' ' + r.url().slice(0, 100)); }); }
      for (const r of ROUTES) {
        await p.goto(url + '#' + r); await p.waitForTimeout(500); await p.mouse.wheel(0, 3000).catch(() => {}); await p.waitForTimeout(200);
        const m = await p.evaluate(() => ({ ow: document.documentElement.scrollWidth - innerWidth, bad: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length, txt: document.body.innerText.length }));
        if (m.ow > 0) issues.push('#' + r + ' sideways scroll ' + m.ow + 'px'); if (m.bad) issues.push('#' + r + ' ' + m.bad + ' broken image(s)'); if (m.txt < 80) issues.push('#' + r + ' nearly empty');
      }
      // the main path: add a piece, open the cart, reach the checkout gate
      await p.goto(url + '#p-bnt-prd-cg-001'); await p.waitForTimeout(800);
      try { await p.locator('[data-act="add"]').first().click({ timeout: 10000 }); await p.waitForTimeout(400);
        if (!(await p.locator('.added-pop').count())) issues.push('adding to the cart showed no confirmation'); }
      catch (e) { const info = await p.evaluate(() => ({ hash: location.hash, len: document.body.innerText.length, head: document.body.innerText.slice(0, 160).replace(/\s+/g, ' '), btns: [...document.querySelectorAll('button')].slice(0, 12).map((x) => (x.dataset.act || x.className || x.textContent).toString().slice(0, 24)) })).catch(() => ({}));
        issues.push('the Add to cart button was not found on the product page: ' + JSON.stringify(info)); }
      await p.goto(url + '#cart'); await p.waitForTimeout(400); if (!/Subtotal/.test(await p.evaluate(() => document.body.innerText))) issues.push('the cart shows no subtotal');
      await p.goto(url + '#checkout'); await p.waitForTimeout(400); if (!(await p.$('#acct-email'))) issues.push('the checkout sign-in form is missing');
      if (process.env.VERBOSE && (errs.length || issues.length)) { const scripts = await p.evaluate(() => [...document.scripts].map((x) => (x.src || 'inline').slice(-50))).catch(() => []); console.log('  VERBOSE log:\n   ' + [...new Set(log)].slice(0, 25).join('\n   ') + '\n  scripts: ' + scripts.join(', ') + '\n  ua: ' + (await p.evaluate(() => navigator.userAgent).catch(() => ''))); }
      const bad = errs.length || issues.length; if (bad) fails++; if (errs.length) console.log('  page errors:', [...new Set(errs)].slice(0, 6).join(' | ').slice(0, 600));
      console.log(`${label.padEnd(18)} ${ROUTES.length} pages + cart path · ${bad ? 'PROBLEMS' : 'ok'}${errs.length ? ' · errors: ' + [...new Set(errs)].slice(0, 3).join(' | ').slice(0, 200) : ''}${issues.length ? ' · ' + issues.slice(0, 4).join('; ') : ''}`);
      await ctx.close();
    }
    await b.close();
  }
  if (fails) { console.log('FAIL'); process.exit(1); } console.log('Cross-browser checks passed.');
})();
