// Owner view: Add offline order saves an ordinary order (sold offline), lowers stock and makes an invoice. Needs tools/preview.sh running.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const expect = (label, got, want) => { console.log(label, got === want ? 'ok' : 'FAIL (got ' + got + ', want ' + want + ')'); if (got !== want) fails.push(label); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
  await p.goto('http://localhost:8765/page.html#admin'); await p.waitForTimeout(800);
  await p.click('[data-act="adm-tab"][data-v="orders"]'); const before = await p.locator('tbody tr').count();
  await p.click('[data-act="adm-offline"]');
  expect('form opens', await p.locator('.pm-box').count(), 1);
  await p.click('.pm-box button[type="submit"]'); expect('needs a name (form stays open)', await p.locator('.pm-box').count(), 1);
  await p.fill('[name="name"]', 'Himanshu'); await p.click('.pm-box button[type="submit"]'); expect('needs an item', /at least one item/i.test(await p.textContent('#oo-err')), true);
  const sel = async (i, idx) => { await p.selectOption(`[name="s${i}"]`, { index: idx }); };
  await sel(0, 1); await p.fill('[name="q0"]', '2'); await sel(1, 2);
  await p.fill('[name="ship"]', '60'); await p.fill('[name="paid"]', '120'); await p.waitForTimeout(100);
  const tot = await p.textContent('#oo-tot'); console.log(tot); expect('shows left to pay', /left to pay/.test(tot), true);
  await p.fill('[name="email"]', 'himanshu@example.com');
  await p.click('.pm-box button[type="submit"]'); await p.waitForTimeout(600);
  expect('form closes', await p.locator('.pm-box').count(), 0);
  expect('order listed', await p.locator('tbody tr').count(), before + 1);
  expect('offline id shown', /BT-OFF-\d{6}-[A-Z0-9]{4}/.test(await p.textContent('tbody')), true);
  expect('no page errors', errs.length, 0);
  await b.close(); if (fails.length) { console.log('FAILED:', fails.join(', ')); process.exit(1); } console.log('Offline order checks passed.');
})();
