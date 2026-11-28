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
      for (const r of ROUTES) {
        await p.goto(url + '#' + r); await p.waitForTimeout(500); await p.mouse.wheel(0, 3000).catch(() => {}); await p.waitForTimeout(200);
        const m = await p.evaluate(() => ({ ow: document.documentElement.scrollWidth - innerWidth, bad: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length, txt: document.body.innerText.length }));
        if (m.ow > 0) issues.push('#' + r + ' sideways scroll ' + m.ow + 'px'); if (m.bad) issues.push('#' + r + ' ' + m.bad + ' broken image(s)'); if (m.txt < 80) issues.push('#' + r + ' nearly empty');
      }
      // the main path: add a piece, open the cart, reach the checkout gate
      await p.goto(url + '#p-bnt-prd-cg-001'); await p.waitForTimeout(500); await p.click('[data-act="add"]'); await p.waitForTimeout(300);
      const added = await p.locator('.added-pop').count(); if (!added) issues.push('adding to the cart showed no confirmation');
      await p.goto(url + '#cart'); await p.waitForTimeout(400); if (!/Subtotal/.test(await p.evaluate(() => document.body.innerText))) issues.push('the cart shows no subtotal');
      await p.goto(url + '#checkout'); await p.waitForTimeout(400); if (!(await p.$('#acct-email'))) issues.push('the checkout sign-in form is missing');
      const bad = errs.length || issues.length; if (bad) fails++;
      console.log(`${label.padEnd(18)} ${ROUTES.length} pages + cart path · ${bad ? 'PROBLEMS' : 'ok'}${errs.length ? ' · errors: ' + [...new Set(errs)].slice(0, 3).join(' | ').slice(0, 200) : ''}${issues.length ? ' · ' + issues.slice(0, 4).join('; ') : ''}`);
      await ctx.close();
    }
    await b.close();
  }
  if (fails) { console.log('FAIL'); process.exit(1); } console.log('Cross-browser checks passed.');
})();
