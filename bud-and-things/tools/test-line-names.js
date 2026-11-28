// A product whose name already says its option ("Midnight Sunflower · Pack of 6" + the option "Pack of 6") must not show the
// option twice in the cart, the checkout summary or on order lines. Needs a preview server (tools/preview.sh).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    await pg.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    pg.on('pageerror', (e) => errs.push(w + ' pageerror: ' + e.message));
    await pg.goto(url + '#home'); await pg.waitForTimeout(300);
    await pg.goto(url + '#p-bnt-prd-tl-002'); await pg.waitForTimeout(200);
    await pg.click('[data-act="add"]'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
    for (const hash of ['#cart', '#checkout']) {
      await pg.goto(url + hash); await pg.waitForTimeout(250);
      const t = await pg.evaluate(() => document.body.innerText);
      if (/Pack of 6\s*[·,\-–]?\s*Pack of 6/i.test(t)) errs.push(w + ' ' + hash + ' shows "Pack of 6" twice');
      console.log(w, hash, 'no doubled option wording', /Midnight Sunflower/.test(t) ? 'ok' : '(product not in page?)');
      if (!/Midnight Sunflower/.test(t)) errs.push(w + ' ' + hash + ' product missing');
    }
    await pg.close();
  }
  await b.close();
  if (errs.length) { console.log('FAIL:\n' + errs.join('\n')); process.exit(1); }
  console.log('Line name checks passed.');
})();
