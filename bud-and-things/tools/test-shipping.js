// Live shipping at checkout, against the stand-in database (tools/mock-supabase.js): with the owner's switch off the flat fee
// applies; with it on the customer sees the quickest courier's price for their PIN, the order points at that quote, free
// shipping over the limit can be capped, and if no courier can be quoted the flat fee applies. Needs a preview server (tools/preview.sh).
const { spawn } = require('child_process'); const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const DB = 'http://localhost:54321';
(async () => {
  const mock = spawn('node', [path.join(__dirname, 'mock-supabase.js')], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));
  const b = await chromium.launch(); let fails = 0; const errs = [];
  const ok = (l, c, extra) => { console.log(l, c ? 'ok' : 'FAIL' + (extra ? ' (' + extra + ')' : '')); if (!c) fails++; };
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  const CFG = "window.BT_CONFIG = { supabase: { url: '" + DB + "', anonKey: 'anon' } };";
  const tok = (await (await fetch(DB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'hello@budandthings.com', password: 'demo' }) })).json()).access_token;
  const setS = (o) => fetch(DB + '/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: 'anon', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(Object.entries(o).map(([key, value]) => ({ key, value }))) });
  // the stand-in shop starts empty: put the pieces that come with the page into its products table, 50 of each on the shelf
  const html = require('fs').readFileSync(path.join(__dirname, '..', 'prototype', 'index.html'), 'utf8');
  const pieces = html.split('\n').filter((l) => /^\s*\{"id": "bnt-prd-/.test(l)).map((l) => JSON.parse(l.trim().replace(/,$/, '')));
  const post = (table, rows) => fetch(DB + '/rest/v1/' + table, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: 'anon', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) });
  await post('products', pieces.map((x, i) => { const d = { ...x }; delete d.id; return { id: x.id, data: d, sort: i * 10, live: true }; }));
  await post('stock', pieces.flatMap((x) => (x.variants || []).map((v) => ({ sku: v.sku, qty: 50 }))));
  const orders = async () => (await (await fetch(DB + '/rest/v1/orders?select=*', { headers: { Authorization: 'Bearer ' + tok, apikey: 'anon' } })).json());
  const num = (s) => +String(s).replace(/\(.*?\)/g, '').replace(/[^\d.]/g, '');
  const base = { comingSoon: false, codOn: true, codFee: 0, pickupPin: '201318', shipFee: 99, freeOver: 100000, shipAuto: false, mockRate: 94, mockNoCourier: 0, shipRound: 10, shipBuffer: 0, shipMin: 0, shipMax: 0, autoBook: false };
  const row = async (p, label) => (await p.locator('.totals > div', { hasText: label }).first().innerText()).replace(/\s+/g, ' ');
  // one customer visit: add a piece, sign in, fill the steps, stop at the payment step and read the summary
  async function toPay(email, pin) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CFG }));
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); if (process.env.DBG) p.on('request', (r) => r.url().includes('/functions/') && console.log('REQ', r.url().split('/').pop(), r.postData()));
    await p.goto(url + '#p-bnt-prd-jt-001'); await p.waitForTimeout(1200); await p.click('[data-act="add"]'); await p.keyboard.press('Escape');
    await p.goto(url + '#checkout'); await p.waitForTimeout(500);
    await p.fill('#acct-email', email); await p.check('#acct-agree'); await p.click('form[data-form="acct-email"] button[type="submit"]'); await p.waitForTimeout(500);
    await p.fill('#acct-code', '111111'); await p.click('form[data-form="acct-code"] button[type="submit"]'); await p.waitForTimeout(800);
    await p.fill('#co-name', 'Meera Rao'); await p.fill('#co-phone', '9876543210'); await p.check('#co-agree'); await p.click('form[data-form="contact"] button[type="submit"]'); await p.waitForTimeout(300);
    await p.fill('#co-line1', '12 Lake View Road'); await p.fill('#co-pin', pin); await p.fill('#co-city', 'Kanpur'); await p.selectOption('#co-state', 'Uttar Pradesh');
    await p.waitForTimeout(900); // the price is asked for in the background as soon as the PIN is complete
    p.atAddress = { note: await p.locator('#ship-note').count() ? 'a note is on the page' : '', sum: await row(p, 'Shipping') };
    await p.click('form[data-form="address"] button[type="submit"]'); await p.waitForTimeout(600);
    return p;
  }
  try {
    // 1. live rates off: the flat fee
    await setS(base);
    let p = await toPay('a@example.com', '208024');
    let ship = await row(p, 'Shipping');
    ok('off: the flat fee of Rs 99 is charged', num(ship) === 99 && !/quickest/.test(ship), ship);
    ok('off: nothing is looked up when the PIN is typed', p.atAddress.note === '', p.atAddress.note);
    await p.close();

    // 2. live rates on: the quickest courier's price, rounded up to Rs 10 (94 becomes 100), and the order points at the quote
    await setS({ ...base, shipAuto: true });
    p = await toPay('b@example.com', '208024');
    ship = await row(p, 'Shipping');
    ok('on: the live fee (Rs 100) is shown with the quickest courier', num(ship.replace(/about \d+ days?/, '')) === 100 && /quickest courier, about 2 days/.test(ship), ship);
    ok('on: the price shows in the order summary as soon as the PIN is complete, before the payment step, and nowhere else on the page', /quickest courier, about 2 days/.test(p.atAddress.sum) && num(p.atAddress.sum) === 100 && p.atAddress.note === '', p.atAddress.note + ' | ' + p.atAddress.sum);
    ok('on: the payment step does not wait for it', !/Working it out/.test(ship));
    await p.click('[data-act="co-step"][data-v="address"]'); await p.waitForTimeout(300); await p.click('[data-act="co-step"][data-v="contact"]'); await p.waitForTimeout(500);
    ok('on: the price is already in the order summary on the first (Contact) step once a PIN is known', num(await row(p, 'Shipping')) === 100 && /Contact/.test(await p.locator('h1').first().innerText()), await row(p, 'Shipping'));
    await p.click('form[data-form="contact"] button[type="submit"]'); await p.waitForTimeout(400); await p.click('form[data-form="address"] button[type="submit"]'); await p.waitForTimeout(600);
    const sub = num(await p.locator('.totals > div', { hasText: 'Subtotal' }).first().innerText());
    ok('on: the total is the pieces plus the live fee', num(await p.locator('.checkout-side .grand').innerText()) === sub + 100);
    await p.click('[data-act="pay-method"][data-v="cod"]'); await p.waitForTimeout(200);
    await p.click('[data-act="pay-success"][data-via="Cash on delivery"]'); await p.waitForTimeout(1500);
    let o = (await orders()).find((x) => x.data.email === 'b@example.com');
    ok('on: the order keeps the fee, the courier and the weight band from the quote', o && o.data.ship === 100 && o.data.shipQuote && o.data.shipQuote.courier_id === 2 && o.data.shipKg === 0.5, JSON.stringify(o && o.data.shipQuote));
    await p.close();

    // 3. free over the limit
    await setS({ ...base, shipAuto: true, freeOver: 100 });
    p = await toPay('c@example.com', '208024');
    ship = await row(p, 'Shipping'); ok('free over the limit: shipping is free', /Free/.test(ship), ship); await p.close();

    // 4. a courier cannot be quoted: the flat fee, and the order still goes through
    await setS({ ...base, shipAuto: true, mockNoCourier: 1 });
    p = await toPay('e@example.com', '208024');
    ship = await row(p, 'Shipping'); ok('no courier quote: the flat fee applies', num(ship) === 99 && !/quickest/.test(ship), ship);
    await p.click('[data-act="pay-method"][data-v="cod"]'); await p.waitForTimeout(200); await p.click('[data-act="pay-success"][data-via="Cash on delivery"]'); await p.waitForTimeout(1500);
    o = (await orders()).find((x) => x.data.email === 'e@example.com'); ok('no courier quote: the order goes through with Rs 99 and no quote', o && o.data.ship === 99 && !o.data.shipQuote); await p.close();

    // 5. the owner's switches are in Settings
    await setS(base);
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CFG }));
    const o2 = await ctx.newPage(); o2.on('pageerror', (e) => errs.push(e.message));
    await o2.goto(url + '#admin'); await o2.waitForTimeout(1200);
    await o2.fill('#own-email', 'hello@budandthings.com'); await o2.fill('#own-pass', 'demo'); await o2.click('form[data-form="owner-signin"] button[type=submit]'); await o2.waitForTimeout(1800);
    await o2.click('[data-act="adm-tab"][data-v="settings"]'); await o2.waitForTimeout(500);
    for (const k of ['shipAuto', 'autoBook']) ok('owner Settings has the ' + k + ' switch', await o2.locator('input[data-act="adm-set"][data-k="' + k + '"]').count() === 1);
    for (const k of ['shipRound', 'shipBuffer', 'shipMin', 'shipMax', 'pieceG', 'packG']) ok('owner Settings has the ' + k + ' box', await o2.locator('[data-k="' + k + '"]').count() === 1);
    ok('no page errors', errs.length === 0, errs.join(' | '));
  } finally { await b.close(); mock.kill(); }
  if (fails) process.exit(1); console.log('Shipping checks passed.');
})();
