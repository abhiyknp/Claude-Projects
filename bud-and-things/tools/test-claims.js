// No burn time anywhere until the testing team has real burn tests: not on candle pages (no "to be confirmed" line
// either) and not promised in the FAQ. Needs tools/preview.sh running (BT_BASE to use another address).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const ok = (label, cond) => { console.log(label, cond ? 'ok' : 'FAIL'); if (!cond) fails.push(label); };
(async () => {
  const b = await chromium.launch(); const base = process.env.BT_BASE || 'http://localhost:8765/page.html';
  const text = async (hash) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    await p.addInitScript(() => { try { localStorage.setItem('bt-consent', 'no'); } catch (e) {} });
    await p.goto(base + hash); await p.waitForTimeout(1200);
    for (const d of await p.locator('details').all()) { try { await d.evaluate((e) => { e.open = true; }); } catch (e) {} }
    const t = await p.evaluate(() => document.body.innerText); await ctx.close(); return t;
  };
  for (const h of ['#p-bnt-prd-tl-001', '#p-bnt-prd-cg-001', '#p-bnt-prd-mc-001', '#help', '#shop']) {
    const t = await text(h); ok(h + ': page has content', t.length > 300); ok(h + ': no burn time', !/burn time/i.test(t));
  }
  await b.close();
  if (fails.length) { console.log('FAILED:', fails.join(' | ')); process.exit(1); }
  console.log('Claim checks passed.');
})();
