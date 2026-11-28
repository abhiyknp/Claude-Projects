// A customer who has just paid at Razorpay must not be told "we haven't received the payment" while Razorpay is still
// marking the order paid: the page asks again a few times by itself, and says "went through, don't pay again" if it still
// has not landed. Runs against the stand-in database (tools/mock-supabase.js) with PAY_LAG, and a stand-in for Razorpay's
// payment window. Needs a preview server (tools/preview.sh).
const { spawn } = require('child_process'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const DB = 'http://localhost:54321';
(async () => {
  let fails = 0; const errs = [];
  const ok = (l, c, extra) => { console.log(l, c ? 'ok' : 'FAIL' + (extra ? ' (' + extra + ')' : '')); if (!c) fails++; };
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  const CFG = "window.BT_CONFIG = { supabase: { url: '" + DB + "', anonKey: 'anon' } };";
  const html = require('fs').readFileSync(path.join(__dirname, '..', 'prototype', 'index.html'), 'utf8');
  const pieces = html.split('\n').filter((l) => /^\s*\{"id": "bnt-prd-/.test(l)).map((l) => JSON.parse(l.trim().replace(/,$/, '')));
  const b = await chromium.launch();
  for (const [lag, mode] of [[2, 'ok'], [99, 'ok'], [2, 'dismiss']]) {
    const mock = spawn('node', [path.join(__dirname, 'mock-supabase.js')], { stdio: 'ignore', env: Object.assign({}, process.env, { PAY_LAG: String(lag) }) });
    await new Promise((r) => setTimeout(r, 1500));
    const tok = (await (await fetch(DB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'hello@budandthings.com', password: 'demo' }) })).json()).access_token;
    const post = (table, rows) => fetch(DB + '/rest/v1/' + table, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: 'anon', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) });
    await post('products', pieces.map((x, i) => { const d = { ...x }; delete d.id; return { id: x.id, data: d, sort: i * 10, live: true }; }));
    await post('stock', pieces.flatMap((x) => (x.variants || []).map((v) => ({ sku: v.sku, qty: 50 }))));
    await post('settings', [{ key: 'comingSoon', value: false }, { key: 'onlineOn', value: true }, { key: 'codOn', value: false }, { key: 'shipAuto', value: false }, { key: 'shipFee', value: 99 }, { key: 'freeOver', value: 100000 }]);
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CFG }));
    // Razorpay's window: opening it is the customer paying; its handler runs straight away
    await ctx.route('https://checkout.razorpay.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: mode === 'dismiss'
      ? 'window.Razorpay = function (o) { this.o = o; this.on = function () {}; this.open = function () { setTimeout(() => o.modal.ondismiss(), 50); }; };' // the customer closes the window, no success report
      : 'window.Razorpay = function (o) { this.o = o; this.on = function () {}; this.open = function () { setTimeout(() => o.handler({ razorpay_payment_id: "pay_x" }), 50); }; };' }));
    if (mode === 'dismiss') await ctx.addInitScript(() => { window.BT_ORDER_POLL_MS = 1200; }); // watch faster than the real 10 s
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url + '#p-bnt-prd-jt-001'); await p.waitForTimeout(1200); await p.click('[data-act="add"]'); await p.keyboard.press('Escape');
    await p.goto(url + '#checkout'); await p.waitForTimeout(500);
    await p.fill('#acct-email', 'pay@example.com'); await p.check('#acct-agree'); await p.click('form[data-form="acct-email"] button[type="submit"]'); await p.waitForTimeout(500);
    await p.fill('#acct-code', '111111'); await p.click('form[data-form="acct-code"] button[type="submit"]'); await p.waitForTimeout(800);
    await p.fill('#co-name', 'Meera Rao'); await p.fill('#co-phone', '9876543210'); await p.check('#co-agree'); await p.click('form[data-form="contact"] button[type="submit"]'); await p.waitForTimeout(300);
    await p.fill('#co-line1', '12 Lake View Road'); await p.fill('#co-pin', '208024'); await p.fill('#co-city', 'Kanpur'); await p.selectOption('#co-state', 'Uttar Pradesh'); await p.waitForTimeout(700);
    await p.click('form[data-form="address"] button[type="submit"]'); await p.waitForTimeout(500);
    await p.click('[data-act="pay-success"][data-via="Online"]');
    const t0 = Date.now();
    if (mode === 'dismiss') {
      const done = async () => p.evaluate(() => location.hash.startsWith('#order-') && /\bPaid\b/.test(document.body.innerText) && !/Awaiting payment/.test(document.body.innerText));
      while (Date.now() - t0 < 30000 && !(await done())) await p.waitForTimeout(250);
      ok('window closed with no success report: the page still turns Paid by itself, with no button pressed', await done(), (Date.now() - t0) + ' ms');
    } else if (lag === 2) {
      // only the order page counts (the checkout page also has words like "paid"), and only once it no longer says Awaiting payment.
      // Plain polling: the page's security policy blocks Playwright's waitForFunction on older Playwright versions.
      const done = async () => p.evaluate(() => location.hash.startsWith('#order-') && /\bPaid\b/.test(document.body.innerText) && !/Awaiting payment/.test(document.body.innerText));
      while (Date.now() - t0 < 40000 && !(await done())) await p.waitForTimeout(250);
      const txt = await p.evaluate(() => document.body.innerText);
      ok('paid after two "not yet" answers: the page shows Paid by itself', /\bPaid\b/.test(txt) && !/Awaiting payment/.test(txt) && p.url().includes('#order-'), (Date.now() - t0) + ' ms');
      ok('it really waited and asked again (3 s + 5 s), not just once', Date.now() - t0 >= 7500, (Date.now() - t0) + ' ms');
      ok('no "we haven\'t received the payment" message on the way', !/haven.t received the payment/.test(txt));
    } else {
      await p.waitForTimeout(36000);
      const txt = await p.evaluate(() => document.body.innerText);
      ok('still not paid after the waits: it says the payment went through and not to pay again', /Please don.t pay again/.test(txt) && !/haven.t received the payment/.test(txt));
    }
    await ctx.close(); mock.kill();
    await new Promise((r) => setTimeout(r, 400));
  }
  await b.close();
  if (errs.length) { console.log('page errors:', errs); fails++; }
  if (fails) { console.log('FAIL'); process.exit(1); }
  console.log('Payment wait checks passed.');
})();
