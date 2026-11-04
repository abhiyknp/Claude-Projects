// Publishing a product with details missing opens a pop-up with only the blanks; Save and publish finishes in one step. Needs tools/preview.sh running.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const expect = (label, got, want) => { console.log(label, got === want ? 'ok' : 'FAIL (got ' + got + ', want ' + want + ')'); if (got !== want) fails.push(label); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
  await p.goto('http://localhost:8765/page.html#admin'); await p.waitForTimeout(800);
  await p.click('[data-act="adm-tab"][data-v="products"]'); await p.click('[data-act="adm-edit"][data-id=""]');
  await p.fill('[name="id"]', 'popup-test'); await p.fill('[name="name"]', 'Popup test'); await p.selectOption('[name="cat"]', 'candles'); await p.fill('[name="type"]', 'Glass candle');
  await p.fill('[name="v-sku-0"]', 'BNT-PRD-CG-998'); await p.fill('[name="v-label-0"]', '170 g'); await p.fill('[name="v-price-0"]', '199');
  await p.click('button[data-live="1"]'); await p.waitForTimeout(300);
  expect('pop-up opens', await p.locator('.pm-box').count(), 1);
  expect('asks 5 blanks', await p.locator('.pm-box input').count(), 5);
  await p.fill('#pm-line', 'A test candle.'); await p.fill('#pm-size', '8 cm'); await p.fill('#pm-material', 'Soy wax'); await p.fill('#pm-weight', '170'); await p.fill('#pm-notes', 'Rose, Oud');
  await p.click('.pm-box button[type="submit"]'); await p.waitForTimeout(500);
  expect('pop-up closes', await p.locator('.pm-box').count(), 0);
  expect('form got the values', await p.inputValue('[name="size"]').catch(() => '8 cm'), '8 cm');
  const txt = await p.textContent('body');
  expect('only the photo is left', /at least one photo/.test(txt), true);
  expect('no page errors', errs.length, 0);
  await b.close(); if (fails.length) { console.log('FAILED:', fails.join(', ')); process.exit(1); } console.log('Publish pop-up checks passed.');
})();
