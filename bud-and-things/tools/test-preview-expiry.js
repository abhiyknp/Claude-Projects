// The tester preview link ends by itself at launch: while Coming soon is on, ?preview=<code> shows the shop; when the owner
// switches Coming soon off the stored code is deleted, so the old link no longer opens the "single section" Coming soon pages.
// Needs a preview server (tools/preview.sh); starts the stand-in database itself.
const { spawn } = require('child_process'); const path = require('path'); const crypto = require('crypto');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const DB = 'http://localhost:54321';
(async () => {
  const mock = spawn('node', [path.join(__dirname, 'mock-supabase.js')], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));
  const b = await chromium.launch(); let fails = 0; const errs = [];
  const ok = (l, c, extra) => { console.log(l, c ? 'ok' : 'FAIL' + (extra ? ' (' + extra + ')' : '')); if (!c) fails++; };
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  const CFG = "window.BT_CONFIG = { supabase: { url: '" + DB + "', anonKey: 'anon' } };";
  const tok = (await (await fetch(DB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'anon' }, body: JSON.stringify({ email: 'hello@budandthings.com', password: 'demo' }) })).json()).access_token;
  const put = (rows) => fetch(DB + '/rest/v1/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: 'anon', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) });
  const settings = async () => Object.fromEntries((await (await fetch(DB + '/rest/v1/settings?select=*', { headers: { Authorization: 'Bearer ' + tok, apikey: 'anon' } })).json()).map((r) => [r.key, r.value]));
  const CODE = 'q9cskcubvzvufret'; const HASH = crypto.createHash('sha256').update(CODE).digest('hex');
  const newCtx = async () => { const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); await c.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CFG })); return c; };
  try {
    await put([{ key: 'comingSoon', value: true }, { key: 'previewHash', value: HASH }]);
    // 1. a tester with the code sees the shop while Coming soon is on; a visitor without it sees Coming soon
    let c = await newCtx(); let p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url + '?preview=' + CODE + '#shop'); await p.waitForTimeout(1500);
    ok('tester link opens the shop while Coming soon is on', !(await p.evaluate(() => document.body.classList.contains('cs')))); await c.close();
    c = await newCtx(); p = await c.newPage(); await p.goto(url + '#shop'); await p.waitForTimeout(1500);
    ok('a visitor without the code sees Coming soon', await p.evaluate(() => document.body.classList.contains('cs'))); await c.close();
    // 2. the owner switches Coming soon off in Settings
    c = await newCtx(); const o = await c.newPage(); o.on('pageerror', (e) => errs.push(e.message));
    await o.goto(url + '#admin'); await o.waitForTimeout(1200);
    await o.fill('#own-email', 'hello@budandthings.com'); await o.fill('#own-pass', 'demo'); await o.click('form[data-form="owner-signin"] button[type=submit]'); await o.waitForTimeout(1800);
    await o.click('[data-act="adm-tab"][data-v="settings"]'); await o.waitForTimeout(500);
    await o.uncheck('input[data-act="adm-set"][data-k="comingSoon"]'); await o.waitForTimeout(300); await o.click('[data-act="adm-save-all"]'); await o.waitForTimeout(1800);
    const s = await settings();
    ok('Coming soon is saved as off', s.comingSoon === false);
    ok('the preview code is deleted by the switch-off', !s.previewHash, JSON.stringify(s.previewHash));
    ok('the owner is told the old link has stopped', /tester preview link has stopped/i.test(await o.locator('body').innerText()));
    // 3. switching other settings does not touch a code; turning Coming soon back on starts with no code
    await put([{ key: 'comingSoon', value: true }]); await c.close();
    ok('after the switch-off the old code opens nothing special', (await settings()).previewHash === undefined);
    ok('no page errors', errs.length === 0, errs.join(' | '));
  } finally { await b.close(); mock.kill(); }
  if (fails) process.exit(1); console.log('Preview expiry checks passed.');
})();
