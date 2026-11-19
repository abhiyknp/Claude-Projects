// Owner-view backup: one click downloads every table as one file, and orders as a spreadsheet. Runs against the stand-in
// database (tools/mock-supabase.js), places one order as a customer first, and checks what the downloads hold.
// Needs a preview server (tools/preview.sh).
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const mock = spawn('node', [path.join(__dirname, 'mock-supabase.js')], { env: Object.assign({}, process.env, { TWO_STEP: '1' }), stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));
  const b = await chromium.launch(); let fails = 0; const errs = [];
  const ok = (l, c) => { console.log(l, c ? 'ok' : 'FAIL'); if (!c) fails++; };
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  const CFG = "window.BT_CONFIG = { ownerTwoStep: true, supabase: { url: 'http://localhost:54321', anonKey: 'anon' } };";
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CFG }));
    const o = await ctx.newPage(); o.on('pageerror', (e) => errs.push(e.message));
    await o.goto(url + '#admin'); await o.waitForTimeout(1200);
    await o.fill('#own-email', 'hello@budandthings.com'); await o.fill('#own-pass', 'demo'); await o.click('form[data-form="owner-signin"] button[type=submit]'); await o.waitForTimeout(1200);
    await o.fill('#own-code', '123456'); await o.click('form[data-form="owner-code"] button[type=submit]'); await o.waitForTimeout(1800);
    ok('start screen offers a backup', await o.locator('[data-act="adm-backup"]').count() === 1);
    ok('says no backup yet', /No backup downloaded/.test(await o.locator('.adm-body').innerText()));
    const [d1] = await Promise.all([o.waitForEvent('download'), o.click('[data-act="adm-backup"]')]);
    const f1 = await d1.path(); const j = JSON.parse(fs.readFileSync(f1, 'utf8'));
    ok('full backup is named by date', /^bt-backup-\d{4}-\d{2}-\d{2}\.json$/.test(d1.suggestedFilename()));
    ok('full backup holds the tables', ['orders', 'products', 'settings', 'stock', 'invoices', 'coupons'].every((k) => Array.isArray(j.tables[k])));
    ok('full backup carries the privacy note', /private/i.test(j.note));
    await o.waitForTimeout(500);
    ok('start screen now says the backup was today', /Last backup from this device: today/.test(await o.locator('.adm-body').innerText()));
    const [d2] = await Promise.all([o.waitForEvent('download'), o.click('[data-act="adm-backup-csv"]')]);
    const csv = fs.readFileSync(await d2.path(), 'utf8');
    ok('orders spreadsheet has the header', /^﻿Order,Placed,Status,Name,Phone,Email,Items/.test(csv));
    ok('no page errors', errs.length === 0);
  } finally { await b.close(); mock.kill(); }
  if (fails) process.exit(1); console.log('Backup checks passed.');
})();
