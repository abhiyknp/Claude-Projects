// The full registered address (setting bizAddress) is for invoices and bills only. No public page may show it;
// the website shows the area only (setting siteAddress). Needs tools/preview.sh running.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const ok = (label, cond) => { console.log(label, cond ? 'ok' : 'FAIL'); if (!cond) fails.push(label); };
const SET = { bizName: 'Test Maker', bizAddress: 'Flat 9 Private Tower', siteAddress: 'Public Area 201318', email: 'a@b.test', grievanceName: 'Test Officer', grievancePhone: '9000000001', courtCity: 'Testville', policyDate: '5 May 2030' };
(async () => {
  const b = await chromium.launch(); const base = process.env.BT_BASE || 'http://localhost:8765/page.html';
  const visit = async (hash) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    await p.addInitScript((cfg) => { try { localStorage.setItem('bt-proto-v2', JSON.stringify({ db: { settings: cfg } })); localStorage.setItem('bt-consent', 'no'); } catch (e) {} }, SET);
    await p.goto(base + hash); await p.waitForTimeout(1200);
    try { await p.locator('text=Pack details').first().click({ timeout: 1000 }); await p.waitForTimeout(300); } catch (e) {}
    const html = await p.content(); await ctx.close(); return { html, errs };
  };
  for (const h of ['', '#shop', '#help', '#privacy', '#terms', '#shipping', '#refunds', '#story', '#gifting', '#p-bnt-prd-tl-001']) {
    const v = await visit(h);
    ok((h || 'home') + ': no full address', !/Private Tower/.test(v.html));
    ok((h || 'home') + ': no page errors', v.errs.length === 0);
  }
  const help = await visit('#help'); ok('#help: shows the area', /Public Area 201318/.test(help.html));
  await b.close();
  if (fails.length) { console.log('FAILED:', fails.join(' | ')); process.exit(1); }
  console.log('Address checks passed.');
})();
